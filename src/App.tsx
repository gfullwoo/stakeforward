import { useEffect, useState } from 'react'
import { Lockup } from './components/Logo'
import { useStore } from './lib/store'
import Dashboard from './views/Dashboard'
import Agreements from './views/Agreements'
import AgreementDetail from './views/AgreementDetail'
import AgreementWizard from './views/AgreementWizard'
import Brand from './views/Brand'
import Settings from './views/Settings'

function useHash() {
  const read = () => window.location.hash.replace(/^#/, '') || 'dashboard'
  const [h, setH] = useState(read)
  useEffect(() => {
    const on = () => {
      setH(read())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return h
}

export default function App() {
  const route = useHash()
  const store = useStore()
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  const { agreements } = store.data
  const active = agreements.filter((a) => a.status === 'active').length

  let view
  if (route === 'dashboard') view = <Dashboard data={store.data} />
  else if (route === 'agreements') view = <Agreements agreements={agreements} />
  else if (route === 'new') view = <AgreementWizard store={store} notify={setToast} />
  else if (route.startsWith('edit-')) {
    const a = agreements.find((x) => x.id === route.slice(5))
    view = a ? <AgreementWizard store={store} existing={a} notify={setToast} /> : <NotFound />
  } else if (route.startsWith('a-')) {
    const a = agreements.find((x) => x.id === route.slice(2))
    view = a ? <AgreementDetail a={a} store={store} notify={setToast} /> : <NotFound />
  } else if (route === 'brand') view = <Brand />
  else if (route === 'settings') view = <Settings store={store} notify={setToast} />
  else view = <NotFound />

  const nav = (name: string, label: string, count?: number) => {
    const on =
      route === name ||
      (name === 'agreements' && (route.startsWith('a-') || route.startsWith('edit-')))
    return (
      <a href={`#${name}`} className={on ? 'on' : ''}>
        {label}
        {count != null && <span className="count">{count}</span>}
      </a>
    )
  }

  return (
    <div className="shell">
      <aside className="side">
        <a href="#dashboard" style={{ textDecoration: 'none' }} aria-label="Stakeforward home">
          <Lockup size={26} />
        </a>
        <nav>
          {nav('dashboard', 'Dashboard')}
          {nav('agreements', 'Agreements', agreements.length)}
          {nav('brand', 'Brand')}
          {nav('settings', 'Settings')}
        </nav>
        <a href="#new" className="btn primary cta">
          + New agreement
        </a>
        <div className="foot">
          {active} active · stakeforward.com
          <br />
          Build now. Get paid forward.
        </div>
      </aside>
      <main>{view}</main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function NotFound() {
  return (
    <div className="empty">
      <h2>Nothing here</h2>
      <p>
        <a href="#dashboard">Back to the dashboard</a>
      </p>
    </div>
  )
}
