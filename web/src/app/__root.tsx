import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { Providers } from '../providers'
import { BonesProvider } from '../bones/BonesProvider'
import appCss from '../styles/globals.css?url'
import '@first-brain/config'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'First Brain' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap',
      },
    ],
  }),
  component: Root,
})

function Root() {
  return (
    <html lang="en" className="h-full antialiased font-sans">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          <BonesProvider>
            <Outlet />
          </BonesProvider>
        </Providers>
        <Scripts />
      </body>
    </html>
  )
}
