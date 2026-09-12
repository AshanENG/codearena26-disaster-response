import { useState } from 'react';
import { request } from './api.js';
export default function AuthPanel({ onUser }) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const fields = new FormData(event.currentTarget);
    try {
      const { user } = await request(`/api/auth/${register ? 'register' : 'login'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: fields.get('username'), password: fields.get('password') }) });
      onUser(user);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <section className="panel max-w-xl"><div className="eyebrow">PRIVATE REPORTING</div><h2>{register ? 'Create a citizen account' : 'Sign in to your workspace'}</h2><p className="muted mb-5">Citizens see their own reports. Staff access is assigned by the backend; choosing a navigation tab does not change your role.</p>
    <form className="space-y-4" onSubmit={submit}>
      <div><label htmlFor="username">Username</label><input id="username" name="username" autoComplete="username" pattern="[a-zA-Z0-9-]{3,40}" minLength={3} maxLength={40} required /></div>
      <div><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={10} maxLength={128} required /></div>
      <p className="muted text-xs">Username: 3–40 letters, numbers or hyphens. Password: at least 10 characters.</p>
      <button className="primary" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button>
      {error && <p role="alert" className="notice error">{error}</p>}
    </form>
    <button className="secondary mt-5" disabled={busy} onClick={() => { setRegister(!register); setError(''); }}>{register ? 'Use an existing account' : 'Register as a citizen'}</button>
    <p className="muted text-xs mt-4">Staff demonstration accounts are created locally with npm run seed:demo. No public staff registration is available.</p>
  </section>;
}
