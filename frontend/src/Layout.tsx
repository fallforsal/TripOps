import { NavLink, Outlet } from 'react-router-dom'
import { Compass } from 'lucide-react'

export function Layout() {
  return <div className="min-h-screen bg-background text-foreground">
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-6 px-6 py-5">
        <NavLink to="/" className="flex items-center gap-2 text-xl font-bold"><Compass className="text-primary" /> TripOps</NavLink>
        <nav className="flex gap-5 text-sm" aria-label="Điều hướng chính">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'font-semibold text-primary' : 'text-muted-foreground'}>Tổng quan</NavLink>
          <NavLink to="/connection" className={({ isActive }) => isActive ? 'font-semibold text-primary' : 'text-muted-foreground'}>Kết nối API</NavLink>
        </nav>
        <span className="ml-auto rounded-full bg-muted px-3 py-1 text-xs">Task 1 · Scaffold</span>
      </div>
    </header>
    <main className="mx-auto max-w-5xl px-6 py-10"><Outlet /></main>
  </div>
}
