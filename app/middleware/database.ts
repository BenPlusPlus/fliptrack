import { createContextKey, type Middleware } from 'remix/router'

import type { AppDatabase } from '../data/db.ts'

export const databaseContext = createContextKey<AppDatabase>()

export function loadDatabase(db: AppDatabase): Middleware {
  return (context, next) => {
    context.set(databaseContext, db)
    return next()
  }
}
