import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { QueryClient } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'
import type { NewVariant } from '@/lib/bindings'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface VariantCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  queryClient: QueryClient
  productId: string
}

export function VariantCreateModal({
  open,
  onOpenChange,
  queryClient,
  productId,
}: VariantCreateModalProps) {
  const { t } = useTranslation()
  const [sku, setSku] = useState('')
  const [variantName, setVariantName] = useState('')
  const [uomId, setUomId] = useState('')
  const [retailPrice, setRetailPrice] = useState('')
  const [wholesalePrice, setWholesalePrice] = useState('')
  const [distributionPrice, setDistributionPrice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setSku('')
    setVariantName('')
    setUomId('')
    setRetailPrice('')
    setWholesalePrice('')
    setDistributionPrice('')
  }

  useEffect(() => {
    if (!open) {
      resetForm()
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!sku || !variantName) {
      return
    }

    setIsSubmitting(true)
    try {
      const variant: NewVariant = {
        product_id: productId,
        sku,
        variant_name: variantName,
        uom_id: uomId,
        retail_price: parseFloat(retailPrice) || 0,
        wholesale_price: parseFloat(wholesalePrice) || 0,
        distribution_price: parseFloat(distributionPrice) || 0,
      }
      const result = await commands.variantsCreate(variant)
      if (result.status === 'ok') {
        queryClient.invalidateQueries({
          queryKey: ['entity', 'product_variants'],
        })
        onOpenChange(false)
        resetForm()
      } else {
        toast.error(result.error)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('entity.create.variant.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="sku"
                className="text-body-sm text-on-surface font-medium"
              >
                {t('entity.layout.product_variants.columns.sku')}
              </label>
              <input
                id="sku"
                type="text"
                value={sku}
                onChange={e => setSku(e.target.value)}
                required
                className="w-full bg-surface-bright border border-outline-variant rounded px-3 py-1.5 text-on-surface text-body-sm focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="variantName"
                className="text-body-sm text-on-surface font-medium"
              >
                {t('entity.layout.product_variants.columns.variant_name')}
              </label>
              <input
                id="variantName"
                type="text"
                value={variantName}
                onChange={e => setVariantName(e.target.value)}
                required
                className="w-full bg-surface-bright border border-outline-variant rounded px-3 py-1.5 text-on-surface text-body-sm focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="uomId"
                className="text-body-sm text-on-surface font-medium"
              >
                {t('entity.layout.product_variants.columns.uom')}
              </label>
              <input
                id="uomId"
                type="text"
                value={uomId}
                onChange={e => setUomId(e.target.value)}
                className="w-full bg-surface-bright border border-outline-variant rounded px-3 py-1.5 text-on-surface text-body-sm focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="retailPrice"
                className="text-body-sm text-on-surface font-medium"
              >
                {t('entity.layout.product_variants.columns.retail')}
              </label>
              <input
                id="retailPrice"
                type="number"
                step="0.01"
                value={retailPrice}
                onChange={e => setRetailPrice(e.target.value)}
                className="w-full bg-surface-bright border border-outline-variant rounded px-3 py-1.5 text-on-surface text-body-sm focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="wholesalePrice"
                className="text-body-sm text-on-surface font-medium"
              >
                {t('entity.layout.product_variants.columns.wholesale')}
              </label>
              <input
                id="wholesalePrice"
                type="number"
                step="0.01"
                value={wholesalePrice}
                onChange={e => setWholesalePrice(e.target.value)}
                className="w-full bg-surface-bright border border-outline-variant rounded px-3 py-1.5 text-on-surface text-body-sm focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="distributionPrice"
                className="text-body-sm text-on-surface font-medium"
              >
                {t('entity.layout.product_variants.columns.distribution')}
              </label>
              <input
                id="distributionPrice"
                type="number"
                step="0.01"
                value={distributionPrice}
                onChange={e => setDistributionPrice(e.target.value)}
                className="w-full bg-surface-bright border border-outline-variant rounded px-3 py-1.5 text-on-surface text-body-sm focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={handleCancel}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Spinner /> : null}
              {t('entity.create.button')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
