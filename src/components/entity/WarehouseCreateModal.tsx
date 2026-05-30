import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { QueryClient } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface WarehouseCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  queryClient: QueryClient
}

export function WarehouseCreateModal({
  open,
  onOpenChange,
  queryClient,
}: WarehouseCreateModalProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setName('')
    setLocation('')
  }

  useEffect(() => {
    if (!open) {
      resetForm()
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !location) {
      return
    }

    setIsSubmitting(true)
    try {
      const result = await commands.warehousesCreate(name, location)
      if (result.status === 'ok') {
        queryClient.invalidateQueries({ queryKey: ['entity', 'warehouses'] })
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
          <DialogTitle>{t('entity.create.warehouse.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-body-sm text-on-surface font-medium"
              >
                {t('entity.layout.warehouses.columns.name')}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full bg-surface-bright border border-outline-variant rounded px-3 py-1.5 text-on-surface text-body-sm focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="location"
                className="text-body-sm text-on-surface font-medium"
              >
                {t('entity.layout.warehouses.columns.location')}
              </label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                required
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
