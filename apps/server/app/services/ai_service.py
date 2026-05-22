from app.schemas.ai import AiChordsIn, AiSongResult, AiSongwritingIn
from app.schemas.song import SongLine, SongSection


class AiService:
    """AI generation service.

    MVP uses a mock provider so the API can run without external AI keys.
    Replace this service with real model calls when API keys are ready.
    """

    def generate_songwriting(self, payload: AiSongwritingIn) -> AiSongResult:
        title = '夏天没说完的话'
        style = payload.style or '校园民谣'
        difficulty = payload.difficulty or '新手'

        return AiSongResult(
            title=title,
            style=style,
            key='C',
            bpm=86,
            capo='2品',
            difficulty=difficulty,
            strumming='↓ ↓↑ ↑↓↑',
            chords=['C', 'G', 'Am', 'F', 'Em'],
            sections=[
                SongSection(
                    name='主歌',
                    lines=[
                        SongLine(chordLine='C              G', lyricLine='操场边的风吹过了盛夏'),
                        SongLine(chordLine='Am             F', lyricLine='你低头笑着没有回答'),
                    ],
                ),
                SongSection(
                    name='副歌',
                    lines=[
                        SongLine(chordLine='F              G', lyricLine='后来我们各自去了远方'),
                        SongLine(chordLine='Em             Am', lyricLine='只剩那把旧吉他还会响'),
                    ],
                ),
            ],
            practiceTips=['先慢速练习 C-G-Am-F 转换', '熟悉后加入完整扫弦节奏'],
        )

    def generate_chords(self, payload: AiChordsIn) -> AiSongResult:
        lines = [line.strip() for line in payload.lyrics.splitlines() if line.strip()]
        chord_cycle = ['C              G', 'Am             F', 'F              G', 'Em             Am']
        song_lines = [SongLine(chordLine=chord_cycle[i % len(chord_cycle)], lyricLine=line) for i, line in enumerate(lines)]

        return AiSongResult(
            title='AI 配和弦作品',
            style='流行弹唱',
            key='C',
            bpm=82,
            capo='0品',
            difficulty=payload.difficulty or '新手',
            strumming='↓ ↓↑ ↑↓↑',
            chords=['C', 'G', 'Am', 'F', 'Em'],
            sections=[SongSection(name='歌词配和弦', lines=song_lines)],
            practiceTips=['先按每句一个小节练习', '确认换和弦顺畅后再加入扫弦'],
        )


ai_service = AiService()
