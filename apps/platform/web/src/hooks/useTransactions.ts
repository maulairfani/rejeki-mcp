export type TransactionType = "income" | "expense" | "transfer"

export interface Transaction {
  id: number
  amount: number
  type: TransactionType
  envelope: string | null
  account: string
  toAccount: string | null
  payee: string | null
  memo: string | null
  date: string // ISO date string YYYY-MM-DD
}

export interface DayGroup {
  date: string // ISO YYYY-MM-DD
  income: number
  expense: number
  transactions: Transaction[]
}

const ACCOUNTS = ["BCA", "GoPay", "Cash", "Mandiri"]
const ENVELOPES_EXPENSE = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Health",
  "Subscriptions",
  "Entertainment",
  "Education",
]
const ENVELOPES_INCOME = ["Salary", "Freelance", "Other Income"]

const PAYEES_EXPENSE: Record<string, string[]> = {
  Food: ["Warteg Bahari", "Indomaret", "Alfamart", "Grab Food", "Kopi Kenangan"],
  Transport: ["Grab", "Gojek", "Transjakarta", "Pertamina"],
  Shopping: ["Tokopedia", "Shopee", "Uniqlo"],
  Bills: ["PLN", "Indihome", "BPJS"],
  Health: ["Apotek K-24", "Halodoc", "Kimia Farma"],
  Subscriptions: ["Spotify", "Netflix", "YouTube Premium", "iCloud"],
  Entertainment: ["CGV", "Steam", "Timezone"],
  Education: ["Udemy", "Gramedia", "Periplus"],
}

const PAYEES_INCOME = ["PT Maju Sejahtera", "Client — Tokopedia", "Transfer In"]

// Simple seeded PRNG for deterministic data
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildMockTransactions(): Transaction[] {
  const rand = mulberry32(42)
  const txns: Transaction[] = []
  let id = 1

  const now = new Date()
  // Generate 60 days of data
  for (let dayOffset = 59; dayOffset >= 0; dayOffset--) {
    const d = new Date(now)
    d.setDate(d.getDate() - dayOffset)
    const iso = d.toISOString().slice(0, 10)

    // 1-5 expense transactions per day
    const expenseCount = Math.floor(rand() * 4) + 1
    for (let i = 0; i < expenseCount; i++) {
      const envelope =
        ENVELOPES_EXPENSE[Math.floor(rand() * ENVELOPES_EXPENSE.length)]
      const payees = PAYEES_EXPENSE[envelope]
      const payee = payees[Math.floor(rand() * payees.length)]
      const amount =
        Math.round((rand() * 180_000 + 8_000) / 1000) * 1000

      txns.push({
        id: id++,
        amount,
        type: "expense",
        envelope,
        account: ACCOUNTS[Math.floor(rand() * ACCOUNTS.length)],
        toAccount: null,
        payee,
        memo: null,
        date: iso,
      })
    }

    // ~20% chance of income on a given day
    if (rand() < 0.2) {
      const envelope =
        ENVELOPES_INCOME[Math.floor(rand() * ENVELOPES_INCOME.length)]
      const payee =
        PAYEES_INCOME[Math.floor(rand() * PAYEES_INCOME.length)]
      const amount =
        Math.round((rand() * 8_000_000 + 2_000_000) / 10000) * 10000

      txns.push({
        id: id++,
        amount,
        type: "income",
        envelope: null,
        account: ACCOUNTS[Math.floor(rand() * ACCOUNTS.length)],
        toAccount: null,
        payee,
        memo: null,
        date: iso,
      })
    }

    // ~10% chance of transfer
    if (rand() < 0.1) {
      const fromIdx = Math.floor(rand() * ACCOUNTS.length)
      let toIdx = Math.floor(rand() * (ACCOUNTS.length - 1))
      if (toIdx >= fromIdx) toIdx++
      const amount =
        Math.round((rand() * 1_000_000 + 100_000) / 10000) * 10000

      txns.push({
        id: id++,
        amount,
        type: "transfer",
        envelope: null,
        account: ACCOUNTS[fromIdx],
        toAccount: ACCOUNTS[toIdx],
        payee: null,
        memo: `Transfer to ${ACCOUNTS[toIdx]}`,
        date: iso,
      })
    }
  }

  return txns
}

const MOCK_TRANSACTIONS = buildMockTransactions()

export function groupByDay(transactions: Transaction[]): DayGroup[] {
  const map = new Map<string, Transaction[]>()

  for (const txn of transactions) {
    const list = map.get(txn.date) ?? []
    list.push(txn)
    map.set(txn.date, list)
  }

  // Sort days descending (most recent first)
  const days = Array.from(map.entries()).sort(([a], [b]) =>
    b.localeCompare(a)
  )

  return days.map(([date, txns]) => {
    let income = 0
    let expense = 0
    for (const t of txns) {
      if (t.type === "income") income += t.amount
      else if (t.type === "expense") expense += t.amount
    }
    return { date, income, expense, transactions: txns }
  })
}

export interface TransactionFilters {
  type: TransactionType | "all"
  search: string
  account: string | "all"
  envelope: string | "all"
}

export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters
): Transaction[] {
  return transactions.filter((txn) => {
    if (filters.type !== "all" && txn.type !== filters.type) return false
    if (filters.account !== "all" && txn.account !== filters.account)
      return false
    if (
      filters.envelope !== "all" &&
      (txn.envelope ?? "") !== filters.envelope
    )
      return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const haystack = [txn.payee, txn.memo, txn.envelope, txn.account]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
}

export function useTransactions() {
  return {
    transactions: MOCK_TRANSACTIONS,
    accounts: ACCOUNTS,
    envelopes: [...ENVELOPES_INCOME, ...ENVELOPES_EXPENSE],
  }
}
