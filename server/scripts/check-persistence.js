import '../src/config.js';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { Report } from '../src/models/Report.js';

// Real MongoDB only. Creates one identifiable test report and deletes only that report.
if (!process.env.MONGODB_URI) {
  console.error('BLOCKED: Set MONGODB_URI in server/.env to a real MongoDB instance.');
  process.exitCode = 1;
} else {
  let server; let id;
  const start = () => new Promise(resolve => { server = createApp({ databaseConfigured: true }).listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)); });
  const close = () => new Promise(resolve => server.close(resolve));
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    let url = await start();
    const response = await fetch(`${url}/api/reports`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: `Persistence check ${Date.now()}`, latitude: 7, longitude: 80 }) });
    assert.equal(response.status, 201);
    id = (await response.json()).report._id;
    await close(); await mongoose.disconnect();
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    url = await start();
    const refreshed = await fetch(`${url}/api/reports?limit=100`);
    assert.equal(refreshed.status, 200);
    assert.ok((await refreshed.json()).reports.some(r => r._id === id));
    console.log('PASS: HTTP POST persisted in real MongoDB and HTTP GET found it after app and database reconnection.');
  } catch { console.error('FAIL/BLOCKED: Real MongoDB persistence check could not complete. Check MongoDB availability and configuration.'); process.exitCode = 1; }
  finally {
    if (id && mongoose.connection.readyState === 1) await Report.deleteOne({ _id: id }).catch(() => { console.error('Test report cleanup failed.'); });
    if (server?.listening) await close();
    await mongoose.disconnect();
  }
}
