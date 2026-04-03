import json
import os
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

auth_router = APIRouter()

_TEMPLATES = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))


class NotAuthenticated(Exception):
    pass


def require_user(request: Request) -> str:
    username = request.session.get("username")
    if not username:
        raise NotAuthenticated()
    return username


def _check_credentials(username: str, password: str) -> bool:
    users_file = os.environ.get("USERS_CONFIG")
    if not users_file:
        return False
    try:
        with open(users_file) as f:
            users = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return False
    user = users.get(username)
    return user is not None and user.get("password") == password


@auth_router.get("/login")
async def login_page(request: Request):
    return _TEMPLATES.TemplateResponse(request, "login.html", {"error": False})


@auth_router.post("/login")
async def login_submit(request: Request):
    form = await request.form()
    username = str(form.get("username", ""))
    password = str(form.get("password", ""))
    if _check_credentials(username, password):
        request.session["username"] = username
        return RedirectResponse(url="/", status_code=302)
    return _TEMPLATES.TemplateResponse(
        request, "login.html", {"error": True}, status_code=401
    )


@auth_router.get("/logout")
async def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url="/login", status_code=302)
