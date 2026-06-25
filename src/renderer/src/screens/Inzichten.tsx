import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useData } from '../lib/hooks'
import { PageHeader, Card, Stat, Badge, EmptyState } from '../components/ui'
import { formatEuro, formatNumber, formatPercent } from '@shared/domain'

const AMBER = '#c2741f'
const SAGE = '#587a52'
const PLUM = '#623f5a'

export default function Inzichten(): JSX.Element {
  const inzichten = useData(() => api.inzichten.build())

  if (inzichten.loading) return <div className="text-ink-faint">Laden…</div>
  const d = inzichten.data
  if (!d || d.aantal_feesten === 0) {
    return (
      <div>
        <PageHeader title="Inzichten" subtitle="Feiten en cijfers over al je feesten heen." />
        <EmptyState title="Nog te weinig gegevens">
          Registreer een paar feesten. Zodra er geschiedenis is, verschijnen hier de cijfers.
        </EmptyState>
      </div>
    )
  }

  const topDranken = d.drankRanking.slice(0, 10).map((x) => ({
    naam: x.naam,
    consumpties: Math.round(x.consumpties)
  }))

  const alc = d.alcohol.alcoholisch
  const nonalc = d.alcohol.nonalcoholisch
  const totCons = alc.consumpties + nonalc.consumpties
  const alcPct = totCons > 0 ? alc.consumpties / totCons : 0

  return (
    <div>
      <PageHeader
        title="Inzichten"
        subtitle={`Cijfers over ${d.aantal_feesten} geregistreerde feesten. Voor specifieke rapporten, zie `}
        actions={
          <Link to="/rapporten" className="btn-outline">
            Rapporten →
          </Link>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <Card>
          <Stat label="Marge t.o.v. per glas" tone={d.globale_marge >= 0 ? 'good' : 'bad'}>
            {d.globale_marge >= 0 ? '+' : ''}
            {formatPercent(d.globale_marge)}
          </Stat>
        </Card>
        <Card>
          <Stat label="Consumpties / persoon">{formatNumber(d.consumpties_per_persoon)}</Stat>
        </Card>
        <Card>
          <Stat label="Forfait-omzet" hint={`per glas ${formatEuro(d.totaal_alacarte)}`}>
            {formatEuro(d.totaal_omzet)}
          </Stat>
        </Card>
        <Card>
          <Stat label="Resultaat vs inkoop" hint="2de inzicht">
            {formatEuro(d.globaal_resultaat)}
          </Stat>
        </Card>
        <Card>
          <Stat label="Weggegeven via korting">{formatEuro(d.kortingTotaal)}</Stat>
        </Card>
      </div>

      {/* ALCOHOL SPLIT */}
      <Card className="mb-6">
        <h3 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-3">
          Alcoholisch versus non-alcoholisch
        </h3>
        <div className="flex h-3 rounded-full overflow-hidden mb-3">
          <div className="bg-plum-500" style={{ width: `${alcPct * 100}%` }} />
          <div className="bg-sage-500" style={{ width: `${(1 - alcPct) * 100}%` }} />
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-plum-500" />
              <span className="text-ink font-medium">Alcoholisch</span>
              <Badge tone="plum">{formatPercent(alcPct)}</Badge>
            </div>
            <div className="text-ink-soft mt-1">
              {formatNumber(alc.consumpties, 0)} consumpties · {formatEuro(alc.omzet)} (per glas)
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-sage-500" />
              <span className="text-ink font-medium">Non-alcoholisch</span>
              <Badge tone="good">{formatPercent(1 - alcPct)}</Badge>
            </div>
            <div className="text-ink-soft mt-1">
              {formatNumber(nonalc.consumpties, 0)} consumpties · {formatEuro(nonalc.omzet)} (per glas)
            </div>
          </div>
        </div>
      </Card>

      {/* CHART + MARGIN TO PROMOTE */}
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
          <h3 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-1">
            Hoogste marge per drankje
          </h3>
          <p className="text-xs text-ink-faint mb-3">Kandidaten om te promoten (prijzen van vandaag).</p>
          <ol className="space-y-2">
            {d.margeRanking.slice(0, 8).map((m) => (
              <li key={m.drank_id} className="flex items-center justify-between text-sm">
                <span className="text-ink">{m.naam}</span>
                <span className="flex items-center gap-2">
                  <span className="text-ink-faint text-xs">{formatPercent(m.marge_pct)}</span>
                  <Badge tone="good">{formatEuro(m.marge_per_glas)}/glas</Badge>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* CATEGORY MIX + RARE */}
      <div className="grid grid-cols-2 gap-5">
        <Card>
          <h3 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-4">
            Consumpties per categorie
          </h3>
          <ResponsiveContainer width="100%" height={Math.max(200, d.categorieMix.length * 28)}>
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
                formatter={(v: number) => [`${formatNumber(v, 0)} consumpties`, '']}
                contentStyle={{ borderRadius: 12, border: '1px solid #f3ebe0', fontSize: 12 }}
              />
              <Bar dataKey="consumpties" radius={[0, 6, 6, 0]}>
                {d.categorieMix.map((_, i) => (
                  <Cell key={i} fill={i % 2 ? SAGE : PLUM} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-1">
            Bijna nooit geschonken
          </h3>
          <p className="text-xs text-ink-faint mb-3">Weinig in trek over alle feesten.</p>
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
    </div>
  )
}
