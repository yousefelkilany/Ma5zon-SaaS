import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { WarehousesSubTable } from "./WarehousesSubTable"
import type { StockLevelWithVariant } from "@/lib/types/entity"

const mockStockLevels: StockLevelWithVariant[] = [
  { variant_id: "1", variant_name: "Widget A", sku: "W001", warehouse_id: "wh1", quantity: 100 },
  { variant_id: "2", variant_name: "Widget B", sku: "W002", warehouse_id: "wh1", quantity: 50 },
]

describe("WarehousesSubTable", () => {
  beforeEach(() => {
    vi.mock("react-i18next", () => ({
      useTranslation: () => ({ t: (key: string) => key }),
    }))
    vi.mock("@/i18n/config", () => ({
      default: { language: "en" },
    }))
  })

  it("renders loading skeleton when isLoading is true", () => {
    render(<WarehousesSubTable stockLevels={[]} isLoading={true} warehouseId="wh1" />)
    expect(screen.getByTestId("warehouses-subtable-skeleton")).toBeTruthy()
  })

  it("renders empty state when stockLevels is empty", () => {
    render(<WarehousesSubTable stockLevels={[]} isLoading={false} warehouseId="wh1" />)
    expect(screen.getByText("entity.stock.noLevels")).toBeTruthy()
  })

  it("renders stock levels table when data exists", () => {
    render(<WarehousesSubTable stockLevels={mockStockLevels} isLoading={false} warehouseId="wh1" />)
    expect(screen.getByText("Widget A")).toBeTruthy()
    expect(screen.getByText("Widget B")).toBeTruthy()
  })
})