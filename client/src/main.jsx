import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const views = ['Citizen', 'Operations', 'Crew', 'Relief', 'Admin'];
async function request(path, options) {
  const response = await fetch(path, { ...options, signal: AbortSignal.timeout(12000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}
function Citizen() {
  const [form, setForm] = useState({ description: '', latitude: '', longitude: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    setMessage(null);
    if (form.description.trim().length < 10 || !form.latitude.trim() || !form.longitude.trim()) {
      setMessage({ error: true, text: 'Add a description of at least 10 characters and both coordinates.' }); return;
    }
    setSaving(true);
    try {
      const { report } = await request('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: form.description.trim(), latitude: Number(form.latitude), longitude: Number(form.longitude) }) });
      setMessage({ text: `Saved to the database. Report ID: ${report._id}. View it in Operations. This does not dispatch emergency assistance.` });
      setForm({ description: '', latitude: '', longitude: '' });
    } catch (error) { setMessage({ error: true, text: `${error.message} Saving was not confirmed. Check Operations before retrying.` }); }
    finally { setSaving(false); }
  }
  return <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
    <section className="panel"><div className="eyebrow">CITIZEN REPORTING</div><h2>What’s happening nearby?</h2><p className="muted mb-6">Describe a hazard and add its coordinates. Reports are stored for review; assessment is not yet available.</p>
      <form onSubmit={submit} className="space-y-5">
        <label className="block">Description<textarea required minLength={10} maxLength={2000} rows={5} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe what you can see, where it is, and when you noticed it." aria-describedby="description-help" /></label>
        <p id="description-help" className="muted text-sm">10–2,000 characters. Avoid including personal or sensitive information.</p>
        <div className="grid gap-4 sm:grid-cols-2">{['latitude', 'longitude'].map(key => <label key={key} className="capitalize">{key}<input type="number" step="any" required min={key === 'latitude' ? -90 : -180} max={key === 'latitude' ? 90 : 180} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={key === 'latitude' ? '−90 to 90' : '−180 to 180'} /></label>)}</div>
        <p className="muted text-sm">Coordinates are supplied by you and remain unverified. No location is guessed.</p>
        <button className="primary" disabled={saving}>{saving ? 'Saving report…' : 'Submit report →'}</button>
        {message && <p role={message.error ? 'alert' : 'status'} className={message.error ? 'notice error' : 'notice'}>{message.text}</p>}
      </form>
    </section>
    <aside className="space-y-5"><section className="panel dark"><div className="eyebrow">FOUNDATION · MILESTONE 01</div><h3>A clearer picture starts with a report.</h3><p>Citizen submissions connect directly to the Operations inbox through MongoDB.</p></section><section className="panel"><span className="badge">Coming next</span><h3>Photo evidence</h3><p className="muted">Photo uploads, GPS capture and AI verification are planned. This milestone accepts text and manually entered coordinates only.</p></section></aside>
  </div>;
}
function Operations() {
  const [state, setState] = useState({ reports: [], loading: true, error: '', hasMore: false });
  const [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setState(s => ({ ...s, loading: true, error: '' }));
    request(`/api/reports?limit=20&offset=${offset}`).then(data => { if (active) setState({ ...data, loading: false, error: '' }); }).catch(error => { if (active) setState({ reports: [], loading: false, error: error.message, hasMore: false }); });
    return () => { active = false; };
  }, [offset, refresh]);
  return <section className="panel"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="eyebrow">OPERATIONS</div><h2>Report inbox</h2><p className="muted">Saved citizen reports · newest first · assessment pending</p></div><button className="secondary" disabled={state.loading} onClick={() => setRefresh(n => n + 1)}>Refresh reports</button></div>
    {state.loading ? <p role="status" className="py-10">Loading from the database…</p> : state.error ? <p role="alert" className="notice error">{state.error}</p> : state.reports.length === 0 ? <div className="empty"><h3>No saved reports on this page</h3><p>Submit a citizen report to begin. No demonstration reports are inserted.</p></div> : <ul className="mt-6 divide-y divide-slate-200">{state.reports.map(report => <li key={report._id} className="py-5"><div className="flex flex-wrap justify-between gap-2"><span className="badge">Submitted · not assessed</span><time className="muted text-sm" dateTime={report.createdAt}>{new Date(report.createdAt).toLocaleString()}</time></div><p className="my-3 whitespace-pre-wrap break-words">{report.description}</p><p className="muted text-sm">{report.latitude}, {report.longitude} · Location unverified</p><p className="muted text-xs mt-2 break-all">ID: {report._id}</p></li>)}</ul>}
    <div className="flex gap-3 mt-5"><button className="secondary" disabled={offset === 0 || state.loading} onClick={() => setOffset(n => Math.max(0, n - 20))}>Previous</button><button className="secondary" disabled={!state.hasMore || state.loading} onClick={() => setOffset(n => n + 20)}>Next</button></div>
  </section>;
}
function App() {
  const [view, setView] = useState(() => views.find(v => `#${v.toLowerCase()}` === location.hash) || 'Citizen');
  const [health, setHealth] = useState(null);
  useEffect(() => {
    const change = () => setView(views.find(v => `#${v.toLowerCase()}` === location.hash) || 'Citizen');
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    let active = true;
    const check = () => fetch('/api/health', { signal: AbortSignal.timeout(5000) }).then(r => r.json()).then(data => { if (active) setHealth(data); }).catch(() => { if (active) setHealth({ server: 'unavailable' }); });
    check(); const timer = setInterval(check, 15000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  const pending = { Crew: 'Crew assignments and incident closure with photos will be added in a later milestone.', Relief: 'Relief requests, supplies and distribution tracking will be added in a later milestone.', Admin: 'Human feedback, configuration history and access controls will be added in a later milestone.' };
  return <div className="min-h-screen"><a href="#main" className="skip">Skip to content</a><header className="border-b border-slate-200 bg-white"><div className="mx-auto max-w-7xl px-5 py-5 flex flex-wrap items-center justify-between gap-4"><a href="#citizen" className="flex items-center gap-3 font-bold text-lg"><span className="brand">+</span><span>Disaster Response<span className="block text-xs font-normal tracking-widest text-slate-500">CODEARENA ’26 · SRI LANKA</span></span></a><span className="badge">Milestone 01 / Foundation</span></div></header>
    <div className="mx-auto max-w-7xl md:grid md:grid-cols-[205px_1fr]"><nav aria-label="Main navigation" className="p-5 md:pt-9 flex gap-2 overflow-x-auto md:flex-col">{views.map((name, index) => <a key={name} href={`#${name.toLowerCase()}`} aria-current={view === name ? 'page' : undefined} className={`nav-link ${view === name ? 'active' : ''}`}><span className="opacity-50 text-xs">0{index + 1}</span> {name}</a>)}</nav><main id="main" className="px-5 pt-4 pb-12 md:pt-9 min-w-0"><div className="eyebrow">REPORT · REVIEW · RESPOND</div><h1>{view === 'Citizen' ? 'Every report matters.' : view === 'Operations' ? 'Understand what’s reported.' : `${view} workspace`}</h1><p className="muted mb-7">A foundation for coordinated disaster response across Sri Lanka.</p><div className="system mb-6" role="status"><span className={`dot ${health?.ready ? 'online' : ''}`} />{!health ? 'Checking services…' : health.server === 'unavailable' ? 'Server unavailable' : `Server ready · Database ${health.database?.status || 'unknown'}`}</div>
    {view === 'Citizen' ? <Citizen /> : view === 'Operations' ? <Operations /> : <section className="panel empty"><span className="badge">Not implemented</span><h2 className="mt-4">{view} is planned</h2><p className="muted">{pending[view]}</p></section>}
    <footer className="mt-8 text-xs text-slate-500">Competition prototype. Reports are not monitored for emergency dispatch. Navigation does not provide authentication or role-based access.</footer></main></div></div>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
