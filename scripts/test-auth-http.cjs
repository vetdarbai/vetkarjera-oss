// HTTP tests against a locally running production build. Never sends email.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const origin = 'http://127.0.0.1:4320';
const manifest = JSON.parse(fs.readFileSync('.next/server/server-reference-manifest.json', 'utf8'));
const action = name => Object.entries(manifest.node).find(([, value]) => value.exportedName === name)[0];
async function post(name, args, requestOrigin = origin) {
  return fetch(origin + '/prisijungti', {
    method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8', 'Next-Action': action(name), Origin: requestOrigin },
    body: JSON.stringify(args),
  });
}
(async () => {
  for (const route of ['/', '/prisijungti', '/patvirtinti-pasta', '/pamirsau-slaptazodi', '/naujas-slaptazodis', '/skelbimai', '/skelbimas/1']) {
    const response = await fetch(origin + route);
    assert.equal(response.status, 200, route);
    if (route === '/prisijungti') assert.match(response.headers.get('cache-control'), /no-store/);
  }
  console.log('PASS: HTTP route status and login cache isolation');
  const csrf = await post('registerAccount', [{ role: 'admin' }], 'https://evil.example');
  assert.ok(csrf.status >= 400, 'Cross-origin action must be rejected');
  console.log('PASS: cross-origin Server Action rejected');
  const tamper = await post('registerAccount', [{ role: 'admin', agreedToTerms: true }]);
  const tamperBody = await tamper.text();
  assert.equal(tamper.status, 200);
  assert.match(tamperBody, /"ok":false/);
  console.log('PASS: direct HTTP admin role tampering rejected');
  const unauth = await post('updatePassword', [{ password: 'example-test-password', confirmPassword: 'example-test-password' }]);
  assert.match(await unauth.text(), /"ok":false/);
  console.log('PASS: unauthenticated password update rejected');
  for (const suffix of ['', '?code=expired', '?token_hash=invalid&type=admin']) {
    const response = await fetch(origin + '/auth/confirm' + suffix, { redirect: 'manual' });
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('location'), 'https://www.vetkarjera.lt/auth/klaida');
    assert.match(response.headers.get('cache-control'), /no-store/);
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  }
  console.log('PASS: missing/invalid callback safely redirects without token leakage');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
