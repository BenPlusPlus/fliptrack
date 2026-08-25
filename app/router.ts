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
import passwordController from './actions/password/controller.tsx'
import adminController from './actions/admin/controller.tsx'
import acquisitionsController from './actions/acquisitions/controller.tsx'
import newAcquisitionController from './actions/acquisitions/new/controller.tsx'
import addFlipController from './actions/acquisitions/addFlip/controller.tsx'
import continueAcquisitionController from './actions/acquisitions/continue/controller.tsx'
import flipsController from './actions/flips/controller.tsx'
import resplitController from './actions/flips/resplit/controller.tsx'
import undoFlipController from './actions/flips/undo/controller.tsx'
import tagsController from './actions/tags/controller.tsx'
import deleteTagController from './actions/tags/delete/controller.tsx'
import channelsController from './actions/channels/controller.tsx'
import deleteChannelController from './actions/channels/delete/controller.tsx'
import salesController from './actions/sales/controller.tsx'
import newSaleController from './actions/sales/new/controller.tsx'
import writeOffsController from './actions/writeOffs/controller.tsx'
import newWriteOffController from './actions/writeOffs/new/controller.tsx'
import listingsController from './actions/listings/controller.tsx'
import newListingController from './actions/listings/new/controller.tsx'
import {
  loadAuth,
  loadInspect,
  refuseInspectorMutations,
  requireStandingPassword,
} from './middleware/auth.ts'
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
    loadInspect(),
    refuseInspectorMutations(),
    requireStandingPassword(),
  )

  type AppContext = MiddlewareContext<typeof middleware>

  let router = createRouter<AppContext>({ middleware })

  router.map(routes, rootController)
  router.map(routes.oobe, oobeController)
  router.map(routes.login, loginController)
  router.map(routes.password, passwordController)
  router.map(routes.admin, adminController)
  router.map(routes.acquisitions, acquisitionsController)
  router.map(routes.acquisitions.new, newAcquisitionController)
  router.map(routes.acquisitions.addFlip, addFlipController)
  router.map(routes.acquisitions.continue, continueAcquisitionController)
  router.map(routes.flips, flipsController)
  router.map(routes.flips.resplit, resplitController)
  router.map(routes.flips.undo, undoFlipController)
  router.map(routes.tags, tagsController)
  router.map(routes.tags.delete, deleteTagController)
  router.map(routes.channels, channelsController)
  router.map(routes.channels.delete, deleteChannelController)
  router.map(routes.sales, salesController)
  router.map(routes.sales.new, newSaleController)
  router.map(routes.writeOffs, writeOffsController)
  router.map(routes.writeOffs.new, newWriteOffController)
  router.map(routes.listings, listingsController)
  router.map(routes.listings.new, newListingController)

  return { router, db }
}

export type AppRouter = ReturnType<typeof createApp>['router']
export type AppContext = RouterContext<AppRouter>

declare module 'remix/router' {
  interface RouterTypes {
    context: AppContext
  }
}
