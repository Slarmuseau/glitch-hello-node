import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useData } from '../lib/hooks'
import { TYPE_FEEST_LABEL, formatDatum } from '../lib/calc'
import { Card, Stat, Badge } from '../components/ui'

export default function Overzicht(): JSX.Element {
  const nav = useNavigate()
  const dranken = useData(() => api.dranken.list())
  const forfaits = useData(() => api.forfaits.list())
  const feesten = useData(() => api.feesten.overzicht())
  const inst = useData(() => api.instellingen.get())

  const lijst = feesten.data ?? []
  const metKorting = lijst.filter((f) => f.korting_reden)

  return (
    <div>
      <div className="mb-8">
        {inst.data?.logo_pad && (
          <img
            src={inst.data.logo_pad}
            alt={inst.data.bedrijfsnaam || ''}
            className="h-20 max-w-[320px] object-contain mb-4"
          />
        )}
        <h1 className="text-3xl font-display text-ink">
          {inst.data?.bedrijfsnaam ? `Welkom, ${inst.data.bedrijfsnaam}` : 'Welkom bij Tapwijs'}
        </h1>
        <p className="text-ink-soft mt-2 max-w-2xl">
          Je drankprijzen, je forfaits en je marges — rustig op één plek. Pas je prijzen aan,
          registreer wat een feest dronk, en zie meteen wat het opbracht.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="cursor-pointer hover:shadow-lift transition-shadow" >
          <Link to="/dranken">
            <Stat label="Dranken" hint="prijzen en marges">
              {dranken.data?.length ?? '—'}
            </Stat>
          </Link>
        </Card>
        <Card className="cursor-pointer hover:shadow-lift transition-shadow">
          <Link to="/forfaits">
            <Stat label="Forfaits" hint="je drankpakketten">
              {forfaits.data?.length ?? '—'}
            </Stat>
          </Link>
        </Card>
        <Card className="cursor-pointer hover:shadow-lift transition-shadow">
          <Link to="/feesten">
            <Stat label="Feesten" hint="geboekt en geregistreerd">
              {lijst.length}
            </Stat>
          </Link>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wide">Recente feesten</h2>
            <button className="btn-primary" onClick={() => nav('/feesten')}>
              Naar feesten →
            </button>
          </div>
          <div className="space-y-2">
            {lijst.slice(0, 6).map((f) => (
              <Card
                key={f.id}
                className="py-3 cursor-pointer hover:shadow-lift transition-shadow"
              >
                <div
                  className="flex items-center justify-between"
                  onClick={() =>
                    nav(f.geregistreerd ? `/feesten/${f.id}/resultaat` : `/feesten/${f.id}`)
                  }
                >
                  <div>
                    <div className="font-medium text-ink">{f.naam}</div>
                    <div className="text-xs text-ink-faint">
                      {formatDatum(f.datum)} · {TYPE_FEEST_LABEL[f.type_feest] ?? f.type_feest} ·{' '}
                      {f.aantal_personen} pers.
                    </div>
                  </div>
                  {f.geregistreerd ? <Badge tone="good">resultaat</Badge> : <Badge>open</Badge>}
                </div>
              </Card>
            ))}
            {lijst.length === 0 && <p className="text-sm text-ink-faint">Nog geen feesten.</p>}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-2">Korting</h2>
          <Card>
            <Stat label="Feesten met korting" hint="lagere doelmarge dan standaard">
              {metKorting.length}
            </Stat>
            <div className="mt-4 space-y-2">
              {metKorting.slice(0, 5).map((f) => (
                <div key={f.id} className="text-sm">
                  <div className="text-ink">{f.naam}</div>
                  <div className="text-xs text-ink-faint">{f.korting_reden}</div>
                </div>
              ))}
              {metKorting.length === 0 && (
                <p className="text-sm text-ink-faint">Nog geen kortingen gegeven.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
