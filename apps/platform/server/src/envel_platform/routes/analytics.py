from fastapi import APIRouter, Depends, Query

from envel_platform.auth import require_user
from envel_platform.db import get_daily_expenses

router = APIRouter()


@router.get("/daily-expenses")
async def daily_expenses(
    username: str = Depends(require_user),
    days: int = Query(default=30, ge=7, le=365),
):
    return get_daily_expenses(username, days=days)
