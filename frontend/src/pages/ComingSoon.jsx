import { useLocation } from 'react-router-dom'
import Panel from '../components/ui/Panel.jsx'

export default function ComingSoon() {
  const { pathname } = useLocation()
  const page = pathname.split('/').pop().replace(/-/g, ' ')

  return (
    <Panel title="This page is not built yet" description={`The ${page} page is next on the list. Use the dashboard for now.`} />
  )
}
