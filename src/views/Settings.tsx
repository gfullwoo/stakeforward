import { useState } from 'react'
import type { AppData } from '../types'
import type { useStore } from '../lib/store'
import { copyText, Modal } from '../components/ui'

type Store = ReturnType<typeof useStore>

export default function Settings({ store, notify }: { store: Store; notify: (s: string) => void }) {
  const [p, setP] = useState(store.data.profile)
  const [importText, setImportText] = useState('')
  const [confirm, setConfirm] = useState<null | 'reset' | 'clear'>(null)

  function doImport(text: string) {
    try {
      const d = JSON.parse(text) as AppData
      if (d.version !== 1 || !Array.isArray(d.agreements)) throw new Error()
      store.replaceAll(d)
      setP(d.profile)
      notify(`Imported ${d.agreements.length} agreements`)
      setImportText('')
    } catch {
      notify("That doesn't look like a Stakeforward export")
    }
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Settings</h1>
          <p>Your details fill in the provider side of new agreements. Data is saved in this browser; export it to back it up or move it.</p>
        </div>
      </div>

      <div className="card stack" style={{ maxWidth: 640 }}>
        <h3>Your details</h3>
        <div className="grid g2">
          <label className="f">Name<input type="text" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></label>
          <label className="f">Business<input type="text" value={p.business} onChange={(e) => setP({ ...p, business: e.target.value })} /></label>
        </div>
        <label className="f">Email<input type="email" value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} /></label>
        <div className="row">
          <button className="btn primary" onClick={() => { store.setProfile(p); notify('Saved') }}>Save</button>
        </div>
      </div>

      <div className="card stack" style={{ maxWidth: 640 }}>
        <h3>Back up and restore</h3>
        <div className="row">
          <button className="btn" onClick={async () => notify((await copyText(JSON.stringify(store.data, null, 2))) ? 'Export copied to clipboard' : 'Copy was blocked by the browser')}>
            Copy export (JSON)
          </button>
          <label className="btn">
            Import from file
            <input type="file" accept="application/json" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) doImport(await f.text()) }} />
          </label>
        </div>
        <label className="f">
          Or paste an export
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder='{"version":1,...}' />
        </label>
        <div className="row">
          <button className="btn" disabled={!importText.trim()} onClick={() => doImport(importText)}>Import pasted data</button>
        </div>
      </div>

      <div className="card stack" style={{ maxWidth: 640 }}>
        <h3>Sample data</h3>
        <p className="muted" style={{ margin: 0 }}>The app starts with three example agreements so you can see how it works.</p>
        <div className="row">
          <button className="btn" onClick={() => setConfirm('reset')}>Restore examples</button>
          <button className="btn danger" onClick={() => setConfirm('clear')}>Remove all agreements</button>
        </div>
      </div>

      {confirm && (
        <Modal title={confirm === 'reset' ? 'Replace everything with the examples?' : 'Remove all agreements?'} onClose={() => setConfirm(null)}>
          <p>This replaces what's saved in this browser. Copy an export first if you want to keep it.</p>
          <div className="row">
            <span className="spacer" />
            <button className="btn" onClick={() => setConfirm(null)}>Cancel</button>
            <button
              className="btn primary"
              onClick={() => {
                if (confirm === 'reset') store.reset()
                else store.clear()
                setConfirm(null)
                notify('Done')
              }}
            >
              Continue
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
