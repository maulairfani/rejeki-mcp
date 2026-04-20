import * as React from "react"
import { Link } from "react-router-dom"
import {
  CreditCard,
  Heart,
  LayoutDashboard,
  List,
  Settings,
  Wallet,
} from "lucide-react"

import { NavMain } from "@/components/sidebar-08/nav-main"
import { NavUser } from "@/components/sidebar-08/nav-user"
import { LogoMark } from "@/components/shared/LogoMark"
import { useAuth } from "@/hooks/useAuth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    { title: "Envelopes", url: "/envelopes", icon: Wallet },
    { title: "Transactions", url: "/transactions", icon: List },
    { title: "Analytics", url: "/analytics", icon: LayoutDashboard },
    { title: "Accounts", url: "/accounts", icon: CreditCard },
    { title: "Wishlist", url: "/wishlist", icon: Heart },
    { title: "Settings", url: "/settings", icon: Settings },
  ],
}

import type { Theme } from "@/hooks/useTheme"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  theme: Theme
  setTheme: (t: Theme) => void
}

export function AppSidebar({ theme, setTheme, ...props }: AppSidebarProps) {
  const { username } = useAuth()

  const user = {
    name: username ?? "User",
    email: username ? `${username}@envel.dev` : "user@envel.dev",
    avatar: "",
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link to="/" />}>
              <LogoMark size={30} />
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-heading text-sm font-bold text-text-primary">
                  Envel
                </span>
                <span className="truncate text-[11px] text-text-muted">
                  Envelope Budget
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} theme={theme} setTheme={setTheme} />
      </SidebarFooter>
    </Sidebar>
  )
}
