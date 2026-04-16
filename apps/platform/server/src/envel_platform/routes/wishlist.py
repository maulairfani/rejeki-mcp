from fastapi import APIRouter, Depends, Query

from envel_platform.auth import require_user
from envel_platform.db import get_wishlist

router = APIRouter()


@router.get("")
async def wishlist(
    username: str = Depends(require_user),
    status: str = Query(default=None),
):
    items = get_wishlist(username, status=status)
    total_wanted = sum(
        i["price"] or 0 for i in items if i["status"] == "wanted"
    )
    wanted_count = sum(1 for i in items if i["status"] == "wanted")
    bought_count = sum(1 for i in items if i["status"] == "bought")
    return {
        "items": items,
        "totalWanted": total_wanted,
        "wantedCount": wanted_count,
        "boughtCount": bought_count,
    }
