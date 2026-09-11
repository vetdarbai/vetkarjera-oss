// Browser checks of real local pages. No valid account submission or email sending.
// Set AGENT_BROWSER_BIN to an installed agent-browser executable.
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const path = require('node:path');
const bin = process.env.AGENT_BROWSER_BIN;
if (!bin) throw new Error('Set AGENT_BROWSER_BIN before running browser checks.');
const origin = process.env.AUTH_TEST_ORIGIN || 'http://127.0.0.1:4320';
const session = 'vk-stage3-qa';
const run = (...args) => execFileSync(bin, ['--session', session, ...args], { encoding: 'utf8', timeout: 45000, windowsHide: true }).trim();
function evaluate(code) { return JSON.parse(run('eval', code)); }
for (const width of [1440, 390]) {
  run('set', 'viewport', String(width), width === 1440 ? '900' : '844');
  for (const route of ['/', '/prisijungti', '/registracija/kandidatas', '/registracija/darbdavys', '/patvirtinti-pasta', '/pamirsau-slaptazodi', '/naujas-slaptazodis']) {
    run('open', origin + route);
    const page = evaluate(`({title:document.querySelector('h1')?.textContent,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,profile:!!document.querySelector('nav a[href="/profilis"]')})`);
    assert.ok(page.title, route); assert.equal(page.overflow, false, route); assert.equal(page.profile, false);
    if (route.startsWith('/registracija/')) {
      assert.equal(evaluate('document.querySelectorAll("main input").length'), 6);
      run('click', 'main button[type="submit"]');
      assert.ok(evaluate('!!document.querySelector("#terms-error")'));
      run('fill', '#password', 'Synthetic-mismatch-123');
      run('fill', '#confirmPassword', 'Synthetic-different-123');
      run('click', 'main button[type="submit"]');
      assert.equal(evaluate('document.querySelector("#confirmPassword-error").textContent'), 'Slaptažodžiai nesutampa.');
      assert.equal(evaluate('document.querySelector("#confirmPassword").getAttribute("aria-invalid")'), 'true');
      assert.equal(evaluate('document.documentElement.scrollWidth>document.documentElement.clientWidth'), false);
      run('screenshot', path.join(require('node:os').tmpdir(), `vetkarjera-${route.split('/').pop()}-${width}.png`), '--full');
    }
    console.log(`PASS: ${width}px ${route}: header, content, overflow${route.startsWith('/registracija/') ? ', basic fields and inline validation' : ''}`);
  }
}
run('open', origin + '/profilis');
assert.match(run('get', 'url'), /prisijungti\?next=/);
assert.equal(run('errors'), '');
console.log('PASS: profile redirect; no uncaught browser errors.');
run('close');
