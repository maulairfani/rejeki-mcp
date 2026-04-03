import contextlib
import json
import os
from datetime import datetime

import httpx
from dotenv import load_dotenv
from mcp.server.auth.provider import AccessToken, TokenVerifier
from mcp.server.auth.settings import AuthSettings
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings
from pydantic import AnyHttpUrl
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import PlainTextResponse
from starlette.routing import Mount, Route

from rejeki.database import Database
from rejeki.deps import _db_path, get_user_db
from rejeki.tools import accounts, analytics, envelopes, scheduled, transactions

load_dotenv()

# ─── CONFIG ──────────────────────────────────────────────────────────────────

AS_BASE_URL   = os.environ.get("AS_BASE_URL",    "https://maulairfani.my.id/rejeki/auth")
MCP_BASE_URL  = os.environ.get("MCP_BASE_URL",   "https://maulairfani.my.id/rejeki/mcp")
INTROSPECT_URL = os.environ.get("INTROSPECT_URL", "http://127.0.0.1:9004/introspect")

_ALLOWED_HOSTS = os.environ.get(
    "MCP_ALLOWED_HOSTS",
    "maulairfani.my.id,localhost:*,127.0.0.1:*,[::1]:*",
).split(",")


# ─── TOKEN VERIFIER ──────────────────────────────────────────────────────────

