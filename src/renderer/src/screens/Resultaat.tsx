import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useData } from '../lib/hooks'
import { SCHENKWIJZE_LABEL } from '../lib/calc'
import { PageHeader, Card, Stat, Badge, EmptyState } from '../components/ui'
import { formatEuro, formatNumber, formatPercent } from '@shared/domain'

export default function Resultaat(): JSX.Element {
  const { id } = useParams()
  const feestId = Number(id)
  const nav = useNavigate()
  const data = useData(() => api.resultaat.build(feestId), [feestId])
  const feest = useData(() => api.feesten.get(feestId), [feestId])

  if (data.loading || feest.loading) return <div className="text-ink-faint">Laden…</div>
  if (!data.data || !feest.data)
    return <EmptyState title="Geen resultaat">Registreer eerst wat er gedronken is.</EmptyState>

  const { resultaat: r, toelichtingen } = data.data
  const gehaald = r.marge_gehaald
  const meerDanVerwacht = r.consumpties_verschil_per_persoon

  return (
    <div>
      <PageHeader
        title={`Resultaat — ${feest.data.naam}`}
        subtitle="De forfaitmarge die je echt maakte, met de cijfers erachter. Geen zwarte doos."
        actions={
          <button className="btn-outline" onClick={() => nav(`/feesten/${feestId}`)}>
            ← Terug naar feest
          </button>
        }
      />

      {/* HEADLINE */}
      <Card
        className={`mb-5 border-2 ${
          gehaald ? 'border-sage-400/50 bg-sage-400/5' : 'border-clay-400/40 bg-clay-400/5'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-ink-faint">Forfaitmarge</div>
            <div
              className={`text-5xl font-display tabular mt-1 ${
                gehaald ? 'text-sage-600' : 'text-clay-500'
              }`}
            >
              {formatPercent(r.forfaitmarge)}
            </div>
            <div className="text-sm text-ink-soft mt-2">
              {gehaald ? '✓ Doelmarge gehaald' : '✗ Doelmarge niet gehaald'} · doel{' '}
              {formatPercent(r.doelmarge)} ({r.marge_verschil >= 0 ? '+' : ''}
              {formatPercent(r.marge_verschil)})
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-ink-faint">Resultaat</div>
            <div className="text-3xl font-display tabular text-ink mt-1">{formatEuro(r.resultaat)}</div>
            <div className="text-sm text-ink-soft mt-1">
              omzet {formatEuro(r.forfait_omzet)} − kost {formatEuro(r.totaal_inkoopkost)}
            </div>
          </div>
        </div>
      </Card>

      {/* STATS GRID */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <Card>
          <Stat label="Personen" hint={`${formatNumber(r.totaal_consumpties, 0)} consumpties`}>
            {formatNumber(r.aantal_personen, 0)}
          </Stat>
        </Card>
        <Card>
          <Stat
            label="Richtprijs achteraf"
            hint="om net je doelmarge te halen"
            tone={r.hindsight_prijs_per_persoon <= avgPrijs(r) ? 'good' : 'bad'}
          >
            {formatEuro(r.hindsight_prijs_per_persoon)}
          </Stat>
        </Card>
        <Card>
          <Stat
            label="À la carte"
            hint={`forfait ${r.alacarte_verschil >= 0 ? 'won' : 'gaf toe'} ${formatEuro(Math.abs(r.alacarte_verschil))}`}
          >
            {formatEuro(r.alacarte_omzet)}
          </Stat>
        </Card>
        <Card>
          <Stat
            label="Per hoofd gedronken"
            tone={meerDanVerwacht > 0 ? 'bad' : 'good'}
            hint={`verwacht ${formatNumber(r.verwachte_consumpties_per_persoon)} · ${
              meerDanVerwacht >= 0 ? '+' : ''
            }${formatNumber(meerDanVerwacht)}`}
          >
            {formatNumber(r.werkelijke_consumpties_per_persoon)}
          </Stat>
        </Card>
      </div>

      {/* A-LA-CARTE EXPLAINER */}
      <Card className="mb-5">
        <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-3">
          Forfait versus à la carte
        </h2>
        <div className="flex items-end gap-8">
          <div>
            <div className="text-xs text-ink-faint">Forfait-omzet</div>
            <div className="text-2xl font-display tabular text-ink">{formatEuro(r.forfait_omzet)}</div>
          </div>
          <div>
            <div className="text-xs text-ink-faint">Als per glas verkocht</div>
            <div className="text-2xl font-display tabular text-ink-soft">{formatEuro(r.alacarte_omzet)}</div>
          </div>
          <div>
            <div className="text-xs text-ink-faint">Verschil</div>
            <div
              className={`text-2xl font-display tabular ${
                r.alacarte_verschil >= 0 ? 'text-sage-600' : 'text-clay-500'
              }`}
            >
              {r.alacarte_verschil >= 0 ? '+' : ''}
              {formatEuro(r.alacarte_verschil)}
            </div>
          </div>
        </div>
        <p className="text-xs text-ink-faint mt-3">
          De gok onder het forfait: lichte drinkers winnen, zware drinkers geven terug. Het verschil
          is je winst — of je verlies.
        </p>
      </Card>

      {/* THE WORKING */}
      <Card>
        <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-3">
          De berekening, regel per regel
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-faint border-b border-cream-deep">
              <th className="py-2 pr-3 font-medium">Drank</th>
              <th className="py-2 px-3 font-medium">Meting → consumpties</th>
              <th className="py-2 px-3 font-medium text-right">Consumpties</th>
              <th className="py-2 px-3 font-medium text-right">Inkoopkost</th>
              <th className="py-2 pl-3 font-medium text-right">À la carte</th>
            </tr>
          </thead>
          <tbody>
            {r.regels.map((regel) => {
              const toel = toelichtingen.find((t) => t.drank_id === regel.drank_id)
              return (
                <tr key={regel.drank_id} className="border-b border-cream-deep/60 last:border-0 align-top">
                  <td className="py-2.5 pr-3">
                    <div className="font-medium text-ink">{regel.naam}</div>
                    <div className="text-[11px] text-ink-faint">
                      {toel ? SCHENKWIJZE_LABEL[toel.schenkwijze] ?? toel.schenkwijze : ''}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-ink-soft">
                    {toel?.meting && <div>{toel.meting}</div>}
                    {toel?.berekening && <div className="text-ink-faint">{toel.berekening}</div>}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular">{formatNumber(regel.consumpties, 0)}</td>
                  <td className="py-2.5 px-3 text-right tabular text-ink-soft">
                    {formatEuro(regel.inkoopkost)}
                  </td>
                  <td className="py-2.5 pl-3 text-right tabular">{formatEuro(regel.alacarte_omzet)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="font-medium">
              <td className="py-3 pr-3" colSpan={2}>
                Totaal
              </td>
              <td className="py-3 px-3 text-right tabular">{formatNumber(r.totaal_consumpties, 0)}</td>
              <td className="py-3 px-3 text-right tabular">{formatEuro(r.totaal_inkoopkost)}</td>
              <td className="py-3 pl-3 text-right tabular">{formatEuro(r.alacarte_omzet)}</td>
            </tr>
          </tfoot>
        </table>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge>forfaitmarge = (omzet − inkoopkost) ÷ omzet</Badge>
          <Badge tone={gehaald ? 'good' : 'bad'}>
            ({formatEuro(r.forfait_omzet)} − {formatEuro(r.totaal_inkoopkost)}) ÷{' '}
            {formatEuro(r.forfait_omzet)} = {formatPercent(r.forfaitmarge)}
          </Badge>
        </div>
      </Card>
    </div>
  )
}

// Average forfait price per head, for tinting the hindsight stat.
function avgPrijs(r: { forfait_omzet: number; aantal_personen: number }): number {
  return r.aantal_personen > 0 ? r.forfait_omzet / r.aantal_personen : 0
}
