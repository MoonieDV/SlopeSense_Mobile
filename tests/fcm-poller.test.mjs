// Isolated fixtures only: no credentials, Firebase connection, or real notifications.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../fcm-poller/Code.gs', import.meta.url), 'utf8');
const NOW = 1791600000000;
const options = { confirm: 2, recovery: 3, cooldown: 600000, maxAge: 300000, maxAttempts: 3, deliveryAge: 1800000 };
const plain = value => JSON.parse(JSON.stringify(value));
function engine() { const context = vm.createContext({ console }); vm.runInContext(source, context); return context; }
function sensors(time, rain = 0, soil = 0, tilt = false, vibration = false) {
  return { 'slope-01': { latest: { rawValue: rain, updatedAt: time } }, soilSensor: { latest: { moisturePercent: soil, updatedAt: time } },
    tiltSensor: { latest: { tiltDetected: tilt, updatedAt: time } }, vibrationSensor: { latest: { vibrationDetected: vibration, updatedAt: time } } };
}
function step(e, state, tick, rain = 0, soil = 0, tilt = false, vibration = false, overrides = {}) {
  const now = NOW + tick * 60000;
  return plain(e.evaluate_(state, sensors(now, rain, soil, tilt, vibration), now, { ...options, ...overrides }, false));
}
test('exact rainfall and moisture boundaries; invalid/calibration overflow rejected', () => {
  const e = engine();
  for (const [value, expected] of [[0,0],[600,0],[601,1],[800,1],[801,2],[1023,2],[1024,null],[-1,null],[null,null],['',null]])
    assert.equal(e.classify_('rain', { rawValue: value }), expected);
  for (const [value, expected] of [[0,0],[59.9,0],[60,1],[79.9,1],[80,2],[100,2],[101,null]])
    assert.equal(e.classify_('soil', { moisturePercent: value }), expected);
  assert.equal(e.detection_({ tiltDetected: false, level: 'TILT DETECTED' }, 'tiltDetected'), 0);
  assert.equal(e.classify_('tilt', { level: 'TILT DETECTED' }), 1);
});
test('first setup baselines existing conditions, including Danger', () => {
  const e = engine(), state = {};
  assert.deepEqual(plain(e.evaluate_(state, sensors(NOW, 900, 90, true), NOW, options, true)), []);
  assert.deepEqual(step(e, state, 1, 900, 90, true), []);
});
test('normal, caution and light rain never notify', () => {
  const e = engine(), state = {};
  for (let t = 0; t < 8; t++) assert.deepEqual(step(e, state, t, 600, 59), []);
});
test('only distinct consecutive readings confirm; persistent restart does not resend', () => {
  const e = engine(); let state = {};
  assert.deepEqual(step(e, state, 0, 700), []);
  assert.deepEqual(step(e, state, 0, 700), []);
  assert.deepEqual(step(e, state, 1, 700), ['rain1']);
  state = plain(state);
  assert.deepEqual(step(engine(), state, 20, 700), []);
});
test('interrupted confirmation resets', () => {
  const e = engine(), state = {};
  step(e, state, 0, 700); step(e, state, 1, 500);
  assert.deepEqual(step(e, state, 2, 700), []);
  assert.deepEqual(step(e, state, 3, 700), ['rain1']);
});
test('cooldown delays escalation, then sends once on a fresh qualifying reading', () => {
  const e = engine(), state = {};
  step(e, state, 0, 700); step(e, state, 1, 700);
  for (let t = 2; t < 11; t++) assert.deepEqual(step(e, state, t, 900), []);
  assert.deepEqual(step(e, state, 11, 900), ['rain2']);
  assert.deepEqual(step(e, state, 12, 900), []);
});
test('downgrade never notifies; confirmed full recovery required to rearm', () => {
  const e = engine(), state = {};
  step(e, state, 0, 900); step(e, state, 1, 900);
  for (let t = 2; t < 6; t++) assert.deepEqual(step(e, state, t, 700), []);
  step(e, state, 6); step(e, state, 7);
  assert.deepEqual(step(e, state, 8, 900), []);
  assert.deepEqual(step(e, state, 9, 900), []);
  step(e, state, 10); step(e, state, 11); step(e, state, 12);
  assert.deepEqual(step(e, state, 13, 900), []);
  assert.deepEqual(step(e, state, 14, 900), ['rain2']);
});
test('Danger overrides confirmation and cooldown and consumes simultaneous individuals', () => {
  const e = engine(), state = {};
  step(e, state, 0, 700, 70); step(e, state, 1, 700, 70);
  assert.deepEqual(step(e, state, 2, 900, 85, true, true), ['danger']);
  assert.deepEqual(step(e, state, 3, 900, 85, true, true), []);
  assert.deepEqual(step(engine(), plain(state), 4, 900, 85, true, true), []);
});
test('Danger recovers only with confirmed new safe readings, then can re-enter immediately', () => {
  const e = engine(), state = {};
  step(e, state, 0, 900, 90, true);
  step(e, state, 1); step(e, state, 1); step(e, state, 1);
  assert.deepEqual(step(e, state, 2, 900, 90, true), []);
  step(e, state, 3); step(e, state, 4); step(e, state, 5);
  assert.deepEqual(step(e, state, 6, 900, 90, true), ['danger']);
});
test('each qualifying individual sensor emits the requested copy without technical readings', () => {
  const e = engine(), state = {};
  step(e, state, 0, 700, 70, true, true);
  assert.deepEqual(step(e, state, 1, 700, 70, true, true), ['rain1','soil1','tilt1','vibration1']);
  for (const key of ['rain1','rain2','soil1','soil2','tilt1','vibration1','danger']) {
    const event = e.event_('id', key, NOW);
    assert.ok(event.category.startsWith('SlopeSense · '));
    assert.doesNotMatch(event.body, /ADC|rawValue|\d+%|Sensor model/);
  }
});
test('missing, stale, malformed, uptime and out-of-order data never become Danger or recovery', () => {
  const e = engine(), state = {};
  step(e, state, 0, 900, 90, false);
  const late = sensors(NOW - 60000, 900, 90, true);
  assert.deepEqual(plain(e.evaluate_(state, late, NOW + 60000, options, false)), []);
  const stale = sensors(NOW, 900, 90, true);
  assert.deepEqual(plain(e.evaluate_({}, stale, NOW + 360000, options, false)), []);
  assert.equal(e.readingTime_({ updatedAt: 12500 }), 0);
  assert.equal(e.readingTime_({ timestamp: NOW / 1000 }), NOW);
  assert.equal(e.readingTime_({ updatedAt: 100, receivedAt: NOW }), NOW);
  assert.deepEqual(plain(e.evaluate_({}, {}, NOW, options, false)), []);
});

