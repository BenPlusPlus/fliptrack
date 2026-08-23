import type { Handle, RemixNode } from 'remix/ui'

import { entryHref, entryPreloads } from '../assets.ts'
import { FONT_BODY, tokens } from './styles.ts'

export interface DocumentProps {
  children?: RemixNode
  head?: RemixNode
  title?: string
}

export function Document(handle: Handle<DocumentProps>) {
  return () => {
    let { children, head, title = 'Fliptrack' } = handle.props

    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="color-scheme" content="light" />
          <meta name="theme-color" content="#efe4cc" />
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Fraunces:opsz,wght@9..144,600&display=swap"
          />
          <title>{title}</title>
          {head}
          {entryPreloads.map((href) => (
            <link key={href} rel="modulepreload" href={href} />
          ))}
          <script type="module" src={entryHref}></script>
        </head>
        <body
          mix={tokens}
          style={{
            fontFamily: FONT_BODY,
          }}
        >
          {children}
        </body>
      </html>
    )
  }
}


