import { useState, useCallback } from "react"
import { Route, Routes, useLocation } from "react-router-dom"
import { Eye, EyeOff } from "lucide-react"
import { AppSidebar } from "@/components/sidebar-08/app-sidebar"
import { useTheme } from "@/hooks/useTheme"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { DashboardPage } from "@/pages/DashboardPage"
import { TransactionsPage } from "@/pages/TransactionsPage"
import { EnvelopesPage } from "@/pages/EnvelopesPage"
import { AccountsPage } from "@/pages/AccountsPage"

const BREADCRUMBS: Record<string, string> = {
  "/envelopes": "Envelopes",
  "/transactions": "Transactions",
  "/analytics": "Analytics",
  "/accounts": "Accounts",
}

export default function App() {
  const { pathname } = useLocation()
  const title = BREADCRUMBS[pathname] ?? "Envelopes"
  const [showNominal, setShowNominal] = useState(
    () => localStorage.getItem("envel-show-nominal") === "true"
  )
  const toggleNominal = useCallback(() => {
    setShowNominal((v) => {
      localStorage.setItem("envel-show-nominal", String(!v))
      return !v
    })
  }, [])
  const { theme, setTheme } = useTheme()

  return (
    <SidebarProvider>
      <AppSidebar theme={theme} setTheme={setTheme} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <div className="flex flex-1 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <button
            onClick={toggleNominal}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              showNominal
                ? "bg-primary/10 text-primary border-primary/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label={showNominal ? "Hide amounts" : "Show amounts"}
            aria-pressed={showNominal}
          >
            {showNominal ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            {showNominal ? "Amounts visible" : "Amounts hidden"}
          </button>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Routes>
            <Route path="/envelopes" element={<EnvelopesPage showNominal={showNominal} />} />
            <Route path="/transactions" element={<TransactionsPage showNominal={showNominal} />} />
            <Route path="/analytics" element={<DashboardPage showNominal={showNominal} />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="*" element={<EnvelopesPage showNominal={showNominal} />} />
          </Routes>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
