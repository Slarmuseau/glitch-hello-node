import { PageHeader, Card } from '../components/ui'

export default function Over(): JSX.Element {
  return (
    <div>
      <PageHeader title="Over Tapwijs" />
      <Card className="max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-500 text-white grid place-items-center font-display text-2xl shadow-soft">
            T
          </div>
          <div>
            <div className="font-display text-xl text-ink">Tapwijs</div>
            <div className="text-sm text-ink-faint">drank · forfait · marge</div>
          </div>
        </div>
        <p className="text-ink-soft">
          Tapwijs houdt je drankprijzen bij, registreert wat elk feest dronk, berekent je
          gerealiseerde marge en helpt je je forfaits te prijzen op basis van je eigen
          geschiedenis. Alles blijft lokaal op deze computer; er is geen account en geen internet
          nodig voor dagelijks gebruik.
        </p>
        <div className="mt-6 pt-4 border-t border-cream-deep text-sm text-ink-soft">
          Gemaakt door <strong className="text-ink">To the Moon and Back</strong>.
        </div>
      </Card>
    </div>
  )
}
