import { createContextKey, type Middleware } from 'remix/router'

export type AppConfig = {
  setupSecret: string | undefined
}

export const appConfigContext = createContextKey<AppConfig>()

export function loadConfig(config: AppConfig): Middleware {
  return (context, next) => {
    context.set(appConfigContext, config)
    return next()
  }
}
