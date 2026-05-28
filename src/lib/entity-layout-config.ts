export const entityLayoutConfig = {
  products: {
    labelKey: 'entity.layout.products.label',
    columns: {
      name: {
        labelKey: 'entity.layout.products.columns.name',
        type: 'text',
        width: 200,
      },
      category: {
        labelKey: 'entity.layout.products.columns.category',
        type: 'text',
        width: 120,
      },
      unit_price: {
        labelKey: 'entity.layout.products.columns.unit_price',
        type: 'currency',
        width: 120,
      },
      qty_in_stock: {
        labelKey: 'entity.layout.products.columns.qty_in_stock',
        type: 'number',
        width: 100,
      },
    },
  },
  warehouses: {
    labelKey: 'entity.layout.warehouses.label',
    columns: {
      name: {
        labelKey: 'entity.layout.warehouses.columns.name',
        type: 'text',
        width: 200,
      },
      location: {
        labelKey: 'entity.layout.warehouses.columns.location',
        type: 'text',
        width: 150,
      },
    },
  },
  invoices: {
    labelKey: 'entity.layout.invoices.label',
    columns: {
      invoice_number: {
        labelKey: 'entity.layout.invoices.columns.invoice_number',
        type: 'text',
        width: 120,
      },
      customer_name: {
        labelKey: 'entity.layout.invoices.columns.customer_name',
        type: 'text',
        width: 180,
      },
      total_amount: {
        labelKey: 'entity.layout.invoices.columns.total_amount',
        type: 'currency',
        width: 120,
      },
      status: {
        labelKey: 'entity.layout.invoices.columns.status',
        type: 'status',
        width: 100,
      },
      created_at: {
        labelKey: 'entity.layout.invoices.columns.created_at',
        type: 'text',
        width: 100,
      },
    },
  },
  customers: {
    labelKey: 'entity.layout.customers.label',
    columns: {
      name: {
        labelKey: 'entity.layout.customers.columns.name',
        type: 'text',
        width: 200,
      },
      email: {
        labelKey: 'entity.layout.customers.columns.email',
        type: 'text',
        width: 200,
      },
    },
  },
  bills: {
    labelKey: 'entity.layout.bills.label',
    columns: {
      bill_number: {
        labelKey: 'entity.layout.bills.columns.bill_number',
        type: 'text',
        width: 120,
      },
      vendor_name: {
        labelKey: 'entity.layout.bills.columns.vendor_name',
        type: 'text',
        width: 180,
      },
      total_amount: {
        labelKey: 'entity.layout.bills.columns.total_amount',
        type: 'currency',
        width: 120,
      },
      status: {
        labelKey: 'entity.layout.bills.columns.status',
        type: 'status',
        width: 100,
      },
    },
  },
  vendors: {
    labelKey: 'entity.layout.vendors.label',
    columns: {
      name: {
        labelKey: 'entity.layout.vendors.columns.name',
        type: 'text',
        width: 200,
      },
      email: {
        labelKey: 'entity.layout.vendors.columns.email',
        type: 'text',
        width: 200,
      },
    },
  },
} as const

export type EntityLayoutConfig = typeof entityLayoutConfig
