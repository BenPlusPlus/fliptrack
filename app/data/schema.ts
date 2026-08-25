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

export type Books = TableRow<typeof books>
export type Operator = TableRow<typeof operators>
export type Acquisition = TableRow<typeof acquisitions>
export type Flip = TableRow<typeof flips>
export type Tag = TableRow<typeof tags>
