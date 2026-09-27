import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { api } from './api.js';
import Layout from './components/Layout.jsx';
import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Practice from './pages/Practice.jsx';
import Planner from './pages/Planner.jsx';
import Focus from './pages/Focus.jsx';
import Progress from './pages/Progress.jsx';
import Family from './pages/Family.jsx';
import Guide from './pages/Guide.jsx';
import Settings from './pages/Settings.jsx';
import './styles.css';

import { AuthContext } from './auth.js';

function App() {
  const [user, setUser] = useState(undefined); // undefined = still checking

  useEffect(() => {
    api.get('/auth/me').then((d) => setUser(d.user)).catch(() => setUser(null));
  }, []);

  const logout = async () => {
    await api.post('/auth/logout').catch(() => {});
    setUser(null);
  };

  if (user === undefined) return <div className="empty" role="status">Loading…</div>;

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      <BrowserRouter>
        {user ? (
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="practice" element={<Practice />} />
              <Route path="planner" element={<Planner />} />
              <Route path="focus" element={<Focus />} />
              <Route path="progress" element={<Progress />} />
              <Route path="family" element={<Family />} />
              <Route path="guide" element={<Guide />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        ) : (
          <Routes>
            <Route path="*" element={<Auth />} />
          </Routes>
        )}
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
