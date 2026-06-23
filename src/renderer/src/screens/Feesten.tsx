import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useData } from '../lib/hooks'
import { TYPE_FEEST_LABEL, formatDatum } from '../lib/calc'
import { PageHeader, Card, Badge, EmptyState } from '../components/ui'

export default function Feesten(): JSX.Element {
  const nav = useNavigate()
  const feesten = useData(() => api.feesten.overzicht())

  if (feesten.loading) return <div className="text-ink-faint">Laden…</div>
  const lijst = feesten.data ?? []

  const nieuw = async (): Promise<void> => {
    const snapshot = await api.snapshot.build()
    const f = await api.feesten.upsert({
      naam: 'Nieuw feest',
      type_feest: 'huwelijk',
      datum: new Date().toISOString().slice(0, 10),
      publiek: null,
      doelmarge: (await api.instellingen.get()).standaard_doelmarge,
      korting_reden: null,
      prijs_momentopname: snapshot,
      toewijzingen: []
    })
    nav(`/feesten/${f.id}`)
  }

  return (
    <div>
      <PageHeader
        title="Feesten"
        subtitle="Elk feest krijgt bij het opslaan een momentopname van je prijzen. Latere prijswijzigingen raken oude feesten nooit."
        actions={
          <button className="btn-primary" onClick={nieuw}>
            + Nieuw feest
          </button>
        }
      />

      {lijst.length === 0 ? (
        <EmptyState title="Nog geen feesten">
          Maak een feest aan, vul de toewijzingen in en registreer na afloop wat er gedronken is.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {lijst.map((f) => (
            <Card
              key={f.id}
              className="cursor-pointer hover:shadow-lift transition-shadow"
            >
              <div
                className="flex items-center justify-between"
                onClick={() => nav(`/feesten/${f.id}`)}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg text-ink">{f.naam}</h3>
                    <Badge tone="plum">{TYPE_FEEST_LABEL[f.type_feest] ?? f.type_feest}</Badge>
                    {f.korting_reden && <Badge tone="amber">korting</Badge>}
                  </div>
                  <div className="text-sm text-ink-soft mt-1">
                    {formatDatum(f.datum)} · {f.aantal_personen} personen
                    {f.forfait_namen.length > 0 && ` · ${f.forfait_namen.join(', ')}`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {f.geregistreerd ? (
                    <button
                      className="btn-outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        nav(`/feesten/${f.id}/resultaat`)
                      }}
                    >
                      Resultaat →
                    </button>
                  ) : (
                    <Badge>nog niet geregistreerd</Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
