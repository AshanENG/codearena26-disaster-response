import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { Report } from '../src/models/Report.js';
import { assessmentSchema } from '../src/ai/gemini.js';

async function withServer(options, run) {
  const server = createApp(options).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
const post = (url, data) => fetch(`${url}/api/reports`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
const valid = { description: 'Water rising near the bridge', latitude: 7, longitude: 80 };
test('health truthfully reports unavailable and connected database states', async () => {
  for (const readyState of [0, 1, 2, 3]) await withServer({ connection: { readyState }, databaseConfigured: true }, async url => {
    const response = await fetch(`${url}/api/health`);
    assert.equal(response.status, readyState === 1 ? 200 : 503);
    assert.equal((await response.json()).ready, readyState === 1);
  });
});
test('reports fail with 503 when MongoDB is absent; there is no fallback storage', async () => {
  await withServer({ connection: { readyState: 0 } }, async url => {
    assert.equal((await post(url, valid)).status, 503);
    assert.equal((await fetch(`${url}/api/reports`)).status, 503);
  });
});
test('rejects invalid reports and unsafe query values before storage', async () => {
  await withServer({ connection: { readyState: 1 }, reports: { create() { throw new Error('Must not reach storage'); } } }, async url => {
    for (const body of [{}, { ...valid, latitude: '' }, { ...valid, latitude: 91 }, { ...valid, longitude: -181 }, { ...valid, description: ' '.repeat(20) }, { ...valid, description: 'a'.repeat(2001) }, { ...valid, status: 'confirmed' }, { ...valid, latitude: null }]) assert.equal((await post(url, body)).status, 400);
    for (const query of ['limit=0', 'limit=101', 'offset=-1', 'limit[$gt]=1', 'unknown=true']) assert.equal((await fetch(`${url}/api/reports?${query}`)).status, 400);
    assert.equal((await fetch(`${url}/api/reports`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
    assert.equal((await fetch(`${url}/api/reports`, { method: 'POST', body: 'text' })).status, 415);
    assert.equal((await post(url, { ...valid, description: 'a'.repeat(20000) })).status, 413);
  });
});
test('POST awaits storage, trims description and returns the stored report (contract stub only)', async () => {
  const reports = { async create(input) { assert.equal(input.description, valid.description); return { ...input, _id: 'test-id', status: 'submitted' }; } };
  await withServer({ connection: { readyState: 1 }, reports }, async url => {
    const response = await post(url, { ...valid, description: `  ${valid.description}  ` });
    assert.equal(response.status, 201); assert.equal((await response.json()).report._id, 'test-id');
  });
});
test('GET pagination returns rows and hasMore (query contract stub only)', async () => {
  const query = { sort(value) { assert.deepEqual(value, { createdAt: -1, _id: -1 }); return this; }, skip(value) { assert.equal(value, 2); return this; }, limit(value) { assert.equal(value, 2); return this; }, async lean() { return [{ _id: 'one' }, { _id: 'two' }]; } };
  await withServer({ connection: { readyState: 1 }, reports: { find: () => query } }, async url => {
    const response = await fetch(`${url}/api/reports?limit=1&offset=2`);
    assert.deepEqual(await response.json(), { reports: [{ _id: 'one' }], hasMore: true, limit: 1, offset: 2 });
  });
});
test('driver failures do not expose secrets', async () => {
  await withServer({ connection: { readyState: 1 }, reports: { create() { throw new Error('mongodb://secret:password@host'); } } }, async url => {
    const response = await post(url, valid); assert.equal(response.status, 503); assert.ok(!(await response.text()).includes('password'));
    assert.equal((await fetch(`${url}/api/ai`)).status, 404);
  });
});
test('Mongoose validation and defaults preserve unverified status', async () => {
  const report = new Report(valid); await report.validate();
  assert.equal(report.status, 'submitted'); assert.equal(report.locationEvidence, 'unverified');
  await assert.rejects(new Report({ ...valid, longitude: 200 }).validate());
});
test('AI response validation rejects unsupported confidence and invented location evidence', () => {
  const sample = { hazard: 'unknown', risk: 'unknown', reasons: ['Test fixture'], uncertainty: ['No GPS evidence'], confidence: 0.2, locationEvidence: 'unknown', needsMoreInformation: true };
  assert.ok(assessmentSchema.safeParse(sample).success);
  assert.ok(!assessmentSchema.safeParse({ ...sample, confidence: 2 }).success);
  assert.ok(!assessmentSchema.safeParse({ ...sample, locationEvidence: 'verified' }).success);
});
