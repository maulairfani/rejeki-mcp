import * as React from "react"
import { Link } from "react-router-dom"
import {
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  List,
  Send,
  Wallet,
} from "lucide-react"

import { NavMain } from "@/components/sidebar-08/nav-main"
import { NavSecondary } from "@/components/sidebar-08/nav-secondary"
import { NavUser } from "@/components/sidebar-08/nav-user"
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
  user: {
    name: "User",
    email: "user@envel.app",
    avatar: "",
  },
  navMain: [
    {
      title: "Envelopes",
      url: "/envelopes",
      icon: Wallet,
    },
    {
      title: "Transactions",
      url: "/transactions",
      icon: List,
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: LayoutDashboard,
    },
    {
      title: "Accounts",
      url: "/accounts",
      icon: CreditCard,
    },
  ],
  navSecondary: [
    { title: "Support", url: "#", icon: LifeBuoy },
    { title: "Feedback", url: "#", icon: Send },
  ],
}

import type { Theme } from "@/hooks/useTheme"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  theme: Theme
  setTheme: (t: Theme) => void
}

export function AppSidebar({ theme, setTheme, ...props }: AppSidebarProps) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link to="/" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Wallet className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Envel</span>
                <span className="truncate text-xs">Envelope Budget</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} theme={theme} setTheme={setTheme} />
      </SidebarFooter>
    </Sidebar>
  )
}
