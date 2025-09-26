import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import EventManage from './page/event_manage.tsx'
import VolunteerHistory from './page/volunteer_history.tsx'
import './index.css'

function usePathname() {
  const [pathname, setPathname] = useState(window.location.pathname)

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  return pathname
}

function AppRouter() {
  const pathname = usePathname()

  switch (pathname) {
    case '/volunteer_history':
      return <VolunteerHistory />
    default:
      return <EventManage />
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>
)
