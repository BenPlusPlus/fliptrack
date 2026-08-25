import { column as c, table } from 'remix/data-table'
import type { TableRow } from 'remix/data-table'

export const books = table({
  name: 'books',
  columns: {
    id: c.uuid().primaryKey(),
  },
})

export const instanceSettings = table({
  name: 'instance_settings',
  primaryKey: 'singleton',
  columns: {
    singleton: c.boolean().notNull(),
    signup_open: c.boolean().notNull(),
  },
})

export const operators = table({
  name: 'operator',
  columns: {
    id: c.uuid().primaryKey(),
    email: c.text().notNull(),
    password_hash: c.text().notNull(),
    instance_admin: c.boolean().notNull(),
    must_change_password: c.boolean().notNull(),
    credentials_changed_at: c.timestamp({ withTimezone: true }).notNull(),
    books_id: c.uuid().notNull().references('books', 'id'),
  },
})

export const acquisitions = table({
  name: 'acquisition',
  columns: {
    id: c.uuid().primaryKey(),
    books_id: c.uuid().notNull().references('books', 'id'),
    acquisition_date: c.date().notNull(),
    notes: c.text(),
  },
})

export const flips = table({
  name: 'flip',
  columns: {
    id: c.uuid().primaryKey(),
    books_id: c.uuid().notNull().references('books', 'id'),
    acquisition_id: c.uuid().notNull().references('acquisition', 'id'),
    parent_flip_id: c.uuid().references('flip', 'id'),
    retired: c.boolean().notNull(),
    name: c.text().notNull(),
    notes: c.text(),
    item_cost: c.integer().notNull(),
    tax_paid: c.integer().notNull(),
    inbound_shipping: c.integer().notNull(),
  },
})

export const tags = table({
  name: 'tag',
  columns: {
    id: c.uuid().primaryKey(),
    books_id: c.uuid().notNull().references('books', 'id'),
    name: c.text().notNull(),
  },
})

export const flipTags = table({
  name: 'flip_tag',
  primaryKey: ['flip_id', 'tag_id'],
  columns: {
    books_id: c.uuid().notNull().references('books', 'id'),
    flip_id: c.uuid().notNull().references('flip', 'id'),
    tag_id: c.uuid().notNull().references('tag', 'id'),
  },
})

export const channels = table({
  name: 'channel',
  columns: {
    id: c.uuid().primaryKey(),
    books_id: c.uuid().notNull().references('books', 'id'),
    name: c.text().notNull(),
  },
})

export const sales = table({
  name: 'sale',
  columns: {
    id: c.uuid().primaryKey(),
    books_id: c.uuid().notNull().references('books', 'id'),
    channel_id: c.uuid().notNull().references('channel', 'id'),
    sale_date: c.date().notNull(),
    sale_price: c.integer().notNull(),
    buyer_paid_shipping: c.integer().notNull(),
    marketplace_fee: c.integer().notNull(),
    outbound_shipping: c.integer().notNull(),
    supplies: c.integer().notNull(),
    notes: c.text(),
  },
})

export const saleFlips = table({
  name: 'sale_flip',
  primaryKey: ['sale_id', 'flip_id'],
  columns: {
    books_id: c.uuid().notNull().references('books', 'id'),
    sale_id: c.uuid().notNull().references('sale', 'id'),
    flip_id: c.uuid().notNull().references('flip', 'id'),
    undone: c.boolean().notNull(),
    hitch_marketplace_fee: c.integer(),
    hitch_outbound_shipping: c.integer(),
    hitch_supplies: c.integer(),
  },
})

export type Books = TableRow<typeof books>
export type Operator = TableRow<typeof operators>
export type Acquisition = TableRow<typeof acquisitions>
export type Flip = TableRow<typeof flips>
export type Tag = TableRow<typeof tags>
export type Channel = TableRow<typeof channels>
export type Sale = TableRow<typeof sales>
export type SaleFlip = TableRow<typeof saleFlips>
