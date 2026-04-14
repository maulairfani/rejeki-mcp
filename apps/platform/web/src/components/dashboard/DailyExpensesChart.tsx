import { useMemo, useState } from "react"
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
import { formatIDR, formatIDRShort } from "@/lib/format"
import { CHART_COLORS } from "@/lib/chart-colors"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface TooltipPayloadEntry {
  name: string
  value: number
  color: string
}

function ChartTooltip({
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
            <span className="font-mono">{formatIDRShort(entry.value)}</span>
          </div>
        ) : null
      )}
      <div className="mt-1 pt-1 border-t flex justify-between gap-4 font-medium">
        <span>Total</span>
        <span className="font-mono">{formatIDRShort(total)}</span>
      </div>
    </div>
  )
}

export function DailyExpensesChart({
  showNominal,
}: {
  showNominal: boolean
}) {
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

  const visibleEnvelopes =
    data?.envelopes.filter((e) => !excluded.has(e.id)) ?? []
  const lastVisible = visibleEnvelopes.at(-1)

  const totalExpenses30d = useMemo(() => {
    if (!data) return 0
    return data.chartData.reduce((sum, day) => sum + day.total, 0)
  }, [data])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle>Daily Expenses</CardTitle>
            <CardDescription>
              Last 30 days &middot; stacked by envelope
            </CardDescription>
          </div>
          {data && (
            <div className="text-right">
              <p className="text-2xl font-heading font-semibold tabular-nums tracking-tight">
                {showNominal ? formatIDR(totalExpenses30d) : "••••••"}
              </p>
              <p className="text-xs text-muted-foreground">Total 30 days</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {data && (
          <div
            className="flex flex-wrap gap-2 mb-4"
            role="group"
            aria-label="Filter chart by envelope"
          >
            {data.envelopes.map((env, i) => {
              const active = !excluded.has(env.id)
              const color = CHART_COLORS[i % CHART_COLORS.length]
              return (
                <button
                  key={env.id}
                  onClick={() => toggleEnvelope(env.id)}
                  aria-pressed={active}
                  aria-label={`${active ? "Hide" : "Show"} ${env.name}`}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    active
                      ? "opacity-100 bg-accent/50"
                      : "opacity-40 line-through"
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

        {error ? (
          <div className="flex items-center justify-center h-64 text-destructive text-sm">
            Failed to load data: {error}
          </div>
        ) : loading ? (
          <div className="h-72 w-full rounded-lg bg-muted/40 animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data?.chartData}
              margin={{ top: 8, right: 8, left: -4, bottom: 0 }}
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
                tickFormatter={formatIDRShort}
                tick={showNominal ? { fontSize: 11 } : false}
                tickLine={false}
                axisLine={false}
                width={showNominal ? 48 : 8}
                className="fill-muted-foreground"
              />
              <Tooltip
                content={showNominal ? <ChartTooltip /> : <></>}
                cursor={
                  showNominal
                    ? { fill: "hsl(var(--muted) / 0.4)" }
                    : false
                }
              />
              {data?.envelopes.map((env, i) => {
                if (excluded.has(env.id)) return null
                return (
                  <Bar
                    key={env.id}
                    dataKey={env.name}
                    stackId="expenses"
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
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
      </CardContent>
    </Card>
  )
}
