from datetime import datetime
from pydantic import BaseModel

class CommentCreateIn(BaseModel):
    song_id:int
    content:str
    parent_id:int|None=None

class CommentOut(BaseModel):
    id:int
    user_id:int
    song_id:int
    parent_id:int|None=None
    content:str
    like_count:int
    created_at:datetime
    model_config={'from_attributes':True}
