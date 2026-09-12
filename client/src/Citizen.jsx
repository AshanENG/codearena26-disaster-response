import { useEffect, useRef, useState } from 'react';
import { request } from './api.js';
import ReportMap from './ReportMap.jsx';
import ReportQueue from './ReportQueue.jsx';
const initial = () => ({ kind: 'hazard', helpCategory: 'rescue', description: '', latitude: '', longitude: '', locationSource: 'manual', gpsAccuracy: undefined });
export default function Citizen() {
  const [form, setForm] = useState(initial);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState(null);
  const [gpsMessage, setGpsMessage] = useState('');
  const [refresh, setRefresh] = useState(0);
  const fileInput = useRef(null);
  const key = useRef(crypto.randomUUID());
  useEffect(() => {
    if (!photo) { setPreview(''); return; }
    const url = URL.createObjectURL(photo); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  function edit(changes) { setForm(f => ({ ...f, ...changes })); key.current = crypto.randomUUID(); setMessage(null); }
  function locate() {
    if (!navigator.geolocation) { setGpsMessage('Location is unavailable in this browser. Enter coordinates manually.'); return; }
    setLocating(true); setGpsMessage('Requesting your device location…');
    navigator.geolocation.getCurrentPosition(position => {
      edit({ latitude: String(position.coords.latitude), longitude: String(position.coords.longitude), locationSource: 'device', gpsAccuracy: position.coords.accuracy });
      setGpsMessage(`Device reports accuracy of approximately ${Math.round(position.coords.accuracy)} metres. Review the location before submitting.`); setLocating(false);
    }, () => { setGpsMessage('Location was denied or unavailable. You can enter coordinates manually; no location has been guessed.'); setLocating(false); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  }
  async function submit(event) {
    event.preventDefault(); if (saving) return;
    setMessage(null);
    if (!photo || form.description.trim().length < 10 || !form.latitude.trim() || !form.longitude.trim()) { setMessage({ error: true, text: 'Add a photo, a description of at least 10 characters, and both coordinates.' }); return; }
    const body = new FormData();
    const data = { kind: form.kind, description: form.description.trim(), latitude: Number(form.latitude), longitude: Number(form.longitude), locationSource: form.locationSource, submissionKey: key.current };
    if (form.kind === 'help') data.helpCategory = form.helpCategory;
    if (form.locationSource === 'device') data.gpsAccuracy = form.gpsAccuracy;
    body.append('report', JSON.stringify(data)); body.append('photo', photo);
    setSaving(true);
    try {
      const { report, replayed } = await request('/api/reports', { method: 'POST', body });
      setMessage({ text: `${replayed ? 'Already saved' : 'Saved to MongoDB'}. Report ID: ${report._id}. Your photo is stored; assessment and dispatch have not happened.` });
      setForm(initial()); setPhoto(null); fileInput.current.value = ''; key.current = crypto.randomUUID(); setGpsMessage(''); setRefresh(n => n + 1);
    } catch (error) { setMessage({ error: true, text: `${error.message} Check your reports before changing the form. Retrying unchanged uses the same submission key.` }); }
    finally { setSaving(false); }
  }
  const point = form.latitude.trim() && form.longitude.trim() && Math.abs(Number(form.latitude)) <= 90 && Math.abs(Number(form.longitude)) <= 180 ? { latitude: Number(form.latitude), longitude: Number(form.longitude) } : null;
  return <><div className="grid gap-6 lg:grid-cols-[1fr_280px]"><section className="panel"><div className="eyebrow">CITIZEN REPORTING</div><h2>What’s happening nearby?</h2><p className="muted mb-5">Report a hazard or ask for help with a photo and location. Your submission is private to you and authorized staff.</p>
    <form onSubmit={submit} className="space-y-5"><fieldset disabled={saving} className="space-y-5">
      <div><label htmlFor="kind">I want to</label><select id="kind" value={form.kind} onChange={e => edit({ kind: e.target.value })}><option value="hazard">Report a hazard</option><option value="help">Request help</option></select></div>
      {form.kind === 'help' && <div><label htmlFor="help-category">Help needed</label><select id="help-category" value={form.helpCategory} onChange={e => edit({ helpCategory: e.target.value })}>{['rescue', 'medical', 'food', 'water', 'shelter', 'other'].map(v => <option value={v} key={v}>{v}</option>)}</select></div>}
      <div><label htmlFor="description">Description</label><textarea id="description" required minLength={10} maxLength={2000} rows={4} value={form.description} onChange={e => edit({ description: e.target.value })} placeholder="What happened, where, and when?" aria-describedby="description-help" /><p id="description-help" className="muted text-xs mt-2">10–2,000 characters. Avoid personal details that are not needed.</p></div>
      <div><label htmlFor="photo">Photo evidence</label><input ref={fileInput} id="photo" type="file" accept="image/jpeg,image/png,image/webp" required onChange={e => { const file = e.target.files[0]; if (file && file.size > 5 * 1024 * 1024) { setMessage({ error: true, text: 'Choose a photo no larger than 5 MiB.' }); e.target.value = ''; setPhoto(null); return; } setPhoto(file || null); key.current = crypto.randomUUID(); setMessage(null); }} /><p className="muted text-xs mt-2">JPEG, PNG or WebP · up to 5 MiB / 20 megapixels. Original metadata is retained as private evidence. Avoid identifiable bystanders where possible.</p>{preview && <img className="photo-preview mt-3" src={preview} alt="Preview of your selected evidence" />}</div>
      <button className="secondary" type="button" disabled={locating} onClick={locate}>{locating ? 'Getting location…' : 'Use my current location'}</button>{gpsMessage && <p role="status" className="muted text-sm">{gpsMessage}</p>}
      <div className="grid gap-4 sm:grid-cols-2">{['latitude', 'longitude'].map(name => <div key={name}><label className="capitalize" htmlFor={name}>{name}</label><input id={name} type="number" step="any" required min={name === 'latitude' ? -90 : -180} max={name === 'latitude' ? 90 : 180} value={form[name]} onChange={e => { edit({ [name]: e.target.value, locationSource: 'manual', gpsAccuracy: undefined }); setGpsMessage('Manually entered coordinates are unverified.'); }} /></div>)}</div>
      {point && <ReportMap point={point} label="Preview of the coordinates you will submit" />}
      <p className="muted text-xs">GPS is device-supplied, not proof of the photo’s location. Missing photo GPS remains unknown. Reporting is supported throughout Sri Lanka; no operational coverage is implied.</p>
      <button className="primary" disabled={saving || locating}>{saving ? 'Saving report and photo…' : 'Submit report →'}</button>
    </fieldset>{message && <p role={message.error ? 'alert' : 'status'} className={message.error ? 'notice error' : 'notice'}>{message.text}</p>}</form>
  </section><aside className="space-y-5"><section className="panel dark"><div className="eyebrow">MILESTONE 02 · EVIDENCE INTAKE</div><h3>A photo. A location. A clearer report.</h3><p>Your original photo is stored in MongoDB alongside the report reference, so it survives server restarts.</p></section><section className="panel"><span className="badge">Not implemented yet</span><h3>Assessment and response</h3><p className="muted">AI checks, confirmation, dispatch, public hazard publication and emergency alerts come in later milestones. Submitting does not summon assistance.</p></section></aside></div>
  <ReportQueue own title="My reports and help requests" refreshKey={refresh} /></>;
}
