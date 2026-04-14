import { useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useDailyExpenses } from "@/hooks/useAnalytics"

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#a78bfa",
  "#fb923c",
  "#34d399",
  "#f472b6",
  "#60a5fa",
]

function formatIDR(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return String(value)
}

interface TooltipPayloadEntry {
  name: string
  value: number
  color: string
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0)
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm min-w-40">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry) =>
        entry.value > 0 ? (
          <div key={entry.name} className="flex justify-between gap-4">
            <span style={{ color: entry.color }}>{entry.name}</span>
            <span className="font-mono">{formatIDR(entry.value)}</span>
          </div>
        ) : null
      )}
      <div className="mt-1 pt-1 border-t flex justify-between gap-4 font-medium">
        <span>Total</span>
        <span className="font-mono">{formatIDR(total)}</span>
      </div>
    </div>
  )
}

export function AnalyticsPage() {
  const { data, loading, error } = useDailyExpenses(30)
  const [excluded, setExcluded] = useState<Set<number>>(new Set())

  function toggleEnvelope(id: number) {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive text-sm">
        Failed to load data: {error}
      </div>
    )
  }

  const visibleEnvelopes = data?.envelopes.filter((e) => !excluded.has(e.id)) ?? []

  // Top bar radius goes to the last visible envelope
  const lastVisible = visibleEnvelopes.at(-1)

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border bg-card p-4 md:p-6">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-base font-semibold">Daily Expenses</h2>
          <p className="text-sm text-muted-foreground">
            Last 30 days · stacked by envelope
          </p>
        </div>

        {/* Envelope filter pills */}
        {data && (
          <div className="flex flex-wrap gap-2 mb-4">
            {data.envelopes.map((env, i) => {
              const active = !excluded.has(env.id)
              const color = COLORS[i % COLORS.length]
              return (
                <button
                  key={env.id}
                  onClick={() => toggleEnvelope(env.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-opacity ${
                    active ? "opacity-100" : "opacity-40"
                  }`}
                >
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ background: color }}
                  />
                  {env.name}
                </button>
              )
            })}
          </div>
        )}

        {/* Chart */}
        {loading ? (
          <div className="h-72 w-full rounded-lg bg-muted/40 animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data?.chartData}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              barCategoryGap="20%"
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                className="stroke-border"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                className="fill-muted-foreground"
              />
              <YAxis
                tickFormatter={formatIDR}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={48}
                className="fill-muted-foreground"
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(0,0,0,0.06)" }}
              />
              {data?.envelopes.map((env, i) => {
                if (excluded.has(env.id)) return null
                return (
                  <Bar
                    key={env.id}
                    dataKey={env.name}
                    stackId="expenses"
                    fill={COLORS[i % COLORS.length]}
                    radius={
                      env.id === lastVisible?.id
                        ? [4, 4, 0, 0]
                        : [0, 0, 0, 0]
                    }
                  />
                )
              })}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
