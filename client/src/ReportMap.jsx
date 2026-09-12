import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function ReportMap({ reports = [], point, label = 'Map of reports on this page' }) {
  const container = useRef(null);
  const map = useRef(null);
  const markers = useRef(null);
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    map.current = L.map(container.current, { scrollWheelZoom: false }).setView([7.8, 80.7], 7);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).on('tileerror', () => setTileError(true)).addTo(map.current);
    markers.current = L.layerGroup().addTo(map.current);
    const resize = new ResizeObserver(() => map.current?.invalidateSize());
    resize.observe(container.current);
    return () => { resize.disconnect(); map.current.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    if (!markers.current) return;
    markers.current.clearLayers();
    const points = point ? [point] : reports;
    const coords = [];
    for (const r of points) {
      if (!Number.isFinite(r.latitude) || !Number.isFinite(r.longitude)) continue;
      const popup = document.createElement('p');
      popup.textContent = point ? 'Your chosen location · unverified' : `${r.kind === 'help' ? 'Help request' : 'Hazard report'} · ${r.description} · submitted, not assessed`;
      const xy = [r.latitude, r.longitude]; coords.push(xy);
      L.circleMarker(xy, { radius: 8, color: r.kind === 'help' ? '#a55b19' : '#17644e', fillOpacity: 0.75 }).bindPopup(popup).addTo(markers.current);
    }
    if (coords.length) map.current.fitBounds(L.latLngBounds(coords), { padding: [35, 35], maxZoom: 14 });
    else map.current.setView([7.8, 80.7], 7);
  }, [reports, point]);
  return <section className="map-section"><div ref={container} className="report-map" aria-label={label} role="region" />{tileError && <p className="muted text-xs p-2">Some basemap tiles could not load. The coordinate list remains available below.</p>}<p className="muted text-xs p-2">{label}. Pins are unverified submissions, not confirmed hazards or safe-route guidance. Basemap requires internet.</p></section>;
}
