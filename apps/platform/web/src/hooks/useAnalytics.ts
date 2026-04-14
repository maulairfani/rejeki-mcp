export interface ChartDay {
  date: string
  dateRaw: string
  total: number
  [envelope: string]: number | string
}

export interface EnvelopeSeries {
  id: number
  name: string
}

export interface DailyExpenseData {
  chartData: ChartDay[]
  envelopes: EnvelopeSeries[]
}

const ENVELOPES: EnvelopeSeries[] = [
  { id: 1, name: "Food & Drinks" },
  { id: 2, name: "Transport" },
  { id: 3, name: "Shopping" },
  { id: 4, name: "Bills" },
  { id: 5, name: "Health" },
]

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

function makeDay(isoDate: string): ChartDay {
  const [, m, d] = isoDate.split("-")
  const label = `${MONTHS[parseInt(m) - 1]} ${parseInt(d)}`
  const hasSpend = Math.random() > 0.25

  const row: ChartDay = { date: label, dateRaw: isoDate, total: 0 }
  if (!hasSpend) {
    for (const e of ENVELOPES) row[e.name] = 0
    return row
  }

  for (const e of ENVELOPES) {
    const spend = Math.random() > 0.5 ? Math.round((Math.random() * 150_000 + 10_000) / 1000) * 1000 : 0
    row[e.name] = spend
    row.total += spend
  }
  return row
}

function buildStaticData(): DailyExpenseData {
  const days: string[] = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }

  // Seed-like: reset random seed by using fixed values per slot
  const seeded = days.map((iso, i) => {
    // Simple deterministic-ish spread via index
    const r = ((i * 7 + 3) % 10) / 10
    const hasSpend = r > 0.2
    const row: ChartDay = { date: "", dateRaw: iso, total: 0 }
    const [, m, d] = iso.split("-")
    row.date = `${MONTHS[parseInt(m) - 1]} ${parseInt(d)}`
    for (const [j, e] of ENVELOPES.entries()) {
      const base = [85_000, 45_000, 120_000, 200_000, 35_000][j]
      const spend = hasSpend && ((i + j * 3) % 3 !== 0)
        ? Math.round((base * (0.5 + ((i * j + 1) % 7) / 7)) / 1000) * 1000
        : 0
      row[e.name] = spend
      row.total += spend
    }
    return row
  })

  return { chartData: seeded, envelopes: ENVELOPES }
}

const STATIC_DATA = buildStaticData()

export function useDailyExpenses(_days = 30): {
  data: DailyExpenseData | null
  loading: boolean
  error: string | null
} {
  return { data: STATIC_DATA, loading: false, error: null }
}
