#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""谱灵 AI 小程序发布前自检脚本。

用法：
  python tools/preflight_release_check.py

脚本只读取文件，不修改项目。它用于在提交审核或真机测试前快速检查：
  - 关键云函数是否存在
  - 前端功能开关是否存在且审核敏感功能默认关闭
  - 微信麦克风权限说明是否配置
  - 社区/评论/外链等敏感开关是否关闭
  - 常见页面文件是否存在
"""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    "apps/miniprogram/src/pages/chat/index.vue",
    "apps/miniprogram/src/pages/community/index.vue",
    "apps/miniprogram/src/pages/mine/index.vue",
    "apps/miniprogram/src/pages/song-detail/index.vue",
    "apps/miniprogram/src/pages/practice/index.vue",
    "apps/miniprogram/src/config/features.ts",
    "apps/miniprogram/src/api/provider.ts",
    "apps/miniprogram/src/api/resourcePreview.ts",
    "apps/miniprogram/src/api/resourceTabImport.ts",
    "apps/miniprogram/src/utils/recent.ts",
]

REQUIRED_FUNCTIONS = [
    "web-search",
    "resource-preview",
    "resource-tab-import",
    "ai-generate",
    "songs",
]

EXPECTED_FEATURES = {
    "SHOW_COMMUNITY": False,
    "SHOW_COMMENTS": False,
    "SHOW_EXTERNAL_LINK": False,
    "SHOW_DEBUG_INFO": False,
    "ENABLE_TAB_SEARCH": True,
    "ENABLE_IMAGE_PREVIEW": True,
    "ENABLE_TEXT_IMPORT": True,
    "ENABLE_AI_GENERATE": True,
    "ENABLE_TUNER": True,
    "ENABLE_ORDERS": False,
    "ENABLE_NOTIFICATIONS": False,
}


@dataclass
class CheckResult:
    name: str
    ok: bool
    detail: str


def read_text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def file_exists(path: str) -> bool:
    return (ROOT / path).exists()


def check_required_files() -> list[CheckResult]:
    results: list[CheckResult] = []
    for item in REQUIRED_FILES:
        results.append(CheckResult(f"文件存在：{item}", file_exists(item), "OK" if file_exists(item) else "缺少文件"))
    return results


def check_cloud_functions() -> list[CheckResult]:
    results: list[CheckResult] = []
    for name in REQUIRED_FUNCTIONS:
        fn_dir = ROOT / "cloudbase" / "cloudfunctions" / name
        index_file = fn_dir / "index.js"
        package_file = fn_dir / "package.json"
        ok = fn_dir.exists() and index_file.exists()
        detail = "OK" if ok else f"缺少 {fn_dir} 或 index.js"
        if ok and not package_file.exists():
            detail = "缺少 package.json，可部署但建议补齐"
        results.append(CheckResult(f"云函数：{name}", ok, detail))
    return results


def parse_feature_value(content: str, key: str) -> bool | None:
    pattern = rf"\b{re.escape(key)}\s*:\s*(true|false)"
    match = re.search(pattern, content)
    if not match:
        return None
    return match.group(1) == "true"


def check_features() -> list[CheckResult]:
    path = "apps/miniprogram/src/config/features.ts"
    if not file_exists(path):
        return [CheckResult("功能开关", False, "缺少 features.ts")]

    content = read_text(path)
    results: list[CheckResult] = []
    for key, expected in EXPECTED_FEATURES.items():
        actual = parse_feature_value(content, key)
        ok = actual is expected
        if actual is None:
            results.append(CheckResult(f"功能开关：{key}", False, "未配置"))
        else:
            results.append(CheckResult(f"功能开关：{key}", ok, f"当前 {actual}，建议 {expected}" if not ok else "OK"))
    return results


def check_manifest() -> list[CheckResult]:
    path = "apps/miniprogram/src/manifest.json"
    if not file_exists(path):
        return [CheckResult("manifest.json", False, "缺少 manifest.json")]

    try:
        data = json.loads(read_text(path))
    except Exception as exc:  # noqa: BLE001
        return [CheckResult("manifest.json", False, f"JSON 解析失败：{exc}")]

    mp = data.get("mp-weixin", {})
    permission = mp.get("permission", {})
    record_desc = permission.get("scope.record", {}).get("desc", "")
    appid = mp.get("appid")
    return [
        CheckResult("微信 appid", bool(appid and appid != "__UNI__PULINGAI"), appid or "未配置"),
        CheckResult("麦克风权限说明", bool(record_desc), record_desc or "缺少 scope.record.desc"),
    ]


def check_sensitive_copy() -> list[CheckResult]:
    files_to_scan = [
        "apps/miniprogram/src/pages/chat/index.vue",
        "apps/miniprogram/src/components/home/WebSongSearchResultsCard.vue",
        "apps/miniprogram/src/components/home/WebSongSuggestionCard.vue",
        "apps/miniprogram/src/pages/mine/index.vue",
    ]
    banned_words = ["测试版", "debug", "DEBUG", "TODO", "FIXME", "暂未接入", "开发中"]
    results: list[CheckResult] = []
    for path in files_to_scan:
        if not file_exists(path):
            continue
        content = read_text(path)
        hits = [word for word in banned_words if word in content]
        results.append(CheckResult(f"正式文案扫描：{path}", not hits, "OK" if not hits else f"发现：{', '.join(hits)}"))
    return results


def print_report(results: list[CheckResult]) -> int:
    failed = [item for item in results if not item.ok]
    print("\n谱灵 AI 发布前自检")
    print("=" * 48)
    for item in results:
      icon = "✅" if item.ok else "❌"
      print(f"{icon} {item.name} - {item.detail}")
    print("=" * 48)
    if failed:
        print(f"发现 {len(failed)} 项需要处理。")
        return 1
    print("全部通过，可以继续构建、真机测试和提交审核。")
    return 0


def main() -> int:
    results: list[CheckResult] = []
    results.extend(check_required_files())
    results.extend(check_cloud_functions())
    results.extend(check_features())
    results.extend(check_manifest())
    results.extend(check_sensitive_copy())
    return print_report(results)


if __name__ == "__main__":
    sys.exit(main())
