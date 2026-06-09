import type { Tab } from '@/lib/utils'

type EntityTabKey = 'products' | 'variants' | 'warehouses'

type TabStateSlice = Partial<
  Record<EntityTabKey, { entity_modal: unknown; entity_id: string | null; isDirty: boolean }>
>

export function shouldInterceptTabSwitch(
  tabState: TabStateSlice,
  currentTab: Tab | undefined,
): boolean {
  const currentEntityType = currentTab?.entityType as EntityTabKey | undefined
  if (!currentEntityType) return false
  return tabState[currentEntityType]?.isDirty === true
}

export type { EntityTabKey, TabStateSlice }
