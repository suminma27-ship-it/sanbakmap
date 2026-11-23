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
    const verified = route[statusKey] === 'verified';
    assert.ok(['verified','unverified'].includes(route[statusKey]), `invalid status ${route.id}`);
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
