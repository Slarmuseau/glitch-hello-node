import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { api, type Advies } from '../lib/api'
import { useData } from '../lib/hooks'
import { PageHeader, Card, Stat, Badge, EmptyState } from '../components/ui'
import { formatEuro, formatNumber, formatPercent } from '@shared/domain'

const AMBER = '#c2741f'
const SAGE = '#587a52'

export default function Inzichten(): JSX.Element {
  const inzichten = useData(() => api.inzichten.build())

  if (inzichten.loading) return <div className="text-ink-faint">Laden…</div>
  const d = inzichten.data
  if (!d || d.aantal_feesten === 0) {
    return (
      <div>
        <PageHeader title="Inzichten" subtitle="Conclusies en advies over al je feesten heen." />
        <EmptyState title="Nog te weinig gegevens">
          Registreer een paar feesten. Zodra er geschiedenis is, trekt Tapwijs hier conclusies en
          geeft het advies.
        </EmptyState>
      </div>
    )
  }

  const topDranken = d.drankRanking.slice(0, 10).map((x) => ({
    naam: x.naam,
    consumpties: Math.round(x.consumpties),
    kost: x.inkoopkost
  }))

  return (
    <div>
      <PageHeader
        title="Inzichten"
        subtitle={`Conclusies over ${d.aantal_feesten} geregistreerde feesten. Wat goed loopt, wat aandacht vraagt, en wat je eraan kan doen.`}
      />

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <Stat label="Globale marge" tone={d.globale_marge >= 0 ? 'good' : 'bad'}>
            {formatPercent(d.globale_marge)}
          </Stat>
        </Card>
        <Card>
          <Stat label="Totaal resultaat" hint="omzet − inkoopkost">
            {formatEuro(d.globaal_resultaat)}
          </Stat>
        </Card>
        <Card>
          <Stat label="Omzet" hint={`kost ${formatEuro(d.totaal_kost)}`}>
            {formatEuro(d.totaal_omzet)}
          </Stat>
        </Card>
        <Card>
          <Stat label="Weggegeven via korting" hint="bewuste keuze">
            {formatEuro(d.kortingTotaal)}
          </Stat>
        </Card>
      </div>

      {/* ADVICE */}
      <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-2">Advies</h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {d.advies.map((a, i) => (
          <AdviesKaart key={i} advies={a} />
        ))}
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        <Card>
          <h3 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-4">
            Meest gedronken
          </h3>
          <ResponsiveContainer width="100%" height={Math.max(220, topDranken.length * 28)}>
            <BarChart data={topDranken} layout="vertical" margin={{ left: 20, right: 16 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="naam"
                width={130}
                tick={{ fontSize: 12, fill: '#5a504a' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(v: number) => [`${formatNumber(v, 0)} consumpties`, '']}
                contentStyle={{ borderRadius: 12, border: '1px solid #f3ebe0', fontSize: 12 }}
              />
              <Bar dataKey="consumpties" radius={[0, 6, 6, 0]} fill={AMBER} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-4">
            Inkoopkost per categorie
          </h3>
          <ResponsiveContainer width="100%" height={Math.max(220, d.categorieMix.length * 28)}>
            <BarChart data={d.categorieMix} layout="vertical" margin={{ left: 20, right: 16 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="categorie"
                width={130}
                tick={{ fontSize: 12, fill: '#5a504a' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(v: number) => [formatEuro(v), 'inkoopkost']}
                contentStyle={{ borderRadius: 12, border: '1px solid #f3ebe0', fontSize: 12 }}
              />
              <Bar dataKey="inkoopkost" radius={[0, 6, 6, 0]}>
                {d.categorieMix.map((_, i) => (
                  <Cell key={i} fill={i % 2 ? SAGE : '#623f5a'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* RISK + RARE */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        <Card>
          <h3 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-1">
            Dranken die je marge belasten
          </h3>
          <p className="text-xs text-ink-faint mb-3">Hoogste totale inkoopkost over alle feesten.</p>
          <ol className="space-y-2">
            {[...d.drankRanking]
              .sort((a, b) => b.inkoopkost - a.inkoopkost)
              .slice(0, 6)
              .map((x) => (
                <li key={x.drank_id} className="flex items-center justify-between text-sm">
                  <span className="text-ink">{x.naam}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-ink-faint text-xs">
                      {formatEuro(x.kost_per_consumptie)}/cons.
                    </span>
                    <Badge tone="bad">{formatEuro(x.inkoopkost)}</Badge>
                  </span>
                </li>
              ))}
          </ol>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-1">
            Bijna nooit geschonken
          </h3>
          <p className="text-xs text-ink-faint mb-3">Kandidaten om te schrappen of te promoten.</p>
          <ol className="space-y-2">
            {d.zeldenGedronken.map((x) => (
              <li key={x.drank_id} className="flex items-center justify-between text-sm">
                <span className="text-ink">{x.naam}</span>
                <Badge>{formatNumber(x.consumpties, 0)} cons.</Badge>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* PER FORFAIT */}
      <Card className="mb-6">
        <h3 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-3">
          Prestatie per forfait
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-faint border-b border-cream-deep">
              <th className="py-2 pr-3 font-medium">Forfait</th>
              <th className="py-2 px-3 font-medium text-right">Feesten</th>
              <th className="py-2 px-3 font-medium text-right">Ondergrens gehaald</th>
              <th className="py-2 px-3 font-medium text-right">Gem. marge</th>
              <th className="py-2 pl-3 font-medium text-right">Richtprijs historiek</th>
            </tr>
          </thead>
          <tbody>
            {d.forfaitPrestatie.map((f) => {
              const ratio = f.aantal_feesten > 0 ? f.aantal_gehaald / f.aantal_feesten : 0
              return (
                <tr key={f.forfait_id} className="border-b border-cream-deep/60 last:border-0">
                  <td className="py-2.5 pr-3 text-ink">{f.forfait_naam}</td>
                  <td className="py-2.5 px-3 text-right tabular">{f.aantal_feesten}</td>
                  <td className="py-2.5 px-3 text-right">
                    <Badge tone={ratio >= 0.6 ? 'good' : 'bad'}>
                      {f.aantal_gehaald}/{f.aantal_feesten}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-right tabular">{formatPercent(f.gemiddelde_marge)}</td>
                  <td className="py-2.5 pl-3 text-right tabular text-ink-soft">
                    {f.richtprijs_historiek != null ? formatEuro(f.richtprijs_historiek) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      {/* PER TYPE */}
      <Card className="mb-6">
        <h3 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-3">
          Per type feest
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-faint border-b border-cream-deep">
              <th className="py-2 pr-3 font-medium">Type</th>
              <th className="py-2 px-3 font-medium text-right">Feesten</th>
              <th className="py-2 px-3 font-medium text-right">Gem. marge</th>
              <th className="py-2 px-3 font-medium text-right">Verwacht / hoofd</th>
              <th className="py-2 pl-3 font-medium text-right">Werkelijk / hoofd</th>
            </tr>
          </thead>
          <tbody>
            {d.typePrestatie.map((t) => (
              <tr key={t.type_feest} className="border-b border-cream-deep/60 last:border-0">
                <td className="py-2.5 pr-3 text-ink">{t.label}</td>
                <td className="py-2.5 px-3 text-right tabular">{t.aantal_feesten}</td>
                <td className="py-2.5 px-3 text-right tabular">{formatPercent(t.gemiddelde_marge)}</td>
                <td className="py-2.5 px-3 text-right tabular text-ink-soft">
                  {formatNumber(t.gemiddeld_verwacht_per_hoofd)}
                </td>
                <td className="py-2.5 pl-3 text-right tabular">
                  <span
                    className={
                      t.gemiddeld_werkelijk_per_hoofd > t.gemiddeld_verwacht_per_hoofd
                        ? 'text-clay-500'
                        : 'text-sage-600'
                    }
                  >
                    {formatNumber(t.gemiddeld_werkelijk_per_hoofd)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* KORTING LEDGER */}
      {d.kortingLedger.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-1">
            Korting-overzicht
          </h3>
          <p className="text-xs text-ink-faint mb-3">
            Margebuffer die je dit jaar bewust weggaf, per reden. Een vage vrijgevigheid wordt een
            getal om trots op te zijn.
          </p>
          <ul className="space-y-2">
            {d.kortingLedger.map((k) => (
              <li key={k.reden} className="flex items-center justify-between text-sm">
                <span className="text-ink">
                  {k.reden} <span className="text-ink-faint">· {k.aantal_feesten} feest(en)</span>
                </span>
                <Badge tone="amber">{formatEuro(k.weggegeven)}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function AdviesKaart({ advies }: { advies: Advies }): JSX.Element {
  const stijl =
    advies.tone === 'goed'
      ? { border: 'border-l-sage-500', badge: 'good' as const, label: 'Goed' }
      : advies.tone === 'let_op'
        ? { border: 'border-l-clay-500', badge: 'bad' as const, label: 'Let op' }
        : { border: 'border-l-amber-400', badge: 'amber' as const, label: 'Tip' }
  return (
    <div className={`card p-4 border-l-4 ${stijl.border}`}>
      <Badge tone={stijl.badge}>{stijl.label}</Badge>
      <p className="text-sm text-ink mt-2">{advies.tekst}</p>
    </div>
  )
}
