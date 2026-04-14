import * as React from "react"
import {
  BarChart3,
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
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: BarChart3,
      isActive: true,
    },
    {
      title: "Transactions",
      url: "/transactions",
      icon: List,
    },
    {
      title: "Envelopes",
      url: "/envelopes",
      icon: Wallet,
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<a href="/" />}>
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
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
