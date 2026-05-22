from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.ai_generation_log import AiGenerationLog
from app.models.song import Song
from app.models.user import User
from app.schemas.ai import AiChordsIn, AiSongResult, AiSongwritingIn
from app.schemas.common import ApiResponse
from app.services.ai_service import ai_service

router = APIRouter(prefix='/ai', tags=['ai'])


def _save_ai_song(db: Session, user: User, result: AiSongResult, generation_type: str, input_text: str, input_params: dict) -> AiSongResult:
    if user.generation_quota <= 0:
        raise HTTPException(status_code=403, detail='generation quota is not enough')

    content_json = {
        'title': result.title,
        'style': result.style,
        'key': result.key,
        'bpm': result.bpm,
        'capo': result.capo,
        'difficulty': result.difficulty,
        'strumming': result.strumming,
        'chords': result.chords,
        'sections': [section.model_dump() for section in result.sections],
        'practiceTips': result.practiceTips,
    }
    song = Song(
        user_id=user.id,
        title=result.title,
        style=result.style,
        song_key=result.key,
        bpm=result.bpm,
        capo=result.capo,
        difficulty=result.difficulty,
        strumming=result.strumming,
        chords_json=result.chords,
        content_json=content_json,
        source_type='ai',
        is_public=False,
        audit_status='pending',
    )
    db.add(song)
    db.flush()

    log = AiGenerationLog(
        user_id=user.id,
        song_id=song.id,
        generation_type=generation_type,
        input_text=input_text,
        input_params=input_params,
        output_json=content_json,
        model_name='mock',
        prompt_version='v1',
        status='success',
    )
    db.add(log)

    user.generation_quota -= 1
    user.total_generated += 1
    db.commit()
    db.refresh(song)

    result.songId = song.id
    return result


@router.post('/songwriting', response_model=ApiResponse[AiSongResult])
def songwriting(payload: AiSongwritingIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    result = ai_service.generate_songwriting(payload)
    saved = _save_ai_song(
        db=db,
        user=user,
        result=result,
        generation_type='songwriting',
        input_text=payload.prompt,
        input_params=payload.model_dump(),
    )
    return ApiResponse(data=saved)


@router.post('/chords', response_model=ApiResponse[AiSongResult])
def generate_chords(payload: AiChordsIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    result = ai_service.generate_chords(payload)
    saved = _save_ai_song(
        db=db,
        user=user,
        result=result,
        generation_type='chords',
        input_text=payload.lyrics,
        input_params=payload.model_dump(),
    )
    return ApiResponse(data=saved)
