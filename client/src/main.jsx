import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { request } from './api.js';
import AuthPanel from './AuthPanel.jsx';
import Citizen from './Citizen.jsx';
import ReportQueue from './ReportQueue.jsx';

const views = ['Citizen', 'Operations', 'Crew', 'Relief', 'Admin'];
function App() {
  const [view, setView] = useState(() => views.find(v => `#${v.toLowerCase()}` === location.hash) || 'Citizen');
  const [health, setHealth] = useState(null);
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [authError, setAuthError] = useState('');
  useEffect(() => {
    const change = () => setView(views.find(v => `#${v.toLowerCase()}` === location.hash) || 'Citizen');
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    let active = true;
    request('/api/auth/me').then(data => { if (active) setUser(data.user); }).catch(e => { if (active) setAuthError(e.message); }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    const check = () => fetch('/api/health', { signal: AbortSignal.timeout(5000) }).then(r => r.json()).then(data => { if (active) setHealth(data); }).catch(() => { if (active) setHealth({ server: 'unavailable' }); });
    check(); const timer = setInterval(check, 15000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  function signedIn(value) {
    setUser(value); setAuthError('');
    location.hash = ({ citizen: 'citizen', officer: 'operations', admin: 'operations', relief: 'relief', crew: 'crew' })[value.role];
  }
  async function signOut() {
    try { await request('/api/auth/logout', { method: 'POST' }); setUser(null); setAuthError(''); }
    catch (e) { setAuthError(e.message); }
  }
  function content() {
    if (checking) return <p role="status">Checking your session…</p>;
    if (!user) return <AuthPanel onUser={signedIn} />;
    if (view === 'Citizen' && user.role === 'citizen') return <Citizen />;
    if (view === 'Operations' && ['officer', 'admin'].includes(user.role)) return <ReportQueue title="Report inbox" />;
    if (view === 'Relief' && ['relief', 'officer', 'admin'].includes(user.role)) return <><p className="notice">Help intake is available. Shelter assignment, supplies and relief dispatch are not implemented yet.</p><ReportQueue helpOnly title="Help request queue" /></>;
    if ((view === 'Crew' && ['crew', 'admin'].includes(user.role)) || (view === 'Admin' && user.role === 'admin')) return <section className="panel empty"><span className="badge">Not implemented</span><h2 className="mt-4">{view} workflow is planned</h2><p className="muted">{view === 'Crew' ? 'Assignments and incident closure with photos follow after incident review and dispatch are built.' : 'Human feedback, configuration history and incident controls follow in later milestones.'}</p></section>;
    return <section className="panel"><span className="badge">Access restricted</span><h2 className="mt-4">This view requires a different role</h2><p className="muted">You are signed in as {user.role}. The server independently enforces access. Sign out to use another authorized account.</p></section>;
  }
  return <div className="min-h-screen"><a href="#main" className="skip">Skip to content</a><header className="border-b border-slate-200 bg-white"><div className="mx-auto max-w-7xl px-5 py-5 flex flex-wrap items-center justify-between gap-4"><a href="#citizen" className="flex items-center gap-3 font-bold text-lg"><span className="brand">+</span><span>Disaster Response<span className="block text-xs font-normal tracking-widest text-slate-500">CODEARENA ’26 · SRI LANKA</span></span></a><div className="flex flex-wrap items-center gap-3"><span className="badge">Milestone 02 / Evidence intake</span>{user && <><span className="text-xs">{user.username} · {user.role}{user.demo ? ' · demo account' : ''}</span><button className="secondary" onClick={signOut}>Sign out</button></>}</div></div></header>
    <div className="mx-auto max-w-7xl md:grid md:grid-cols-[205px_1fr]"><nav aria-label="Main navigation" className="p-5 md:pt-9 flex gap-2 overflow-x-auto md:flex-col">{views.map((name, index) => <a key={name} href={`#${name.toLowerCase()}`} aria-current={view === name ? 'page' : undefined} className={`nav-link ${view === name ? 'active' : ''}`}><span className="opacity-50 text-xs">0{index + 1}</span> {name}</a>)}</nav><main id="main" className="px-5 pt-4 pb-12 md:pt-9 min-w-0"><div className="eyebrow">REPORT · REVIEW · RESPOND</div><h1>{view === 'Citizen' ? 'Every report matters.' : view === 'Operations' ? 'Understand what’s reported.' : `${view} workspace`}</h1><p className="muted mb-7">A foundation for coordinated disaster response across Sri Lanka.</p><div className="system mb-6" role="status"><span className={`dot ${health?.ready ? 'online' : ''}`} />{!health ? 'Checking services…' : health.server === 'unavailable' ? 'Server unavailable' : `Server ready · Database ${health.database?.status || 'unknown'}`}</div>
    {authError && <p role="alert" className="notice error mb-5">{authError}</p>}{content()}
    <footer className="mt-8 text-xs text-slate-500">Competition prototype. Reports are not monitored for emergency dispatch. Private report maps show unverified submissions; confirmed public hazards, warnings and routes are not available yet.</footer></main></div></div>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
