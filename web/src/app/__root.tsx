import { createRootRoute, HeadContent, Outlet, Scripts, Link } from '@tanstack/react-router'
import { Providers } from '../providers'
import { Toaster } from '../components/ui/toast'
import appCss from '../styles/globals.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'First Brain' },
      { name: 'description', content: 'AI-powered task prioritisation with XGBoost + SHAP' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap',
      },
    ],
  }),
  component: Root,
})

const NAV_LINKS: Array<{ to: string; label: string; exact?: true }> = [
  { to: '/', label: "Today's Picks", exact: true },
  { to: '/tasks', label: 'Tasks' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/insights', label: 'ML Insights' },
  { to: '/history', label: 'History' },
]

function Root() {
  return (
    <html lang="en" className="h-full antialiased font-sans">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <Toaster />
          <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="max-w-5xl mx-auto px-4 flex h-14 items-center gap-2">
              <Link
                to="/"
                className="flex items-center gap-1.5 font-bold text-sm mr-4 text-foreground hover:text-primary transition-colors"
              >
                <span className="text-primary text-base">◈</span>
                First Brain
              </Link>
              <nav className="flex items-center gap-0.5 overflow-x-auto">
                {NAV_LINKS.map(({ to, label, exact }) => (
                  <Link
                    key={to}
                    to={to}
                    activeOptions={exact ? { exact: true } : undefined}
                    inactiveProps={{
                      className:
                        'text-sm px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors whitespace-nowrap',
                    }}
                    activeProps={{
                      className:
                        'text-sm px-3 py-1.5 rounded-md bg-muted text-foreground font-medium whitespace-nowrap',
                    }}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="flex-1">
            <Outlet />
          </main>
        </Providers>
        <Scripts />
      </body>
    </html>
  )
}
