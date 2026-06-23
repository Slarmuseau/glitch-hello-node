import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useData } from '../lib/hooks'
import { TYPE_FEEST_LABEL, formatDatum } from '../lib/calc'
import ttmbLogo from '../assets/ttmb-logo.png'
import type { Drank } from '@shared/domain'

// A printable post-party sheet: every relevant drink and barrel with blank
// fields to fill in by hand. Print via the browser/OS dialog ("Save as PDF").
export default function PrintBlad(): JSX.Element {
  const { id } = useParams()
  const feestId = Number(id)
  const nav = useNavigate()

  const feest = useData(() => api.feesten.get(feestId), [feestId])
  const dranken = useData(() => api.dranken.list())
  const vaten = useData(() => api.vaten.list())
  const forfaits = useData(() => api.forfaits.list())
  const inst = useData(() => api.instellingen.get())

  const toegestaneIds = useMemo(() => {
    const ids = new Set<number>()
    for (const t of feest.data?.toewijzingen ?? []) {
      const f = (forfaits.data ?? []).find((x) => x.id === t.forfait_id)
      f?.toegestane_drank_ids.forEach((i) => ids.add(i))
    }
    return ids
  }, [feest.data, forfaits.data])

  if (feest.loading || dranken.loading || vaten.loading || forfaits.loading || inst.loading)
    return <div className="text-ink-faint">Laden…</div>
  if (!feest.data) return <div className="text-ink-faint">Feest niet gevonden.</div>

  const alle = dranken.data ?? []
  const teTonen = toegestaneIds.size > 0 ? alle.filter((d) => toegestaneIds.has(d.id)) : alle
  const vatMap = new Map((vaten.data ?? []).map((v) => [v.id, v]))

  const perStuk = teTonen.filter((d) => !d.is_cocktail && d.schenkwijze === 'per_stuk')
  const uitFles = teTonen.filter((d) => !d.is_cocktail && d.schenkwijze === 'uit_fles')
  const uitVat = teTonen.filter((d) => !d.is_cocktail && d.schenkwijze === 'uit_vat')
  const cocktails = teTonen.filter((d) => d.is_cocktail)

  return (
    <div>
      {/* Toolbar (not printed) */}
      <div className="no-print flex items-center justify-between mb-6">
        <button className="btn-ghost" onClick={() => nav(`/feesten/${feestId}`)}>
          ← Terug
        </button>
        <button className="btn-primary" onClick={() => window.print()}>
          Afdrukken / opslaan als PDF
        </button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between border-b border-ink/15 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-display text-ink">
            {inst.data?.bedrijfsnaam || 'Feestzaal'}
          </h1>
          <p className="text-sm text-ink-soft mt-1">Registratieblad — na het feest</p>
        </div>
        <img src={ttmbLogo} alt="" className="h-8 w-auto opacity-80" />
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm mb-8">
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-faint">Feest</div>
          <div className="text-ink">{feest.data.naam}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-faint">Type · datum</div>
          <div className="text-ink">
            {TYPE_FEEST_LABEL[feest.data.type_feest] ?? feest.data.type_feest} ·{' '}
            {formatDatum(feest.data.datum)}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-faint">Ingevuld door</div>
          <div className="invulvak !w-full" />
        </div>
      </div>

      {perStuk.length > 0 && (
        <Sectie titel="Per stuk — tel het leeggoed (1 leeg = 1 consumptie)">
          {perStuk.map((d) => (
            <Rij key={d.id} naam={d.naam} sub={`glas ${d.glaasgrootte_cl}cl`} velden={['aantal leeg']} />
          ))}
        </Sectie>
      )}

      {uitFles.length > 0 && (
        <Sectie titel="Uit fles — tel de lege flessen">
          {uitFles.map((d) => (
            <Rij
              key={d.id}
              naam={d.naam}
              sub={`fles ${d.fles_inhoud_cl ?? '—'}cl · glas ${d.glaasgrootte_cl}cl`}
              velden={['aantal flessen']}
            />
          ))}
        </Sectie>
      )}

      {uitVat.length > 0 && (
        <Sectie titel="Uit vat — vaten geopend en gewicht laatste vat">
          {uitVat.map((d) => {
            const vat = d.vat_id ? vatMap.get(d.vat_id) : undefined
            return (
              <Rij
                key={d.id}
                naam={d.naam}
                sub={vat ? `${vat.naam} · leeg ${vat.leeg_gewicht_kg}kg · ${vat.inhoud_liter}L` : 'geen vat'}
                velden={['aantal vaten', 'kg laatste vat']}
              />
            )
          })}
        </Sectie>
      )}

      {cocktails.length > 0 && (
        <Sectie titel="Cocktails & mocktails — turf bij bereiding">
          {cocktails.map((d) => (
            <Rij key={d.id} naam={d.naam} sub="geteld bij bereiding" velden={['aantal'] } />
          ))}
        </Sectie>
      )}

      <p className="text-xs text-ink-faint mt-8">
        Gemaakt met Tapwijs · To the Moon and Back
      </p>
    </div>
  )
}

function Sectie({ titel, children }: { titel: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="mb-6 break-inside-avoid">
      <h2 className="text-sm font-semibold text-ink uppercase tracking-wide mb-2 border-b border-ink/10 pb-1">
        {titel}
      </h2>
      <div>{children}</div>
    </div>
  )
}

function Rij({
  naam,
  sub,
  velden
}: {
  naam: Drank['naam']
  sub: string
  velden: string[]
}): JSX.Element {
  return (
    <div className="flex items-center justify-between py-2 border-b border-ink/10">
      <div>
        <div className="text-ink">{naam}</div>
        <div className="text-xs text-ink-faint">{sub}</div>
      </div>
      <div className="flex items-end gap-4">
        {velden.map((v) => (
          <div key={v} className="text-center">
            <div className="invulvak" />
            <div className="text-[10px] text-ink-faint mt-0.5">{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