function harness() {
  let now = NOW, counter = 0;
  const store = {}, calls = [], plans = [], properties = {};
  const read = path => path ? path.split('/').reduce((o,k) => o?.[k], store) ?? null : store;
  const write = (path, value) => {
    const parts = path.split('/'); let current = store;
    for (const part of parts.slice(0,-1)) current = current[part] ||= {};
    if (value === null) delete current[parts.at(-1)]; else current[parts.at(-1)] = plain(value);
  };
  const response = (code, body, headers = {}) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(body), getAllHeaders: () => headers });
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const ctx = vm.createContext({ console, Date: Clock,
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties[key] ?? null }) },
    CacheService: { getScriptCache: () => ({ remove() {} }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    Utilities: { getUuid: () => `event-${++counter}`, DigestAlgorithm: { SHA_256: 'sha256' }, computeDigest: (_, value) => value, base64EncodeWebSafe: value => Buffer.from(value).toString('base64url') },
    UrlFetchApp: { fetch: (url, init = {}) => {
      if (url.includes('fcm.googleapis.com')) {
        calls.push(JSON.parse(init.payload));
        const plan = plans.shift() || { code: 200, body: { name: 'accepted' } };
        if (plan.error) throw Error('ambiguous network interruption');
        return response(plan.code, plan.body || {}, plan.headers || {});
      }
      const parsed = new URL(url), path = parsed.pathname.slice(1).replace(/\.json$/, '');
      if (!init.method || init.method === 'get') return response(200, read(path), { ETag: 'test-etag' });
      const value = JSON.parse(init.payload);
      if (init.method === 'patch') for (const [key, entry] of Object.entries(value)) write([path,key].filter(Boolean).join('/'), entry);
      else write(path, value);
      return response(200, value);
    } },
  });
  vm.runInContext(source, ctx);
  ctx.getConfig_ = () => ({ databaseUrl: 'https://database.test', projectId: 'test' });
  ctx.getAccessToken_ = () => 'test';
  write('users', { resident: { fcmTokens: { a: { token: 'token-a', platform: 'android' }, b: { token: 'token-b', platform: 'android' } } } });
  return { ctx, store, calls, plans, write, tick: (minute, rain = 0, soil = 0, tilt = false) => {
    now = NOW + minute * 60000; write('sensors', sensors(now, rain, soil, tilt)); ctx.pollFirebaseForPushEvents();
  } };
}
test('poll integration persists baseline, creates one event and never resends accepted recipients', () => {
  const h = harness(); h.tick(0); h.tick(1,700); h.tick(2,700); h.tick(3,700);
  assert.equal(h.calls.length, 2);
  assert.equal(Object.keys(h.store.notificationEvents).length, 1);
  assert.equal(h.store.notificationEvents['event-1'].status, 'accepted');
  assert.equal(h.calls[0].message.android.notification.tag, 'event-1');
  assert.equal(h.calls[0].message.data.eventId, 'event-1');
  assert.equal(h.store.fcmPoller.lease, undefined);
});
test('partial transient failure retries only failed recipient and respects Retry-After', () => {
  const h = harness(); h.tick(0); h.tick(1,700);
  h.plans.push({code:200}, {code:503,headers:{'Retry-After':'180'}}); h.tick(2,700);
  h.tick(3,700); h.tick(4,700);
  assert.equal(h.calls.length, 2);
  h.tick(6,700);
  assert.equal(h.calls.length, 3);
  assert.equal(h.calls[2].message.token, 'token-b');
  assert.equal(h.store.notificationEvents['event-1'].status, 'accepted');
});
test('network ambiguity is audited without duplicate retries', () => {
  const h = harness(); h.tick(0); h.tick(1,700);
  h.plans.push({error:true}); h.tick(2,700); h.tick(3,700);
  assert.equal(h.calls.length, 2);
  assert.equal(h.store.notificationEvents['event-1'].status, 'unknown');
});
test('invalid tokens removed and remaining recipients still processed', () => {
  const h = harness(); h.tick(0); h.tick(1,700);
  h.plans.push({code:404,body:{error:{details:[{'@type':'type.googleapis.com/google.firebase.fcm.v1.FcmError',errorCode:'UNREGISTERED'}]}}});
  h.tick(2,700);
  assert.equal(h.store.users.resident.fcmTokens.a, undefined);
  assert.ok(h.store.users.resident.fcmTokens.b);
  assert.equal(h.calls.length, 2);
});
test('occupied cross-project lease prevents all processing', () => {
  const h = harness(); h.write('fcmPoller/lease', { expiresAt: NOW + 600000 }); h.tick(0,900,90,true);
  assert.equal(h.store.fcmPoller.state, undefined); assert.equal(h.calls.length,0);
});
test('no token event is retained without later backlog delivery', () => {
  const h = harness(); h.write('users', {}); h.tick(0); h.tick(1,700); h.tick(2,700);
  assert.equal(h.store.notificationEvents['event-1'].status, 'no-recipients');
  h.write('users', { resident: {fcmTokens:{a:'new-token'}} }); h.tick(3,700);
  assert.equal(h.calls.length,0);
});
test('in-flight crash checkpoint becomes unknown on restart without another send', () => {
  const h = harness(); h.tick(0); h.tick(1,700);
  h.plans.push({code:503}, {code:503}); h.tick(2,700);
  const recipient = Object.values(h.store.fcmPoller.outbox['event-1'].recipients)[0];
  recipient.status = 'sending';
  h.tick(5,700);
  assert.equal(h.calls.length,3);
  assert.equal(h.calls[2].message.token,'token-b');
  assert.equal(h.store.notificationEvents['event-1'].status,'unknown');
});
test('Danger supersedes old pending individual sends as well as simultaneous new ones', () => {
  const h = harness(); h.tick(0); h.tick(1,700);
  h.plans.push({code:503}, {code:503}); h.tick(2,700);
  h.tick(3,900,90,true); h.tick(6,900,90,true);
  assert.equal(h.calls.length,4);
  assert.ok(h.calls.slice(2).every(call => call.message.data.classification === 'Danger'));
  assert.ok(Object.values(h.store.fcmPoller.deliveries['event-1'].recipients).every(r => r.status === 'superseded'));
});
test('payload validation failure does not delete a valid registration', () => {
  const h = harness(); h.tick(0); h.tick(1,700);
  h.plans.push({code:400,body:{error:{message:'Invalid notification payload',details:[{'@type':'type.googleapis.com/google.firebase.fcm.v1.FcmError',errorCode:'INVALID_ARGUMENT'}]}}});
  h.tick(2,700);
  assert.ok(h.store.users.resident.fcmTokens.a);
  assert.equal(h.store.notificationEvents['event-1'].status,'partial-or-failed');
});
test('new announcements keep existing delivery and do not duplicate in sensor history', () => {
  const h = harness(); h.write('announcements', {a:{title:'Existing',message:'Existing body'}}); h.tick(0);
  h.write('announcements/b', {title:'Community advisory',message:'Follow official advisories.'}); h.tick(1); h.tick(2);
  assert.equal(h.calls.length,2);
  assert.equal(h.calls[0].message.data.announcementId,'b');
  assert.equal(h.store.notificationEvents,undefined);
});
test('expired retries are recorded without stale pushes', () => {
  const h = harness(); h.tick(0); h.tick(1,700);
  h.plans.push({code:429,headers:{'Retry-After':'3600'}},{code:429,headers:{'Retry-After':'3600'}}); h.tick(2,700);
  h.tick(40,700);
  assert.equal(h.calls.length,2);
  assert.ok(Object.values(h.store.fcmPoller.deliveries['event-1'].recipients).every(r => r.status === 'expired'));
});
test('logout before retry skips removed device registration', () => {
  const h = harness(); h.tick(0); h.tick(1,700);
  h.plans.push({code:503},{code:503}); h.tick(2,700);
  h.write('users/resident/fcmTokens/a',null); h.tick(5,700);
  assert.equal(h.calls.length,3);
  assert.equal(h.calls[2].message.token,'token-b');
});
