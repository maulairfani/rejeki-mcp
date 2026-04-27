import { useMemo, useState } from "react"
import {
  useWishlist,
  filterWishlist,
  sortWishlist,
  type WishlistFilter,
  type WishlistSort,
} from "@/hooks/useWishlist"
import { PageHeader } from "@/components/shared/PageHeader"
import { Badge } from "@/components/shared/Badge"
import { AmountText } from "@/components/shared/AmountText"
import { WishlistRow } from "@/components/wishlist/WishlistRow"
import { WishlistFilters } from "@/components/wishlist/WishlistFilters"
import { WishlistDetailDialog } from "@/components/wishlist/WishlistDetailDialog"

export function WishlistPage({ showNominal }: { showNominal: boolean }) {
  const { items, totalWanted, wantedCount, boughtCount } = useWishlist()

  const [filter, setFilter] = useState<WishlistFilter>("all")
  const [sort, setSort] = useState<WishlistSort>("priority")
  const [search, setSearch] = useState("")
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)

  const filtered = useMemo(
    () => sortWishlist(filterWishlist(items, filter, search), sort),
    [items, filter, search, sort]
  )

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedItemId) ?? null,
    [items, selectedItemId]
  )

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        title="Wishlist"
        right={
          <div className="flex items-center gap-2">
            <Badge color="muted" size="xs">
              {wantedCount} wanted
            </Badge>
            <Badge color="brand" size="xs">
              {boughtCount} bought
            </Badge>
          </div>
        }
      />

      {/* Total wanted strip */}
      <div className="flex-shrink-0 border-b border-border bg-card px-7 py-3.5">
        <p className="mb-0.5 text-[11.5px] font-medium text-text-muted">
          Total wanted
        </p>
        <AmountText
          amount={totalWanted}
          showNominal={showNominal}
          size="xl"
          tone="neutral"
        />
      </div>

      {/* Filters strip */}
      <div className="flex-shrink-0 border-b border-border bg-card px-7 py-2.5">
        <WishlistFilters
          filter={filter}
          sort={sort}
          search={search}
          onFilterChange={setFilter}
          onSortChange={setSort}
          onSearchChange={setSearch}
          resultCount={filtered.length}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-text-muted">
            No items found
          </div>
        ) : (
          <>
            {filtered.map((item) => (
              <WishlistRow
                key={item.id}
                item={item}
                showNominal={showNominal}
                onClick={() => setSelectedItemId(item.id)}
              />
            ))}
            <div className="h-10" />
          </>
        )}
      </div>

      <WishlistDetailDialog
        item={selectedItem}
        open={selectedItemId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedItemId(null)
        }}
        showNominal={showNominal}
      />
    </div>
  )
}
