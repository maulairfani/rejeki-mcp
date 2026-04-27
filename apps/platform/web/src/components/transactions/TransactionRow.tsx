import { AmountText } from "@/components/shared/AmountText"
import type { Transaction } from "@/hooks/useTransactions"

const TYPE_FALLBACK: Record<string, string> = {
  expense: "💸",
  income: "💰",
  transfer: "↔️",
}

/**
 * Deterministic color per label using a small cycle of hues.
 * Picks from the chart palette so pills feel brand-consistent.
 */
const PILL_HUES = [145, 200, 270, 310, 50, 25, 175, 240]
function pillStyle(label: string): { background: string; color: string } {
  let h = 0
  for (const ch of label) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const hue = PILL_HUES[h % PILL_HUES.length]
  return {
    background: `oklch(70% 0.08 ${hue} / 0.2)`,
    color: `oklch(38% 0.14 ${hue})`,
  }
}

interface TransactionRowProps {
  transaction: Transaction
  showNominal: boolean
}

export function TransactionRow({ transaction, showNominal }: TransactionRowProps) {
  const icon =
    transaction.type !== "transfer" && transaction.envelopeIcon
      ? transaction.envelopeIcon
      : TYPE_FALLBACK[transaction.type]

  const payee =
    transaction.type === "transfer"
      ? `${transaction.account} → ${transaction.toAccount ?? "—"}`
      : transaction.payee ?? "—"

  const memo = transaction.memo ?? ""

  const envelope = transaction.type === "expense" ? transaction.envelope : null
  const account = transaction.type === "transfer" ? null : transaction.account

  const signed =
    transaction.type === "income"
      ? transaction.amount
      : transaction.type === "expense"
        ? -Math.abs(transaction.amount)
        : transaction.amount // transfer: neutral

  return (
    <div className="grid grid-cols-[28px_1fr_80px] gap-3 border-b border-border-muted px-7 py-2.5 transition-colors hover:bg-bg-muted md:grid-cols-[28px_1fr_1fr_100px_80px_90px]">
      {/* Icon */}
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-bg-muted text-[13px]">
        {icon}
      </div>

      {/* Payee (+ mobile subtitle with memo/envelope/account) */}
      <div className="min-w-0">
        <p
          className={`truncate text-[13.5px] font-medium ${
            payee === "—" ? "text-text-muted" : "text-text-primary"
          }`}
        >
          {payee}
        </p>
        <p className="truncate text-[11.5px] text-text-muted md:hidden">
          {[memo || envelope, account].filter(Boolean).join(" · ") || "\u00A0"}
        </p>
      </div>

      {/* Memo (desktop) */}
      <div className="hidden min-w-0 md:block">
        <span className="truncate text-[12.5px] text-text-muted">
          {memo || "—"}
        </span>
      </div>

      {/* Envelope pill (desktop) */}
      <div className="hidden md:block">
        {envelope ? (
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold"
            style={pillStyle(envelope)}
          >
            {envelope}
          </span>
        ) : (
          <span className="text-[11.5px] text-text-muted/60">—</span>
        )}
      </div>

      {/* Account pill (desktop) */}
      <div className="hidden md:block">
        {account ? (
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold"
            style={pillStyle(account)}
          >
            {account}
          </span>
        ) : (
          <span className="text-[11.5px] text-text-muted/60">—</span>
        )}
      </div>

      {/* Amount */}
      <div className="text-right">
        <AmountText
          amount={signed}
          showNominal={showNominal}
          size="sm"
          tone={
            transaction.type === "income"
              ? "positive"
              : transaction.type === "transfer"
                ? "neutral"
                : "auto"
          }
        />
      </div>
    </div>
  )
}
