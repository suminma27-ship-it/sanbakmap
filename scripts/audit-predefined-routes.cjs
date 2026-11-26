// Non-destructive catalog integrity check; run from repository root with Node.js.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = process.cwd();
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/seorak-predefined-routes.json'), 'utf8'));
const counts = {'대청봉':6, '기타코스':9, '종주코스':8};
assert.equal(catalog.routes.length, 23);
assert.equal(new Set(catalog.routes.map(r => r.id)).size, 23, 'duplicate route ID');
for (const [group, count] of Object.entries(counts)) {
  assert.equal(catalog.routes.filter(r => r.group === group).length, count, group);
}
for (const route of catalog.routes) {
  assert.ok(counts[route.group], `unknown group ${route.id}`);
  assert.ok(route.name && Array.isArray(route.via) && route.via.length >= 2, `missing route metadata ${route.id}`);
  for (const [statusKey, fileKey] of [['geometryStatus','geometryFile'],['profileStatus','profileFile']]) {
    const verified = ['verified','reference'].includes(route[statusKey]);
    assert.ok(['verified','reference','unverified'].includes(route[statusKey]), `invalid status ${route.id}`);
    assert.equal(Boolean(route[fileKey]), verified, `status/file mismatch ${route.id}:${fileKey}`);
    if (verified) {
      const target = path.resolve(root, route[fileKey]);
      assert.ok(target.startsWith(root + path.sep), `path traversal ${route.id}`);
      assert.ok(fs.existsSync(target), `missing verified asset ${route.id}: ${route[fileKey]}`);
    }
  }
  assert.ok(['unknown','open','closed'].includes(route.accessStatus), `invalid access status ${route.id}`);
}
const verified = catalog.routes.filter(r => r.geometryStatus === 'verified' && r.profileStatus === 'verified');
console.log(`Catalog valid: ${catalog.routes.length} routes, ${verified.length} geometry+profile verified; no invented assets implied.`);


function haversineMeters(a, b) {
  const rad = Math.PI / 180, R = 6371008.8;
  const dLat = (b[1] - a[1]) * rad, dLon = (b[0] - a[0]) * rad;
  const x = Math.sin(dLat/2)**2 + Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}
for (const route of verified) {
  const geometry = JSON.parse(fs.readFileSync(path.resolve(root, route.geometryFile), 'utf8'));
  const profile = JSON.parse(fs.readFileSync(path.resolve(root, route.profileFile), 'utf8'));
  const coords = geometry.geometry?.coordinates;
  assert.equal(geometry.geometry?.type, 'LineString', `not a single continuous LineString: ${route.id}`);
  assert.ok(Array.isArray(coords) && coords.length >= 2, `missing coordinates: ${route.id}`);
  let distance = 0;
  for (let i = 0; i < coords.length; i++) {
    const c = coords[i];
    assert.ok(Array.isArray(c) && c.length >= 2 && c.slice(0,2).every(Number.isFinite), `invalid coordinate: ${route.id}`);
    assert.ok(Math.abs(c[0]) <= 180 && Math.abs(c[1]) <= 90, `out of range coordinate: ${route.id}`);
    if (i) {
      const step = haversineMeters(coords[i-1], c);
      assert.ok(step <= 500, `large geometry gap ${step.toFixed(1)}m: ${route.id}`);
      distance += step;
    }
  }
  assert.equal(profile.routeId, route.id, `DEM route ID mismatch: ${route.id}`);
  assert.ok(Array.isArray(profile.points) && profile.points.length >= 2, `DEM samples missing: ${route.id}`);
  assert.ok(Math.abs(distance - profile.totalMeters) <= Math.max(5, distance * .005), `geometry/DEM distance mismatch: ${route.id}`);
  const samples = profile.points;
  assert.ok(Math.abs(samples[0].distanceMeters) <= 1, `DEM does not start at route origin: ${route.id}`);
  assert.ok(Math.abs(samples.at(-1).distanceMeters - distance) <= 5, `DEM does not reach route end: ${route.id}`);
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    assert.ok(Number.isFinite(s.distanceMeters) && Number.isFinite(s.elevationMeters), `invalid DEM sample: ${route.id}`);
    if (i) assert.ok(s.distanceMeters > samples[i-1].distanceMeters && s.distanceMeters - samples[i-1].distanceMeters <= 250, `DEM gap/order error: ${route.id}`);
  }
  console.log(`Validated ${route.id}: ${coords.length} vertices, ${samples.length} DEM samples, ${distance.toFixed(1)}m`);
}
