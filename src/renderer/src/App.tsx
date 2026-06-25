import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import { ToastProvider } from './components/Toast'
import Overzicht from './screens/Overzicht'
import DrankenPrijzen from './screens/DrankenPrijzen'
import VolumesVerpakking from './screens/VolumesVerpakking'
import Forfaits from './screens/Forfaits'
import Feesten from './screens/Feesten'
import FeestDetail from './screens/FeestDetail'
import Inzichten from './screens/Inzichten'
import Rapporten from './screens/Rapporten'
import Resultaat from './screens/Resultaat'
import PrintBlad from './screens/PrintBlad'
import Instellingen from './screens/Instellingen'
import Over from './screens/Over'

export default function App(): JSX.Element {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Overzicht />} />
          <Route path="dranken" element={<DrankenPrijzen />} />
          <Route path="volumes" element={<VolumesVerpakking />} />
          <Route path="forfaits" element={<Forfaits />} />
          <Route path="feesten" element={<Feesten />} />
          <Route path="feesten/:id" element={<FeestDetail />} />
          <Route path="feesten/:id/resultaat" element={<Resultaat />} />
          <Route path="feesten/:id/blad" element={<PrintBlad />} />
          <Route path="inzichten" element={<Inzichten />} />
          <Route path="rapporten" element={<Rapporten />} />
          <Route path="instellingen" element={<Instellingen />} />
          <Route path="over" element={<Over />} />
        </Route>
      </Routes>
    </ToastProvider>
  )
}
