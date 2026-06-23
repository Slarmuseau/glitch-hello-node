import { useState } from 'react'
import { api } from '../lib/api'
import { useData } from '../lib/hooks'
import { formatDatum } from '../lib/calc'
import { PageHeader, Card, Badge, EmptyState } from '../components/ui'
import { formatEuro, formatNumber, formatPercent } from '@shared/domain'

type Report =
  | 'feest_ranking'
  | 'per_type'
  | 'per_forfait'
  | 'per_drank'
  | 'per_feest'
  | 'korting'

const REPORTS: { value: Report; label: string }[] = [
  { value: 'feest_ranking', label: 'Ranking van feesten (beste → slechtste marge)' },
  { value: 'per_forfait', label: 'Per forfait (beste → slechtste)' },
  { value: 'per_type', label: 'Per type feest' },
  { value: 'per_drank', label: 'Per drank (overall)' },
  { value: 'per_feest', label: 'Per feest (detail)' },
  { value: 'korting', label: 'Korting-overzicht' }
]

function MargeBadge({ value }: { value: number }): JSX.Element {
  return (
    <Badge tone={value >= 0 ? 'good' : 'bad'}>
      {value >= 0 ? '+' : ''}
      {formatPercent(value)}
    </Badge>
  )
}

const TH = 'px-3 py-2 font-medium'
const TD = 'px-3 py-2.5'

