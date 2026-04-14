import { Route, Routes } from "react-router-dom"
import { AppSidebar } from "@/components/sidebar-08/app-sidebar"
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
import { AnalyticsPage } from "@/pages/AnalyticsPage"

const BREADCRUMBS: Record<string, string> = {
  "/analytics": "Analytics",
}

export default function App() {
  const title = BREADCRUMBS[window.location.pathname] ?? "Dashboard"

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
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
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Routes>
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="*" element={<AnalyticsPage />} />
          </Routes>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
