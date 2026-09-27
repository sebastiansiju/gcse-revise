import { NavLink, Outlet, Link } from 'react-router-dom';
import { LayoutDashboard, Brain, CalendarCheck, Timer, TrendingUp, Users, BookOpen, Settings, LogOut, GraduationCap } from 'lucide-react';
import { useAuth } from '../auth.js';

const NAV = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, end: true },
  { to: '/practice', label: 'Practice', short: 'Practice', icon: Brain, mobile: true },
  { to: '/planner', label: 'Planner', short: 'Plan', icon: CalendarCheck, mobile: true },
  { to: '/focus', label: 'Focus timer', short: 'Focus', icon: Timer, mobile: true },
  { to: '/progress', label: 'Progress', short: 'Progress', icon: TrendingUp, mobile: true },
  { to: '/family', label: 'Family board', short: 'Family', icon: Users },
  { to: '/guide', label: 'Exam guide', short: 'Guide', icon: BookOpen },
  { to: '/settings', label: 'My subjects', short: 'Subjects', icon: Settings },
];

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="app">
      <aside className="sidebar" aria-label="Main navigation">
        <Link to="/" className="brand"><span className="brand-mark"><GraduationCap size={20} aria-hidden /></span>GCSE Revise</Link>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="nav-link"><Icon size={20} aria-hidden />{label}</NavLink>
        ))}
        <div className="sidebar-foot">
          <div style={{ fontWeight: 700 }}>{user.name}</div>
          <div className="hint">@{user.username}</div>
          <button className="btn btn-ghost btn-sm" onClick={logout} style={{ marginTop: 8, paddingLeft: 0 }}>
            <LogOut size={16} aria-hidden /> Log out
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="mobile-top">
          <Link to="/" className="brand" style={{ padding: 0 }}><span className="brand-mark"><GraduationCap size={20} aria-hidden /></span>GCSE Revise</Link>
          <div className="row" style={{ gap: 4 }}>
            <NavLink to="/guide" className="icon-btn" aria-label="Exam guide"><BookOpen size={20} /></NavLink>
            <NavLink to="/family" className="icon-btn" aria-label="Family board"><Users size={20} /></NavLink>
            <NavLink to="/settings" className="icon-btn" aria-label="My subjects"><Settings size={20} /></NavLink>
            <button className="icon-btn" onClick={logout} aria-label="Log out"><LogOut size={20} /></button>
          </div>
        </div>
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {NAV.filter((n) => n.mobile || n.end).map(({ to, short, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}><Icon size={22} aria-hidden />{short}</NavLink>
        ))}
      </nav>
    </div>
  );
}
