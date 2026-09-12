import { useEffect, useRef, useState } from 'react';
import { request } from './api.js';
import ReportMap from './ReportMap.jsx';
import ReportQueue from './ReportQueue.jsx';
import RoutingWidget from './RoutingWidget.jsx';
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
  const [alerts, setAlerts] = useState([]);
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
  const [clarifications, setClarifications] = useState([]);
  const [clarResponse, setClarResponse] = useState({});
  const [respondingId, setRespondingId] = useState(null);

  useEffect(() => {
    let active = true;
    request('/api/incidents').then(data => {
      if (!active) return;
      const allClars = [];
      for (const inc of (data.incidents || [])) {
        for (const c of (inc.clarifications || [])) {
          if (c.status === 'active') {
            allClars.push({ ...c, incidentId: inc._id, incidentTitle: inc.title, ward: inc.ward?.name });
          }
        }
      }
      setClarifications(allClars);
    }).catch(() => {});
    request('/api/alerts').then(data => {
      if (!active) return;
      setAlerts(data.alerts || []);
    }).catch(() => {});
    return () => { active = false; };
  }, [refresh]);

  async function respondClarification(incidentId, clarId) {
    const choice = clarResponse[clarId]?.choice || 'confirmed_hazard';
    const comment = clarResponse[clarId]?.comment || '';
    setRespondingId(clarId);
    try {
      await request(`/api/incidents/${incidentId}/clarification/${clarId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ responseChoice: choice, comment }),
      });
      setClarifications(clars => clars.filter(c => c._id !== clarId));
      setMessage({ text: 'Thank you. Your confirmation has been submitted to emergency responders.' });
    } catch (err) {
      setMessage({ error: true, text: err.message || 'Failed to submit response.' });
    } finally {
      setRespondingId(null);
    }
  }

  return <><div className="grid gap-6 lg:grid-cols-[1fr_280px]"><section className="panel"><div className="eyebrow">CITIZEN REPORTING</div><h2>What’s happening nearby?</h2><p className="muted mb-5">Report a hazard or ask for help with a photo and location. Your submission is private to you and authorized staff.</p>
    {alerts.length > 0 && (
      <div className="mb-6 space-y-3">
        {alerts.map(a => (
          <div
            key={a._id || a.title}
            className={`p-4 rounded-xl border ${
              a.severity === 'danger'
                ? 'bg-rose-50 border-rose-400 text-rose-950'
                : a.severity === 'warning'
                ? 'bg-amber-50 border-amber-400 text-amber-950'
                : 'bg-sky-50 border-sky-400 text-sky-950'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`badge text-xs font-bold uppercase ${
                  a.severity === 'danger'
                    ? 'bg-rose-200 text-rose-900 border-rose-400'
                    : a.severity === 'warning'
                    ? 'bg-amber-200 text-amber-900 border-amber-400'
                    : 'bg-sky-200 text-sky-900 border-sky-400'
                }`}
              >
                {a.severity === 'danger' ? 'CRITICAL DANGER' : a.severity === 'warning' ? 'FLOOD WARNING' : 'ADVISORY'}
              </span>
              <h3 className="font-bold text-sm">{a.title}</h3>
            </div>
            <div className="text-xs opacity-80 mb-2">
              Source: {a.source} · Trigger: {a.trigger?.stationName} ({a.trigger?.value} ft)
            </div>
            {a.recommendations?.length > 0 && (
              <ul className="list-disc list-inside text-xs space-y-0.5">
                {a.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    )}
    {clarifications.length > 0 && (
      <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg space-y-3">
        <div className="flex items-center gap-2">
          <span className="badge bg-amber-200 text-amber-900 border-amber-400 font-bold text-xs">OFFICIAL INQUIRY</span>
          <h3 className="font-bold text-sm text-amber-950">Responders Request Local Confirmation</h3>
        </div>
        {clarifications.map(c => (
          <div key={c._id} className="p-3 bg-white border border-amber-200 rounded space-y-2 text-xs">
            <div className="font-semibold text-slate-900">{c.question}</div>
            <div className="text-slate-500">Related to {c.incidentTitle} · Area: {c.ward}</div>
            <div className="flex flex-wrap gap-2 pt-1">
              {['confirmed_hazard', 'hazard_cleared', 'uncertain'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  className={`text-xs px-2.5 py-1 rounded border ${
                    (clarResponse[c._id]?.choice || 'confirmed_hazard') === opt
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                  onClick={() => setClarResponse(prev => ({ ...prev, [c._id]: { ...prev[c._id], choice: opt } }))}
                >
                  {opt === 'confirmed_hazard' ? 'Water/Hazard Present' : opt === 'hazard_cleared' ? 'Water Receded / Cleared' : 'Not Sure'}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Optional details (e.g., depth, passage status)..."
                value={clarResponse[c._id]?.comment || ''}
                onChange={e => setClarResponse(prev => ({ ...prev, [c._id]: { ...prev[c._id], comment: e.target.value } }))}
                className="text-xs p-1.5 border rounded flex-1"
              />
              <button
                type="button"
                className="bg-amber-700 hover:bg-amber-800 text-white text-xs px-3 py-1 rounded font-semibold disabled:opacity-50"
                disabled={respondingId === c._id}
                onClick={() => respondClarification(c.incidentId, c._id)}
              >
                {respondingId === c._id ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
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
  </section><aside className="space-y-5"><section className="panel dark"><div className="eyebrow">STAGE 01–06 · HUMAN RESPONSE CHAIN</div><h3>Verified reports. Dispatched crews.</h3><p>Reports are clustered into incidents, evaluated by AI & sensor rules, and dispatched to field crews who close hazards with photos.</p></section><section className="panel"><span className="badge bg-emerald-100 text-emerald-800">OPERATIONAL CLOSURE</span><h3>Safe hazard clearance</h3><p className="muted">When crews upload photo proof of road clearance, hazard warnings clear and public routes re-open automatically.</p></section></aside></div>
  <div className="my-6"><RoutingWidget /></div>
  <ReportQueue own title="My reports and help requests" refreshKey={refresh} /></>;
}