export default function Rapporten(): JSX.Element {
  const inzichten = useData(() => api.inzichten.build())
  const feesten = useData(() => api.feesten.overzicht())
  const [report, setReport] = useState<Report>('feest_ranking')
  const [feestId, setFeestId] = useState<number | null>(null)

  if (inzichten.loading || feesten.loading) return <div className="text-ink-faint">Laden…</div>
  const d = inzichten.data
  if (!d || d.aantal_feesten === 0) {
    return (
      <div>
        <PageHeader title="Rapporten" subtitle="Vraag specifieke rapporten op." />
        <EmptyState title="Nog te weinig gegevens">
          Registreer eerst enkele feesten; dan kun je hier rapporten samenstellen.
        </EmptyState>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Rapporten"
        subtitle="Kies een rapport. De cijfers spreken voor zich."
        actions={
          <select
            className="input w-auto"
            value={report}
            onChange={(e) => setReport(e.target.value as Report)}
          >
            {REPORTS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        }
      />

      {report === 'feest_ranking' && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-faint border-b border-cream-deep">
                <th className={TH}>#</th>
                <th className={TH}>Feest</th>
                <th className={TH}>Datum</th>
                <th className={`${TH} text-right`}>Personen</th>
                <th className={`${TH} text-right`}>Marge vs per glas</th>
                <th className={`${TH} text-right`}>Verschil €</th>
              </tr>
            </thead>
            <tbody>
              {d.feestRanking.map((f, i) => (
                <tr key={f.feest_id} className="border-b border-cream-deep/60 last:border-0">
                  <td className={`${TD} text-ink-faint`}>{i + 1}</td>
                  <td className={TD}>
                    <span className="text-ink">{f.naam}</span>{' '}
                    <Badge tone="plum">{f.label}</Badge>
                  </td>
                  <td className={`${TD} text-ink-soft`}>{formatDatum(f.datum)}</td>
                  <td className={`${TD} text-right tabular`}>{f.aantal_personen}</td>
                  <td className={`${TD} text-right`}>
                    <MargeBadge value={f.forfaitmarge} />
                  </td>
                  <td className={`${TD} text-right tabular`}>{formatEuro(f.alacarte_verschil)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {report === 'per_forfait' && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-faint border-b border-cream-deep">
                <th className={TH}>Forfait</th>
                <th className={`${TH} text-right`}>Feesten</th>
                <th className={`${TH} text-right`}>Ondergrens gehaald</th>
                <th className={`${TH} text-right`}>Gem. marge vs per glas</th>
                <th className={`${TH} text-right`}>Richtprijs historiek</th>
              </tr>
            </thead>
            <tbody>
              {d.forfaitPrestatie.map((f) => (
                <tr key={f.forfait_id} className="border-b border-cream-deep/60 last:border-0">
                  <td className={`${TD} text-ink`}>{f.forfait_naam}</td>
                  <td className={`${TD} text-right tabular`}>{f.aantal_feesten}</td>
                  <td className={`${TD} text-right tabular`}>
                    {f.aantal_gehaald}/{f.aantal_feesten}
                  </td>
                  <td className={`${TD} text-right`}>
                    <MargeBadge value={f.gemiddelde_marge} />
                  </td>
                  <td className={`${TD} text-right tabular text-ink-soft`}>
                    {f.richtprijs_historiek != null ? formatEuro(f.richtprijs_historiek) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {report === 'per_type' && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-faint border-b border-cream-deep">
                <th className={TH}>Type feest</th>
                <th className={`${TH} text-right`}>Feesten</th>
                <th className={`${TH} text-right`}>Gem. marge vs per glas</th>
                <th className={`${TH} text-right`}>Verwacht / hoofd</th>
                <th className={`${TH} text-right`}>Werkelijk / hoofd</th>
              </tr>
            </thead>
            <tbody>
              {d.typePrestatie.map((t) => (
                <tr key={t.type_feest} className="border-b border-cream-deep/60 last:border-0">
                  <td className={`${TD} text-ink`}>{t.label}</td>
                  <td className={`${TD} text-right tabular`}>{t.aantal_feesten}</td>
                  <td className={`${TD} text-right`}>
                    <MargeBadge value={t.gemiddelde_marge} />
                  </td>
                  <td className={`${TD} text-right tabular text-ink-soft`}>
                    {formatNumber(t.gemiddeld_verwacht_per_hoofd)}
                  </td>
                  <td className={`${TD} text-right tabular`}>
                    {formatNumber(t.gemiddeld_werkelijk_per_hoofd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {report === 'per_drank' && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-faint border-b border-cream-deep">
                <th className={TH}>Drank</th>
                <th className={TH}>Categorie</th>
                <th className={`${TH} text-right`}>Consumpties</th>
                <th className={`${TH} text-right`}>Aandeel</th>
                <th className={`${TH} text-right`}>Omzet (per glas)</th>
                <th className={`${TH} text-right`}>Inkoopkost</th>
              </tr>
            </thead>
            <tbody>
              {d.drankRanking.map((x) => (
                <tr key={x.drank_id} className="border-b border-cream-deep/60 last:border-0">
                  <td className={`${TD} text-ink`}>{x.naam}</td>
                  <td className={`${TD} text-ink-soft`}>{x.categorie}</td>
                  <td className={`${TD} text-right tabular`}>{formatNumber(x.consumpties, 0)}</td>
                  <td className={`${TD} text-right tabular text-ink-soft`}>
                    {formatPercent(x.aandeel_consumpties)}
                  </td>
                  <td className={`${TD} text-right tabular`}>{formatEuro(x.omzet)}</td>
                  <td className={`${TD} text-right tabular text-ink-soft`}>{formatEuro(x.inkoopkost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {report === 'korting' && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-faint border-b border-cream-deep">
                <th className={TH}>Reden</th>
                <th className={`${TH} text-right`}>Feesten</th>
                <th className={`${TH} text-right`}>Weggegeven</th>
              </tr>
            </thead>
            <tbody>
              {d.kortingLedger.length === 0 && (
                <tr>
                  <td className={`${TD} text-ink-faint`} colSpan={3}>
                    Nog geen kortingen gegeven.
                  </td>
                </tr>
              )}
              {d.kortingLedger.map((k) => (
                <tr key={k.reden} className="border-b border-cream-deep/60 last:border-0">
                  <td className={`${TD} text-ink`}>{k.reden}</td>
                  <td className={`${TD} text-right tabular`}>{k.aantal_feesten}</td>
                  <td className={`${TD} text-right`}>
                    <Badge tone="amber">{formatEuro(k.weggegeven)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {report === 'per_feest' && (
        <PerFeestRapport
          feesten={(feesten.data ?? []).filter((f) => f.geregistreerd)}
          feestId={feestId}
          onPick={setFeestId}
        />
      )}
    </div>
  )
}

function PerFeestRapport({
  feesten,
  feestId,
  onPick
}: {
  feesten: { id: number; naam: string; datum: string }[]
  feestId: number | null
  onPick: (id: number) => void
}): JSX.Element {
  const data = useData(
    () => (feestId ? api.resultaat.build(feestId) : Promise.resolve(null)),
    [feestId]
  )

  return (
    <div>
      <Card className="mb-4">
        <label className="label">Kies een feest</label>
        <select
          className="input max-w-md"
          value={feestId ?? ''}
          onChange={(e) => onPick(Number(e.target.value))}
        >
          <option value="">— kies —</option>
          {feesten.map((f) => (
            <option key={f.id} value={f.id}>
              {f.naam} ({formatDatum(f.datum)})
            </option>
          ))}
        </select>
      </Card>

      {feestId && data.data && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <Card>
              <div className="text-xs uppercase tracking-wide text-ink-faint">Marge vs per glas</div>
              <div className="text-2xl font-display tabular mt-1">
                {data.data.resultaat.forfaitmarge >= 0 ? '+' : ''}
                {formatPercent(data.data.resultaat.forfaitmarge)}
              </div>
            </Card>
            <Card>
              <div className="text-xs uppercase tracking-wide text-ink-faint">Forfait-omzet</div>
              <div className="text-2xl font-display tabular mt-1">
                {formatEuro(data.data.resultaat.forfait_omzet)}
              </div>
            </Card>
            <Card>
              <div className="text-xs uppercase tracking-wide text-ink-faint">Per glas</div>
              <div className="text-2xl font-display tabular mt-1">
                {formatEuro(data.data.resultaat.alacarte_omzet)}
              </div>
            </Card>
            <Card>
              <div className="text-xs uppercase tracking-wide text-ink-faint">Per hoofd</div>
              <div className="text-2xl font-display tabular mt-1">
                {formatNumber(data.data.resultaat.werkelijke_consumpties_per_persoon)}
              </div>
            </Card>
          </div>

          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ink-faint border-b border-cream-deep">
                  <th className={TH}>Drank</th>
                  <th className={`${TH} text-right`}>Consumpties</th>
                  <th className={`${TH} text-right`}>Inkoopkost</th>
                  <th className={`${TH} text-right`}>À la carte</th>
                </tr>
              </thead>
              <tbody>
                {data.data.resultaat.regels.map((regel) => (
                  <tr key={regel.drank_id} className="border-b border-cream-deep/60 last:border-0">
                    <td className={`${TD} text-ink`}>{regel.naam}</td>
                    <td className={`${TD} text-right tabular`}>{formatNumber(regel.consumpties, 0)}</td>
                    <td className={`${TD} text-right tabular text-ink-soft`}>
                      {formatEuro(regel.inkoopkost)}
                    </td>
                    <td className={`${TD} text-right tabular`}>{formatEuro(regel.alacarte_omzet)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
