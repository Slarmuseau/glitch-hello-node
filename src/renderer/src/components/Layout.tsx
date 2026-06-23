import { NavLink, Outlet } from 'react-router-dom'
import ttmbLogo from '../assets/ttmb-logo.png'

const nav = [
  { to: '/', label: 'Overzicht', exact: true },
  { to: '/dranken', label: 'Dranken en prijzen' },
  { to: '/volumes', label: 'Volumes en verpakking' },
  { to: '/forfaits', label: 'Forfaits' },
  { to: '/feesten', label: 'Feesten' },
  { to: '/inzichten', label: 'Inzichten' },
  { to: '/rapporten', label: 'Rapporten' },
  { to: '/instellingen', label: 'Instellingen' },
  { to: '/over', label: 'Over' }
]

export default function Layout(): JSX.Element {
  return (
    <div className="h-full flex">
      <aside className="w-60 shrink-0 bg-white border-r border-cream-deep flex flex-col">
        <div className="px-5 py-6">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-amber-500 text-white grid place-items-center font-display text-lg shadow-soft">
              T
            </div>
            <div>
              <div className="font-display text-lg leading-none text-ink">Tapwijs</div>
              <div className="text-[11px] text-ink-faint">drank · forfait · marge</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.exact}
              className={({ isActive }) =>
                `block rounded-xl px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-amber-50 text-amber-700 font-medium'
                    : 'text-ink-soft hover:bg-cream-deep'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-cream-deep">
          <div className="text-[11px] text-ink-faint mb-1.5">Gemaakt door</div>
          <img src={ttmbLogo} alt="To the Moon and Back" className="h-7 w-auto opacity-90" />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
