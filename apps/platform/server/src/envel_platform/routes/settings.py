from fastapi import APIRouter, Depends
from pydantic import BaseModel

from envel_platform.auth import require_user
from envel_platform.db import get_morning_briefing, update_morning_briefing

router = APIRouter()


class MorningBriefingUpdate(BaseModel):
    enabled: bool | None = None
    prompt: str | None = None
    clear_prompt: bool = False


@router.get("/morning-briefing")
async def read_morning_briefing(username: str = Depends(require_user)):
    return get_morning_briefing(username)


@router.put("/morning-briefing")
async def write_morning_briefing(
    body: MorningBriefingUpdate,
    username: str = Depends(require_user),
):
    return update_morning_briefing(
        username,
        enabled=body.enabled,
        prompt=body.prompt,
        clear_prompt=body.clear_prompt,
    )
