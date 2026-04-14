import { CreditCard } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function AccountsPage() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <CreditCard className="size-6" />
        </div>
        <h2 className="text-base font-heading font-semibold">Accounts</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Manage your bank accounts, e-wallets, and cash here. Coming soon.
        </p>
      </CardContent>
    </Card>
  )
}
