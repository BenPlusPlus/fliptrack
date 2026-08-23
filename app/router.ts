import { formData } from 'remix/middleware/form-data'
import { csrf } from 'remix/middleware/csrf'
import { session } from 'remix/middleware/session'
import { staticFiles } from 'remix/middleware/static'
import {
  createMiddleware,
  createRouter,
  type MiddlewareContext,
  type RouterContext,
} from 'remix/router'

import { createAppDatabase, type AppDatabase } from './data/db.ts'
import rootController from './actions/controller.tsx'
import oobeController from './actions/oobe/controller.tsx'
import loginController from './actions/login/controller.tsx'
import newAcquisitionController from './actions/acquisitions/new/controller.tsx'
import addFlipController from './actions/acquisitions/addFlip/controller.tsx'
import { loadAuth } from './middleware/auth.ts'
import { loadConfig } from './middleware/config.ts'
import { loadDatabase } from './middleware/database.ts'
import { render } from './middleware/render.tsx'
import { createAppSessionStorage, createSessionCookie } from './middleware/session.ts'
import { routes } from './routes.ts'

export type CreateAppOptions = {
  databaseUrl: string
  sessionSecret: string
  setupSecret?: string
  secureCookies?: boolean
  db?: AppDatabase
}

export function createApp(options: CreateAppOptions) {
  let db = options.db ?? createAppDatabase(options.databaseUrl)
  let sessionCookie = createSessionCookie(
    options.sessionSecret,
    options.secureCookies ?? process.env.NODE_ENV === 'production',
  )
  let sessionStorage = createAppSessionStorage()

  let middleware = createMiddleware(
    staticFiles('./public', { index: false }),
    formData(),
    session(sessionCookie, sessionStorage),
    csrf(),
    render(),
    loadDatabase(db),
    loadConfig({ setupSecret: options.setupSecret }),
    loadAuth(),
  )

  type AppContext = MiddlewareContext<typeof middleware>

  let router = createRouter<AppContext>({ middleware })

  router.map(routes, rootController)
  router.map(routes.oobe, oobeController)
  router.map(routes.login, loginController)
  router.map(routes.acquisitions.new, newAcquisitionController)
  router.map(routes.acquisitions.addFlip, addFlipController)

  return { router, db }
}

export type AppRouter = ReturnType<typeof createApp>['router']
export type AppContext = RouterContext<AppRouter>

declare module 'remix/router' {
  interface RouterTypes {
    context: AppContext
  }
}
