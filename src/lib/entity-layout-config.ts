export const entityLayoutConfig = {
  product: {
    labelKey: 'entity.layout.product.label',
    columns: {
      name: {
        labelKey: 'entity.layout.product.columns.name',
        type: 'text',
        width: 400,
      },
      company: {
        labelKey: 'entity.layout.product.columns.company',
        type: 'text',
        width: 400,
      },
      category: {
        labelKey: 'entity.layout.product.columns.category',
        type: 'text',
        width: 275,
      },
      quantity: {
        labelKey: 'entity.layout.product.columns.qty_in_stock',
        type: 'number',
        width: 110,
        sortable: false,
      },
    },
  },
  variant: {
    labelKey: 'entity.layout.variant.label',
    columns: {
      sku: {
        labelKey: 'entity.layout.variant.columns.sku',
        type: 'text',
        width: 275,
      },
      variant_name: {
        labelKey: 'entity.layout.variant.columns.variant_name',
        type: 'text',
        width: 220,
      },
      uom_id: {
        labelKey: 'entity.layout.variant.columns.uom',
        type: 'text',
        width: 80,
      },
      quantity: {
        labelKey: 'entity.layout.product.columns.qty_in_stock',
        type: 'number',
        width: 110,
      },
      retail_price: {
        labelKey: 'entity.layout.variant.columns.retail',
        type: 'currency',
        width: 170,
      },
      wholesale_price: {
        labelKey: 'entity.layout.variant.columns.wholesale',
        type: 'currency',
        width: 110,
      },
      distribution_price: {
        labelKey: 'entity.layout.variant.columns.distribution',
        type: 'currency',
        width: 275,
      },
    },
  },
  warehouse: {
    labelKey: 'entity.layout.warehouse.label',
    columns: {
      name: {
        labelKey: 'entity.layout.warehouse.columns.name',
        type: 'text',
        width: 400,
      },
      location: {
        labelKey: 'entity.layout.warehouse.columns.location',
        type: 'text',
        width: 220,
      },
    },
  },
  stock_level: {
    labelKey: 'entity.layout.stock_level.label',
    columns: {
      variant_name: {
        labelKey: 'entity.layout.stock_level.columns.variant_name',
        type: 'text',
        width: 275,
      },
      sku: {
        labelKey: 'entity.layout.stock_level.columns.sku',
        type: 'text',
        width: 220,
      },
      quantity: {
        labelKey: 'entity.layout.stock_level.columns.quantity',
        type: 'number',
        width: 110,
      },
    },
  },
  invoice: {
    labelKey: 'entity.layout.invoice.label',
    columns: {
      invoice_number: {
        labelKey: 'entity.layout.invoice.columns.invoice_number',
        type: 'text',
        width: 275,
      },
      customer_name: {
        labelKey: 'entity.layout.invoice.columns.customer_name',
        type: 'text',
        width: 180,
      },
      total_amount: {
        labelKey: 'entity.layout.invoice.columns.total_amount',
        type: 'currency',
        width: 275,
      },
      status: {
        labelKey: 'entity.layout.invoice.columns.status',
        type: 'status',
        width: 170,
      },
      created_at: {
        labelKey: 'entity.layout.invoice.columns.created_at',
        type: 'text',
        width: 170,
      },
    },
  },
  customer: {
    labelKey: 'entity.layout.customer.label',
    columns: {
      name: {
        labelKey: 'entity.layout.customer.columns.name',
        type: 'text',
        width: 400,
      },
      email: {
        labelKey: 'entity.layout.customer.columns.email',
        type: 'text',
        width: 400,
      },
    },
  },
  bill: {
    labelKey: 'entity.layout.bill.label',
    columns: {
      bill_number: {
        labelKey: 'entity.layout.bill.columns.bill_number',
        type: 'text',
        width: 275,
      },
      vendor_name: {
        labelKey: 'entity.layout.bill.columns.vendor_name',
        type: 'text',
        width: 180,
      },
      total_amount: {
        labelKey: 'entity.layout.bill.columns.total_amount',
        type: 'currency',
        width: 275,
      },
      status: {
        labelKey: 'entity.layout.bill.columns.status',
        type: 'status',
        width: 170,
      },
    },
  },
  vendor: {
    labelKey: 'entity.layout.vendor.label',
    columns: {
      name: {
        labelKey: 'entity.layout.vendor.columns.name',
        type: 'text',
        width: 400,
      },
      email: {
        labelKey: 'entity.layout.vendor.columns.email',
        type: 'text',
        width: 400,
      },
    },
  },
} as const

export type EntityLayoutConfig = typeof entityLayoutConfig