class RejekiTokenVerifier(TokenVerifier):
    """Validates OAuth tokens via introspection and injects per-user db_path."""

    async def verify_token(self, token: str) -> AccessToken | None:
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                resp = await client.post(
                    INTROSPECT_URL,
                    data={"token": token},
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
            except Exception:
                return None

        if resp.status_code != 200:
            return None

        data = resp.json()
        if not data.get("active"):
            return None

        db = data.get("db", os.path.expanduser("~/rejeki.db"))
        _db_path.set(db)

        return AccessToken(
            token=token,
            client_id=data.get("username", data.get("client_id", "unknown")),
            scopes=data.get("scope", "").split(),
            expires_at=data.get("exp"),
        )


class TestTokenVerifier(TokenVerifier):
    """Static single-token verifier for local development / evaluation."""

    def __init__(self, token: str):
        self._token = token

    async def verify_token(self, token: str) -> AccessToken | None:
        if token != self._token:
            return None
        # _db_path falls back to TEST_DB env var in get_user_db()
        return AccessToken(
            token=token,
            client_id="test-user-eval-001",
            scopes=["rejeki"],
        )


# ─── MCP SERVER ──────────────────────────────────────────────────────────────

_test_token = os.environ.get("TEST_TOKEN")
if _test_token:
    _token_verifier: TokenVerifier = TestTokenVerifier(_test_token)
else:
    _token_verifier = RejekiTokenVerifier()

mcp = FastMCP(
    "rejeki",
    stateless_http=True,
    json_response=True,
    streamable_http_path="/",
    token_verifier=_token_verifier,
    auth=AuthSettings(
        issuer_url=AnyHttpUrl(AS_BASE_URL),
        resource_server_url=AnyHttpUrl(MCP_BASE_URL),
        required_scopes=["rejeki"],
    ),
    transport_security=TransportSecuritySettings(
        enable_dns_rebinding_protection=True,
        allowed_hosts=_ALLOWED_HOSTS,
        allowed_origins=[
            "https://maulairfani.my.id",
            "http://localhost:*",
            "http://127.0.0.1:*",
        ],
    ),
    instructions=(
        "Aplikasi personal envelope-budgeting. "
        "Melacak rekening, kategori envelope, transaksi, dan aset. "
        "Format tanggal: YYYY-MM-DD. Nominal dalam IDR. "
        "Resources (finance://) untuk membaca data. "
        "Tools untuk aksi: tambah, edit, hapus, assign, approve. "
        "Prompts tersedia untuk workflow: budget_review, monthly_planning, onboarding_guide."
    ),
)


# ---------------------------------------------------------------------------
# Accounts
# ---------------------------------------------------------------------------

@mcp.tool()
def finance_add_account(name: str, type: str, initial_balance: float = 0) -> dict:
    """Tambah rekening baru. type: bank | ewallet | cash"""
    with get_user_db() as db:
        return accounts.add_account(db, name, type, initial_balance)


@mcp.resource("finance://accounts")
def resource_accounts() -> str:
    """Semua rekening beserta saldo dan total keseluruhan."""
    with get_user_db() as db:
        return json.dumps(accounts.get_accounts(db))


@mcp.tool()
def finance_edit_account(id: int, name: str | None = None, type: str | None = None) -> dict:
    """Edit nama atau tipe rekening."""
    with get_user_db() as db:
        return accounts.edit_account(db, id, name, type)


@mcp.tool()
def finance_update_balance(id: int, balance: float) -> dict:
    """Set saldo rekening langsung (rekonsiliasi manual)."""
    with get_user_db() as db:
        return accounts.update_balance(db, id, balance)


@mcp.tool()
def finance_delete_account(id: int) -> dict:
    """Hapus rekening."""
    with get_user_db() as db:
        return accounts.delete_account(db, id)


# ---------------------------------------------------------------------------
# Envelope groups
# ---------------------------------------------------------------------------

@mcp.resource("finance://groups")
def resource_groups() -> str:
    """Semua kelompok envelope."""
    with get_user_db() as db:
        return json.dumps(envelopes.get_groups(db))


@mcp.tool()
def finance_add_group(name: str, sort_order: int = 0) -> dict:
    """Tambah kelompok envelope baru."""
    with get_user_db() as db:
        return envelopes.add_group(db, name, sort_order)


# ---------------------------------------------------------------------------
# Envelopes — CRUD + budget view
# ---------------------------------------------------------------------------

@mcp.resource("finance://envelopes/{period}")
def resource_envelopes(period: str) -> str:
    """
    Semua envelope untuk period tertentu.
    Income sources + expense envelopes per kelompok: carryover, assigned, activity, available, target.
    Gunakan 'current' untuk bulan ini, atau format YYYY-MM untuk bulan spesifik.
    """
    with get_user_db() as db:
        return json.dumps(envelopes.get_envelopes(db, None if period == "current" else period))


@mcp.tool()
def finance_add_envelope(name: str, type: str, icon: str | None = None, group_id: int | None = None) -> dict:
    """
    Tambah envelope baru. type: income | expense.
    group_id untuk expense (opsional — tanpa group masuk kelompok 'Lainnya').
    """
    with get_user_db() as db:
        return envelopes.add_envelope(db, name, type, icon, group_id)


@mcp.tool()
def finance_edit_envelope(
    id: int,
    name: str | None = None,
    icon: str | None = None,
    group_id: int | None = None,
) -> dict:
    """Edit envelope. Isi hanya field yang mau diubah."""
    with get_user_db() as db:
        return envelopes.edit_envelope(db, id, name, icon, group_id)


@mcp.tool()
def finance_delete_envelope(id: int) -> dict:
    """Hapus envelope beserta semua data budgetnya."""
    with get_user_db() as db:
        return envelopes.delete_envelope(db, id)


@mcp.tool()
def finance_set_target(
    envelope_id: int,
    target_type: str,
    target_amount: float | None = None,
    target_deadline: str | None = None,
) -> dict:
    """
    Set funding target pada envelope expense.
    target_type: 'monthly' — assign X setiap bulan.
                 'goal'    — kumpulkan X sampai deadline.
    target_deadline format YYYY-MM-DD, hanya untuk goal.
    """
    with get_user_db() as db:
        return envelopes.set_target(db, envelope_id, target_type, target_amount, target_deadline)


@mcp.tool()
def finance_assign_to_envelope(envelope_id: int, amount: float, period: str | None = None) -> dict:
    """
    Assign uang dari Ready to Assign ke envelope.
    Ini operasi inti Rejeki: 'give every rupiah a job'.
    Memanggil ini lagi pada period yang sama akan menimpa assigned sebelumnya.
    period format YYYY-MM (default bulan ini).
    """
    with get_user_db() as db:
        return envelopes.assign_to_envelope(db, envelope_id, amount, period)


@mcp.tool()
def finance_move_money(
    from_envelope_id: int,
    to_envelope_id: int,
    amount: float,
    period: str | None = None,
) -> dict:
    """
    Pindahkan uang antar envelope dalam satu period.
    Dipakai saat overspend di satu envelope dan perlu ditutup dari envelope lain.
    period format YYYY-MM (default bulan ini).
    """
    with get_user_db() as db:
        return envelopes.move_money(db, from_envelope_id, to_envelope_id, amount, period)


# ---------------------------------------------------------------------------
# Transactions
# ---------------------------------------------------------------------------

@mcp.tool()
def finance_add_transaction(
    amount: float,
    type: str,
    account_id: int,
    envelope_id: int | None = None,
    to_account_id: int | None = None,
    payee: str | None = None,
    memo: str | None = None,
    transaction_date: str | None = None,
) -> dict:
    """
    Catat transaksi baru.
    type: income | expense | transfer.
    transaction_date format YYYY-MM-DD (default hari ini).
    """
    with get_user_db() as db:
        return transactions.add_transaction(
            db, amount, type, account_id, envelope_id, to_account_id, payee, memo, transaction_date
        )


@mcp.tool()
def finance_get_transactions(
    account_id: int | None = None,
    envelope_id: int | None = None,
    type: str | None = None,
    payee: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = 50,
) -> list:
    """
    Query transaksi. Semua filter opsional dan bisa dikombinasikan.
    payee: partial match (misal 'Grab' cocok dengan 'GrabFood').
    """
    with get_user_db() as db:
        return transactions.get_transactions(db, account_id, envelope_id, type, payee, date_from, date_to, limit)


@mcp.tool()
def finance_edit_transaction(
    id: int,
    amount: float | None = None,
    type: str | None = None,
    account_id: int | None = None,
    envelope_id: int | None = None,
    to_account_id: int | None = None,
    payee: str | None = None,
    memo: str | None = None,
    transaction_date: str | None = None,
) -> dict:
    """Edit transaksi yang sudah ada. Isi hanya field yang mau diubah."""
    with get_user_db() as db:
        return transactions.edit_transaction(
            db, id, amount, type, account_id, envelope_id, to_account_id, payee, memo, transaction_date
        )


@mcp.tool()
def finance_delete_transaction(id: int) -> dict:
    """Hapus transaksi dan balikkan efeknya ke saldo rekening."""
    with get_user_db() as db:
        return transactions.delete_transaction(db, id)


# ---------------------------------------------------------------------------
# Scheduled transactions
# ---------------------------------------------------------------------------

@mcp.tool()
def finance_add_scheduled_transaction(
    amount: float,
    type: str,
    account_id: int,
    scheduled_date: str,
    envelope_id: int | None = None,
    to_account_id: int | None = None,
    payee: str | None = None,
    memo: str | None = None,
    recurrence: str = "once",
) -> dict:
    """
    Jadwalkan transaksi di masa depan.
    recurrence: once | weekly | monthly | yearly.
    scheduled_date format YYYY-MM-DD.
    """
    with get_user_db() as db:
        return scheduled.add_scheduled_transaction(
            db, amount, type, account_id, scheduled_date, envelope_id, to_account_id, payee, memo, recurrence
        )


@mcp.resource("finance://scheduled-transactions")
def resource_scheduled_transactions() -> str:
    """Transaksi terjadwal yang aktif, termasuk field days_until (berapa hari lagi)."""
    with get_user_db() as db:
        return json.dumps(scheduled.get_scheduled_transactions(db, include_inactive=False))


@mcp.tool()
def finance_approve_scheduled_transaction(id: int) -> dict:
    """
    Eksekusi scheduled transaction sebagai transaksi nyata.
    Jika recurring, otomatis jadwalkan ke occurrence berikutnya.
    """
    with get_user_db() as db:
        return scheduled.approve_scheduled_transaction(db, id)


@mcp.tool()
def finance_skip_scheduled_transaction(id: int) -> dict:
    """
    Lewati occurrence ini tanpa mencatat transaksi.
    Jika recurring, maju ke occurrence berikutnya.
    """
    with get_user_db() as db:
        return scheduled.skip_scheduled_transaction(db, id)


@mcp.tool()
def finance_delete_scheduled_transaction(id: int) -> dict:
    """Hapus scheduled transaction sepenuhnya."""
    with get_user_db() as db:
        return scheduled.delete_scheduled_transaction(db, id)


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

@mcp.resource("finance://onboarding-status")
def resource_onboarding_status() -> str:
    """Status onboarding: rekening, targets, envelope assignment, RTA. Baca di awal sesi baru."""
    with get_user_db() as db:
        return json.dumps(analytics.get_onboarding_status(db))


@mcp.resource("finance://ready-to-assign/{period}")
def resource_ready_to_assign(period: str) -> str:
    """
    Ready to Assign = total saldo rekening − total available semua envelope.
    Target: nol. Gunakan 'current' untuk bulan ini, atau YYYY-MM untuk bulan spesifik.
    """
    with get_user_db() as db:
        return json.dumps(analytics.get_ready_to_assign(db, None if period == "current" else period))


@mcp.resource("finance://age-of-money")
def resource_age_of_money() -> str:
    """Age of Money: rata-rata berapa hari uang duduk sebelum dipakai. Dihitung FIFO. Target: 30+ hari."""
    with get_user_db() as db:
        return json.dumps(analytics.get_age_of_money(db))


@mcp.resource("finance://summary/{period}")
def resource_summary(period: str) -> str:
    """Ringkasan bulanan: income, expense, net, breakdown per envelope. Gunakan 'current' atau YYYY-MM."""
    with get_user_db() as db:
        return json.dumps(analytics.get_summary(db, None if period == "current" else period))


@mcp.tool()
def finance_get_spending_trend(envelope_id: int | None = None, months: int = 3) -> list:
    """Tren pengeluaran per envelope, N bulan ke belakang."""
    with get_user_db() as db:
        return analytics.get_spending_trend(db, envelope_id, months)


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

@mcp.prompt
def budget_review(period: str | None = None) -> str:
    """Review budget bulanan: analisis overspend dan saran rebalancing."""
    p = period or datetime.now().strftime("%Y-%m")
    return (
        f"Lakukan review budget bulan {p}:\n\n"
        f"1. Baca resource finance://summary/{p} untuk ringkasan income, expense, dan net.\n"
        f"2. Baca resource finance://envelopes/{p} untuk detail setiap envelope "
        f"(carryover, assigned, activity, available).\n"
        f"3. Identifikasi envelope yang overspend (available negatif).\n"
        f"4. Berikan ringkasan: envelope mana yang konsisten, mana yang perlu perhatian.\n"
        f"5. Jika ada RTA tersisa di finance://ready-to-assign/{p}, sarankan alokasi ke envelope yang kekurangan."
    )


@mcp.prompt
def monthly_planning(period: str | None = None) -> str:
    """Panduan distribusi budget awal bulan: cek RTA, lihat targets, assign hingga RTA = 0."""
    p = period or datetime.now().strftime("%Y-%m")
    return (
        f"Bantu planning budget bulan {p}:\n\n"
        f"1. Baca finance://ready-to-assign/{p} — lihat berapa uang yang belum dialokasikan.\n"
        f"2. Baca finance://envelopes/{p} — lihat target setiap envelope dan available saat ini.\n"
        f"3. Prioritaskan envelope dengan target 'monthly' yang belum terpenuhi.\n"
        f"4. Untuk envelope 'goal', cek apakah on track menuju deadline.\n"
        f"5. Distribusikan RTA ke envelope yang paling butuh hingga RTA = 0.\n"
        f"Gunakan finance_assign_to_envelope untuk setiap alokasi. Tanya user jika ada prioritas khusus."
    )


@mcp.prompt
def onboarding_guide() -> str:
    """Wizard setup Rejeki dari awal: rekening → envelope → budget."""
    return (
        "Bantu setup Rejeki dari awal:\n\n"
        "1. Baca finance://onboarding-status untuk melihat progress saat ini.\n"
        "2. Jika belum ada rekening: tambah dengan finance_add_account (type: bank | ewallet | cash).\n"
        "3. Buat kelompok envelope dengan finance_add_group (contoh: Kebutuhan, Keinginan, Tabungan).\n"
        "4. Buat envelope untuk setiap kategori dengan finance_add_envelope (type: income | expense).\n"
        "5. Set target dengan finance_set_target untuk envelope yang punya target bulanan atau goal.\n"
        "6. Assign budget ke setiap envelope dengan finance_assign_to_envelope hingga RTA = 0.\n\n"
        "Tanyakan user mau mulai dari step mana, atau ikuti step berikutnya yang belum selesai."
    )


# ---------------------------------------------------------------------------
# ASGI app
# ---------------------------------------------------------------------------

@contextlib.asynccontextmanager
async def lifespan(app):
    async with mcp.session_manager.run():
        yield


app = Starlette(
    lifespan=lifespan,
    routes=[
        Route("/health", lambda r: PlainTextResponse("ok")),
        Mount("/mcp", app=mcp.streamable_http_app()),
    ],
)


def main():
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(
        "rejeki.server:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        proxy_headers=True,
        forwarded_allow_ips="*",
    )


if __name__ == "__main__":
    main()
