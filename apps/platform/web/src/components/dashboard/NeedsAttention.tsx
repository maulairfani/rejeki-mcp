import { ArrowRight } from "lucide-react"
import { formatIDR } from "@/lib/format"

interface AttentionRow {
  badge: "Unassigned" | "Overspent"
  name: string
  amount: string
  href: string
}

const MOCK_RTA = {
  ready_to_assign: 1_850_000,
}

const MOCK_OVERSPENT = [
  { id: 1, name: "Groceries", budgeted: 1_500_000, spent: 1_820_000 },
  { id: 2, name: "Transport", budgeted: 500_000, spent: 612_000 },
]

function buildAttentionRows(): AttentionRow[] {
  const rows: AttentionRow[] = []

  if (MOCK_RTA.ready_to_assign > 0) {
    rows.push({
      badge: "Unassigned",
      name: "Ready to assign",
      amount: formatIDR(MOCK_RTA.ready_to_assign),
      href: "/budget",
    })
  }

  for (const env of MOCK_OVERSPENT) {
    rows.push({
      badge: "Overspent",
      name: env.name,
      amount: `+${formatIDR(env.spent - env.budgeted)}`,
      href: `/envelopes/${env.id}`,
    })
  }

  return rows
}

const BADGE_STYLES: Record<AttentionRow["badge"], string> = {
  Unassigned: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  Overspent: "bg-destructive/15 text-red-700 dark:text-red-400",
}

export function NeedsAttention({ showNominal }: { showNominal: boolean }) {
  const rows = buildAttentionRows()

  if (rows.length === 0) return null

  return (
    <div>
      {rows.map((row, idx) => (
        <a
          key={row.href}
          href={row.href}
          className={`flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-muted rounded-md ${
            idx < rows.length - 1 ? "border-b border-border" : ""
          }`}
        >
          <span
            className={`shrink-0 rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium leading-none ${BADGE_STYLES[row.badge]}`}
          >
            {row.badge}
          </span>
          <span className="flex-1 min-w-0 truncate text-[13px]">
            {row.name}
          </span>
          <span className="shrink-0 flex items-center gap-1.5 text-[13px] font-medium tabular-nums text-muted-foreground">
            {showNominal ? row.amount : "•••••"}
            <ArrowRight className="size-3" />
          </span>
        </a>
      ))}
    </div>
  )
}
