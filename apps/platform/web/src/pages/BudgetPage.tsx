import { useCallback, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"
import { getEnvelopes, getScheduled, patchEnvelopeAssign } from "@/lib/api"
import { cn, formatIDR, formatShortIDR } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Envelope {
  id: number
  name: string
  icon: string | null
  group_name: string
  group_sort: number
  target_type: string | null
  target_amount: number | null
  target_deadline: string | null
  assigned: number
  carryover: number
  activity: number
  available: number
  pct: number
  overspent: boolean
}

interface ScheduledTx {
  id: number
  amount: number
  type: string
  payee: string
  memo: string | null
  scheduled_date: string
  recurrence: string
  account_name: string
  envelope_name: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function periodToLabel(period: string): string {
  const [y, m] = period.split("-")
  return new Date(Number(y), Number(m) - 1).toLocaleString("en-US", { month: "long", year: "numeric" })
}

function addMonths(period: string, delta: number): string {
  const [y, m] = period.split("-").map(Number)
  const d = new Date(y, m - 1 + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function targetLabel(e: Envelope): string | null {
  if (!e.target_type) return null
  const map: Record<string, string> = {
    monthly_spending: "Monthly spending",
    monthly_savings: "Monthly savings",
    savings_balance: "Balance goal",
    needed_by_date: "Needed by date",
  }
  const label = map[e.target_type] ?? e.target_type
  if (e.target_amount) return `${label}: ${formatShortIDR(e.target_amount)}`
  return label
}

// ─── AssignCell ───────────────────────────────────────────────────────────────

function AssignCell({
  envelope,
  onSave,
}: {
  envelope: Envelope
  onSave: (id: number, value: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setRaw(String(envelope.assigned || ""))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 10)
  }

  const commit = () => {
    const val = parseFloat(raw.replace(/[^0-9.]/g, ""))
    if (!isNaN(val) && val !== envelope.assigned) {
      onSave(envelope.id, val)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="w-28 text-right text-sm border border-primary rounded px-2 py-0.5 focus:outline-none bg-background"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false) }}
        autoFocus
      />
    )
  }

  return (
    <button
      onClick={startEdit}
      className="text-sm tabular-nums text-right w-28 px-2 py-0.5 rounded hover:bg-muted transition-colors"
    >
      {formatShortIDR(envelope.assigned)}
    </button>
  )
}

// ─── GroupSection ─────────────────────────────────────────────────────────────

function GroupSection({
  groupName,
  envelopes,
  onSave,
}: {
  groupName: string
  envelopes: Envelope[]
  onSave: (id: number, value: number) => void
}) {
  const totalAssigned = envelopes.reduce((s, e) => s + e.assigned, 0)
  const totalActivity = envelopes.reduce((s, e) => s + e.activity, 0)
  const totalAvailable = envelopes.reduce((s, e) => s + e.available, 0)

  return (
    <div>
      {/* Group header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/60 rounded-lg mb-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{groupName}</span>
        <div className="flex gap-6 text-xs text-muted-foreground tabular-nums">
          <span className="w-28 text-right">{formatShortIDR(totalAssigned)}</span>
          <span className="w-28 text-right">{formatShortIDR(totalActivity)}</span>
          <span className={cn("w-28 text-right font-medium", totalAvailable < 0 && "text-destructive")}>
            {formatShortIDR(totalAvailable)}
          </span>
        </div>
      </div>

      {/* Envelope rows */}
      <div className="divide-y divide-border/50">
        {envelopes.map((e) => (
          <div key={e.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors group">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {e.icon && <span className="text-base leading-none">{e.icon}</span>}
                <span className={cn("text-sm", e.overspent && "text-destructive font-medium")}>{e.name}</span>
                {e.target_type && (
                  <span className="hidden group-hover:inline-block text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                    {targetLabel(e)}
                  </span>
                )}
              </div>
              {e.assigned > 0 && (
                <div className="mt-1.5 h-1 w-40 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      e.overspent ? "bg-destructive" : e.pct >= 80 ? "bg-chart-3" : "bg-chart-1"
                    )}
                    style={{ width: `${Math.min(100, e.pct)}%` }}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-6 shrink-0">
              <AssignCell envelope={e} onSave={onSave} />
              <span className="text-sm tabular-nums text-right w-28 text-muted-foreground">
                {formatShortIDR(e.activity)}
              </span>
              <span className={cn(
                "text-sm tabular-nums text-right w-28 font-medium",
                e.overspent ? "text-destructive" : e.available === 0 ? "text-muted-foreground" : ""
              )}>
                {formatShortIDR(e.available)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function BudgetPage() {
  const [period, setPeriod] = useState(currentPeriod)
  const queryClient = useQueryClient()

  const { data: envelopes = [], isLoading } = useQuery<Envelope[]>({
    queryKey: ["envelopes", period],
    queryFn: () => getEnvelopes(period).then((r) => r.data),
  })

  const { data: scheduled = [] } = useQuery<ScheduledTx[]>({
    queryKey: ["scheduled"],
    queryFn: () => getScheduled().then((r) => Array.isArray(r.data) ? r.data : []),
  })

  const handleAssign = useCallback(
    async (id: number, value: number) => {
      await patchEnvelopeAssign(id, period, value)
      queryClient.invalidateQueries({ queryKey: ["envelopes", period] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
    [period, queryClient]
  )

  // Group envelopes
  const grouped = envelopes.reduce<Record<string, Envelope[]>>((acc, e) => {
    if (!acc[e.group_name]) acc[e.group_name] = []
    acc[e.group_name].push(e)
    return acc
  }, {})

  // Sorted group names by sort_order
  const groupOrder = [...new Set(envelopes.map((e) => e.group_name))]

  // Summary
  const totalAssigned = envelopes.reduce((s, e) => s + e.assigned, 0)
  const totalActivity = envelopes.reduce((s, e) => s + e.activity, 0)
  const totalAvailable = envelopes.reduce((s, e) => s + e.available, 0)
  const overspentCount = envelopes.filter((e) => e.overspent).length

  return (
    <div className="space-y-6">
      {/* Period nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPeriod((p) => addMonths(p, -1))}
            className="p-1.5 rounded hover:bg-muted transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium w-36 text-center">{periodToLabel(period)}</span>
          <button
            onClick={() => setPeriod((p) => addMonths(p, 1))}
            className="p-1.5 rounded hover:bg-muted transition-colors"
          >
            <ChevronRight size={16} />
          </button>
          {period !== currentPeriod() && (
            <button
              onClick={() => setPeriod(currentPeriod())}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 ml-1"
            >
              <RefreshCw size={11} /> Today
            </button>
          )}
        </div>
        {overspentCount > 0 && (
          <span className="text-xs text-destructive bg-destructive/10 px-2.5 py-1 rounded-full">
            {overspentCount} overspent
          </span>
        )}
      </div>

      {/* Column headers */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40">
          <span className="text-xs font-medium text-muted-foreground flex-1">Envelope</span>
          <div className="flex gap-6 text-xs font-medium text-muted-foreground">
            <span className="w-28 text-right">Assigned</span>
            <span className="w-28 text-right">Activity</span>
            <span className="w-28 text-right">Available</span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="divide-y divide-border/50 p-2 space-y-1">
            {groupOrder.map((group) => (
              <GroupSection
                key={group}
                groupName={group}
                envelopes={grouped[group]}
                onSave={handleAssign}
              />
            ))}
          </div>
        )}

        {/* Footer totals */}
        <div className="flex items-center justify-between px-3 py-2.5 border-t bg-muted/40">
          <span className="text-sm font-semibold flex-1">Total</span>
          <div className="flex gap-6 text-sm font-semibold tabular-nums">
            <span className="w-28 text-right">{formatIDR(totalAssigned)}</span>
            <span className="w-28 text-right">{formatIDR(totalActivity)}</span>
            <span className={cn("w-28 text-right", totalAvailable < 0 && "text-destructive")}>
              {formatIDR(totalAvailable)}
            </span>
          </div>
        </div>
      </div>

      {/* Scheduled transactions */}
      {scheduled.length > 0 && (
        <div className="bg-card rounded-xl border p-5 space-y-4">
          <h3 className="text-sm font-medium">Scheduled Transactions</h3>
          <ul className="divide-y divide-border/50">
            {scheduled.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2.5 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.payee}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.scheduled_date} · {s.recurrence} · {s.envelope_name ?? s.account_name}
                  </p>
                </div>
                <span className={cn(
                  "text-sm tabular-nums shrink-0 font-medium",
                  s.type === "income" ? "text-chart-1" : ""
                )}>
                  {s.type === "income" ? "+" : "-"}{formatShortIDR(s.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
