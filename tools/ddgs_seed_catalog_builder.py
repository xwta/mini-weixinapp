#!/usr/bin/env python3
"""
Build a bulk song seed catalog with DuckDuckGo/ddgs.

This tool collects song/title/artist metadata and guitar-tab search references.
It does NOT download, copy, or store full lyrics or third-party guitar tabs.

Usage examples:
  pip install ddgs pypinyin
  python tools/ddgs_seed_catalog_builder.py --limit 10000 --out cloudbase/database/seed_bulk_catalog.jsonl
  python tools/ddgs_seed_catalog_builder.py --limit 1000 --country-weight cn --out tmp/seed.jsonl
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
import re
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable, Iterator, Optional
from urllib.parse import urlparse

try:
    from ddgs import DDGS
except Exception as exc:  # pragma: no cover
    raise SystemExit("Please install ddgs first: pip install ddgs") from exc

try:
    from pypinyin import lazy_pinyin, Style
except Exception:  # pragma: no cover
    lazy_pinyin = None
    Style = None

CN_ARTISTS = [
    "周杰伦", "五月天", "陈奕迅", "林俊杰", "薛之谦", "毛不易", "赵雷", "许巍", "朴树", "李荣浩",
    "Beyond", "张学友", "刘德华", "王菲", "孙燕姿", "田馥甄", "莫文蔚", "刘若英", "李健", "老狼",
    "宋冬野", "陈粒", "房东的猫", "张悬", "隔壁老樊", "汪峰", "任贤齐", "张震岳", "陶喆", "王力宏",
    "S.H.E", "张韶涵", "蔡健雅", "杨宗纬", "梁静茹", "许嵩", "汪苏泷", "邓紫棋", "华晨宇", "张杰",
    "伍佰", "齐秦", "罗大佑", "李宗盛", "陈绮贞", "苏打绿", "逃跑计划", "新裤子", "痛仰", "万能青年旅店",
    "海龟先生", "草东没有派对", "告五人", "deca joins", "落日飞车", "八三夭", "动力火车", "品冠", "光良", "阿桑",
]

GLOBAL_ARTISTS = [
    "Taylor Swift", "Ed Sheeran", "Adele", "Coldplay", "The Beatles", "Oasis", "Radiohead", "Bruno Mars",
    "Maroon 5", "John Mayer", "Jason Mraz", "Bob Dylan", "Eagles", "Queen", "Nirvana", "Green Day", "Linkin Park",
    "Imagine Dragons", "The Chainsmokers", "Justin Bieber", "Ariana Grande", "Billie Eilish", "Olivia Rodrigo",
]

HOT_CN_SEEDS = [
    ("晴天", "周杰伦"), ("七里香", "周杰伦"), ("稻香", "周杰伦"), ("告白气球", "周杰伦"),
    ("成都", "赵雷"), ("南方姑娘", "赵雷"), ("平凡之路", "朴树"), ("蓝莲花", "许巍"),
    ("曾经的你", "许巍"), ("突然好想你", "五月天"), ("夜空中最亮的星", "逃跑计划"), ("十年", "陈奕迅"),
    ("江南", "林俊杰"), ("演员", "薛之谦"), ("消愁", "毛不易"), ("董小姐", "宋冬野"),
    ("安和桥", "宋冬野"), ("贝加尔湖畔", "李健"), ("同桌的你", "老狼"), ("起风了", "买辣椒也用券"),
]

TAB_TERMS_CN = ["吉他谱", "和弦谱", "弹唱谱", "六线谱"]
TAB_TERMS_EN = ["chords", "guitar chords", "guitar tab", "tabs"]

TITLE_PATTERNS = [
    re.compile(r"(?P<title>[\u4e00-\u9fffA-Za-z0-9·'’\-\s]{1,60})\s*(?:吉他谱|和弦谱|弹唱谱|六线谱)", re.I),
    re.compile(r"(?P<title>[\u4e00-\u9fffA-Za-z0-9·'’\-\s]{1,60})\s*(?:chords|guitar tab|tabs)", re.I),
]

BAD_TITLE_WORDS = {
    "吉他谱", "和弦谱", "弹唱谱", "六线谱", "chords", "guitar tab", "tabs", "download", "免费", "教学", "简单版"
}

CHORD_RE = re.compile(r"\b[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus)?(?:2|4|5|6|7|9|11|13)?\b")


@dataclass
class SeedSong:
    title: str
    artist_name: str = ""
    aliases: list[str] | None = None
    pinyin: str = ""
    initials: str = ""
    tags: list[str] | None = None
    provider: str = "duckduckgo"
    references: list[dict] | None = None
    tabReferences: list[dict] | None = None
    arrangementHints: dict | None = None
    source_quality: str = "search_index"


def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip())


def clean_title(title: str) -> str:
    title = clean_text(title)
    title = re.sub(r"[《》【】\[\]（）()]", " ", title)
    title = re.sub(r"(吉他谱|和弦谱|弹唱谱|六线谱|chords|guitar tab|tabs|歌词|完整版|原版|简单版|教学).*", "", title, flags=re.I)
    title = clean_text(title.strip("-_|｜:：,，.。"))
    if len(title) > 60:
        title = title[:60].strip()
    return title


def infer_title_from_result(title: str, body: str, fallback: str = "") -> str:
    source = clean_text(f"{title} {body}")
    for pattern in TITLE_PATTERNS:
        match = pattern.search(source)
        if match:
            candidate = clean_title(match.group("title"))
            if candidate and candidate.lower() not in BAD_TITLE_WORDS:
                return candidate
    return clean_title(fallback or title)


def infer_artist(title: str, body: str, known_artist: str = "") -> str:
    if known_artist:
        return known_artist
    source = clean_text(f"{title} {body}")
    patterns = [
        r"歌手[:：]\s*([^\s，。|｜\-/]{2,20})",
        r"艺人[:：]\s*([^\s，。|｜\-/]{2,20})",
        r"演唱[:：]\s*([^\s，。|｜\-/]{2,20})",
        r"([^\s，。|｜\-/]{2,20})\s*[\-|｜]\s*[^\s]*(?:吉他谱|和弦谱|弹唱谱)",
    ]
    for pattern in patterns:
        match = re.search(pattern, source)
        if match:
            return clean_text(match.group(1))
    return ""


def pinyin_fields(title: str) -> tuple[str, str]:
    if not lazy_pinyin:
        return "", ""
    py = lazy_pinyin(title)
    initials = lazy_pinyin(title, style=Style.FIRST_LETTER) if Style else [item[:1] for item in py]
    return " ".join(py), "".join(initials)


def tab_score(title: str, body: str, query: str) -> int:
    text = f"{title} {body}".lower()
    score = 0
    if re.search(r"吉他谱|和弦谱|弹唱谱|六线谱", text):
        score += 50
    if re.search(r"chords|guitar chords|guitar tab|tabs", text):
        score += 35
    if re.search(r"变调夹|capo|c调|g调|原调|选调", text):
        score += 20
    if query and query.lower() in text:
        score += 20
    return score


def arrangement_hints(refs: list[dict]) -> dict:
    text = " ".join(f"{ref.get('title', '')} {ref.get('snippet', '')}" for ref in refs)
    keys = sorted(set(re.findall(r"(?:[A-G](?:#|b)?|[1-7])\s*(?:调|key)", text, re.I)))[:4]
    capos = sorted(set(f"变调夹{m}品" for m in re.findall(r"(?:变调夹|capo)\s*[:：]?\s*([0-9一二三四五六七八九十]+)\s*(?:品|fret)?", text, re.I)))[:4]
    chords = sorted(set(CHORD_RE.findall(text)))[:12]
    return {
        "possibleKeys": keys,
        "possibleCapos": capos,
        "possibleChords": chords,
        "tabReferenceCount": len(refs),
    }


def result_to_reference(item: dict, query: str) -> dict:
    title = clean_text(item.get("title") or item.get("heading") or "")
    url = item.get("href") or item.get("url") or ""
    snippet = clean_text(item.get("body") or item.get("snippet") or "")
    return {
        "title": title[:120],
        "url": url[:500],
        "snippet": snippet[:180],
        "provider": "duckduckgo",
        "category": "tab_reference",
        "tab_score": tab_score(title, snippet, query),
    }


def search_ddg(ddgs: DDGS, query: str, max_results: int, pause: float) -> list[dict]:
    time.sleep(pause)
    try:
        rows = list(ddgs.text(query, region="cn-zh", safesearch="moderate", max_results=max_results))
    except TypeError:
        rows = list(ddgs.text(query, max_results=max_results))
    except Exception as exc:
        print(json.dumps({"level": "warn", "query": query, "error": str(exc)}, ensure_ascii=False))
        return []
    return [result_to_reference(row, query) for row in rows]


def seed_queries(country_weight: str) -> Iterator[tuple[str, str]]:
    for title, artist in HOT_CN_SEEDS:
        yield title, artist

    cn_terms = [
        "热门中文歌 吉他谱", "华语流行 吉他谱", "中文民谣 吉他谱", "抖音热门歌曲 吉他谱", "KTV热门歌曲 吉他谱",
        "校园民谣 吉他谱", "经典老歌 吉他谱", "粤语经典 吉他谱", "华语摇滚 吉他谱", "新手吉他弹唱 歌曲",
    ]
    global_terms = [
        "popular songs guitar chords", "classic songs guitar chords", "easy guitar songs chords", "top pop songs guitar tab",
    ]

    artist_pool = CN_ARTISTS * (4 if country_weight == "cn" else 2) + GLOBAL_ARTISTS
    random.shuffle(artist_pool)
    for artist in artist_pool:
        yield f"{artist} 吉他谱", artist
        yield f"{artist} 和弦谱", artist
        yield f"{artist} 热门歌曲 吉他谱", artist

    for term in cn_terms * (5 if country_weight == "cn" else 2) + global_terms:
        yield term, ""


def make_song_from_refs(title: str, artist: str, refs: list[dict]) -> Optional[SeedSong]:
    if not title:
        return None
    title = clean_title(title)
    if not title or title.lower() in BAD_TITLE_WORDS or len(title) < 1:
        return None
    pinyin, initials = pinyin_fields(title)
    refs = sorted(refs, key=lambda item: item.get("tab_score", 0), reverse=True)[:8]
    return SeedSong(
        title=title,
        artist_name=artist,
        aliases=[f"{title}吉他谱", f"{title}弹唱", f"{title}和弦谱"],
        pinyin=pinyin,
        initials=initials,
        tags=["热门", "吉他谱线索", "AI可生成"],
        references=[],
        tabReferences=refs,
        arrangementHints=arrangement_hints(refs),
    )


def discover(limit: int, max_results: int, pause: float, country_weight: str) -> list[SeedSong]:
    songs: dict[str, SeedSong] = {}
    with DDGS() as ddgs:
        for query, known_artist in seed_queries(country_weight):
            if len(songs) >= limit:
                break
            refs = search_ddg(ddgs, query, max_results=max_results, pause=pause)
            for ref in refs:
                title = infer_title_from_result(ref["title"], ref["snippet"], fallback=query)
                artist = infer_artist(ref["title"], ref["snippet"], known_artist=known_artist if known_artist not in CN_ARTISTS + GLOBAL_ARTISTS else known_artist)
                song = make_song_from_refs(title, artist, [ref])
                if not song:
                    continue
                key = hashlib.sha1(f"{song.title}|{song.artist_name}".lower().encode("utf-8")).hexdigest()
                if key in songs:
                    merged = songs[key]
                    merged.tabReferences = (merged.tabReferences or []) + [ref]
                    merged.tabReferences = sorted(merged.tabReferences, key=lambda item: item.get("tab_score", 0), reverse=True)[:8]
                    merged.arrangementHints = arrangement_hints(merged.tabReferences)
                else:
                    songs[key] = song
                    if len(songs) % 100 == 0:
                        print(json.dumps({"progress": len(songs), "last": song.title}, ensure_ascii=False))
                if len(songs) >= limit:
                    break
    return list(songs.values())[:limit]


def write_jsonl(path: Path, songs: Iterable[SeedSong]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for song in songs:
            f.write(json.dumps(asdict(song), ensure_ascii=False) + "\n")


def write_json(path: Path, songs: Iterable[SeedSong]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = [asdict(song) for song in songs]
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=10000)
    parser.add_argument("--max-results", type=int, default=20)
    parser.add_argument("--pause", type=float, default=0.8, help="Pause between DDG requests")
    parser.add_argument("--country-weight", choices=["cn", "balanced"], default="cn")
    parser.add_argument("--out", type=Path, default=Path("cloudbase/database/seed_bulk_catalog.jsonl"))
    parser.add_argument("--format", choices=["jsonl", "json"], default="jsonl")
    args = parser.parse_args()

    songs = discover(args.limit, args.max_results, args.pause, args.country_weight)
    if args.format == "json":
      write_json(args.out, songs)
    else:
      write_jsonl(args.out, songs)
    print(json.dumps({"saved": len(songs), "out": str(args.out)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
