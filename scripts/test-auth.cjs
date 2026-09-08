/* Deterministic tests of actual validation/actions/callback, with Auth transport mocked.
 * They do not claim email delivery or live Supabase authentication.
 * Run: node scripts/test-auth.cjs
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const originalLoad = Module._load;
let responseError = null, confirmed = true, session = false, calls = [], redirectType = null, subscriber = () => {};
const client = { auth: {
  onAuthStateChange: fn => { subscriber = fn; return { data: { subscription: { unsubscribe() {} } } }; },
  signUp: async input => { calls.push(['signup', input]); return { data: { session: session ? {} : null }, error: responseError }; },
  signInWithPassword: async input => { calls.push(['login', input]); return { error: responseError }; },
  signOut: async input => { calls.push(['logout', input]); return { error: responseError }; },
  resend: async input => { calls.push(['resend', input]); return { error: responseError }; },
  resetPasswordForEmail: async (...input) => { calls.push(['reset', input]); return { error: responseError }; },
  updateUser: async input => { calls.push(['update', input]); return { error: responseError }; },
  exchangeCodeForSession: async input => { calls.push(['exchange', input]); if (!responseError) subscriber(redirectType === 'recovery' ? 'PASSWORD_RECOVERY' : 'SIGNED_IN'); return { data: {}, error: responseError }; },
  verifyOtp: async input => { calls.push(['verify', input]); return { error: responseError }; },
}};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, fileName: filename,
}).outputText, filename);
Module._load = function(id, parent, isMain) {
  if (id === '@/lib/supabase/server') return { createClient: async () => client };
  if (id === '@/lib/auth/session') return { getActiveUser: async () => confirmed ? { id: 'test-user', role: 'specialist' } : null };
  if (id === 'next/cache') return { revalidatePath: () => {} };
  if (id.startsWith('@/')) return originalLoad.call(this, path.resolve(id.slice(2)), parent, isMain);
  return originalLoad.call(this, id, parent, isMain);
};
const { safeNext, isAccountRole, isEmail, isPassword } = require('../lib/auth/validation.ts');
const actions = require('../app/auth/actions.ts');
require.extensions['.tsx'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX }, fileName: filename,
}).outputText, filename);
const { GET } = require('../app/auth/confirm/route.ts');
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
const valid = () => ({ email: 'test@example.com', password: 'Test-password-123', confirmPassword: 'Test-password-123', agreedToTerms: true, role: 'specialist', extraPrivateProfile: 'must never be sent' });
test('redirect attacks are rejected; internal route is preserved', () => {
  for (const value of ['https://evil.test', '//evil.test', '/\\evil.test', '/%2f%2fevil.test', '/auth/confirm', '/skelbti?next=https://evil.test', '/skelbti\n', null, ['/skelbti']]) assert.equal(safeNext(value), '/');
  assert.equal(safeNext('/skelbimas/1'), '/skelbimas/1');
  assert.equal(safeNext('/skelbimai?sort=newest'), '/skelbimai?sort=newest');
});
test('roles, email, and password bounds', () => {
  assert.equal(isAccountRole('admin'), false); assert.equal(isAccountRole({}), false);
  assert.equal(isEmail('bad'), false); assert.equal(isEmail('x@y.lt'), true);
  assert.equal(isPassword('short'), false); assert.equal(isPassword('x'.repeat(129)), false); assert.equal(isPassword('x'.repeat(8)), true);
});
test('signed-in UI contains only the approved title and secondary logout button', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const LoginForm = require('../components/LoginForm.tsx').default;
  const html = renderToStaticMarkup(React.createElement(LoginForm, { signedIn: true, next: '/', passwordChanged: false }));
  assert.match(html, /Esate prisijungęs/); assert.match(html, /Atsijungti/);
  assert.match(html, /btn btn-secondary/); assert.match(html, /margin-top:20px/);
  assert.doesNotMatch(html, /<input|btn-primary|VETKARJERA PASKYRA|vartotojo meniu/);
});
for (const role of ['specialist', 'employer']) test(role + ' signup only transmits basic fields', async () => {
  assert.equal((await actions.registerAccount({ ...valid(), role })).ok, true);
  assert.deepEqual(calls[0][1], { email: 'test@example.com', password: 'Test-password-123', options: { data: { account_role: role }, emailRedirectTo: 'https://www.vetkarjera.lt/auth/confirm' } });
});
for (const input of [{ role: 'admin' }, { role: 'unknown' }, { email: 'bad' }, { password: 'short' }, { confirmPassword: 'different' }, { agreedToTerms: false }]) {
  test('invalid signup ' + Object.keys(input)[0] + ':' + String(Object.values(input)[0]), async () => {
    assert.equal((await actions.registerAccount({ ...valid(), ...input })).ok, false); assert.equal(calls.length, 0);
  });
}
test('duplicate signup returns same public result', async () => {
  const fresh = await actions.registerAccount(valid()); responseError = { code: 'user_already_exists', status: 422 };
  assert.deepEqual(await actions.registerAccount(valid()), fresh);
});
test('confirmation accidentally disabled fails closed and signs out', async () => {
  session = true; assert.equal((await actions.registerAccount(valid())).ok, false); assert.equal(calls[1][0], 'logout');
});
test('login validates malformed request safely', async () => {
  assert.equal((await actions.loginAccount({ email: 123, password: 'x' })).ok, false);
});
test('login redirects to homepage or approved original route', async () => {
  assert.equal((await actions.loginAccount(valid())).redirect, '/');
  assert.equal((await actions.loginAccount({ ...valid(), next: '/skelbti' })).redirect, '/skelbti');
  assert.equal((await actions.loginAccount({ ...valid(), next: '//evil.test' })).redirect, '/');
});
test('wrong password and unverified login use same error', async () => {
  responseError = { code: 'invalid_credentials' }; const wrong = await actions.loginAccount(valid());
  responseError = { code: 'email_not_confirmed' }; assert.deepEqual(await actions.loginAccount(valid()), wrong);
});
test('missing verified profile closes successful auth session', async () => {
  confirmed = false; assert.equal((await actions.loginAccount(valid())).ok, false); assert.equal(calls[1][0], 'logout');
});
test('logout revokes sessions and returns home', async () => {
  assert.equal((await actions.logoutAccount()).redirect, '/'); assert.deepEqual(calls[0], ['logout', { scope: 'global' }]);
});
test('resend and reset use configured production URL', async () => {
  assert.equal((await actions.sendAuthEmail('test@example.com', 'verification')).ok, true);
  assert.equal((await actions.sendAuthEmail('test@example.com', 'recovery')).ok, true);
  assert.equal(calls[0][1].options.emailRedirectTo, 'https://www.vetkarjera.lt/auth/confirm');
  assert.equal(calls[1][1][1].redirectTo, 'https://www.vetkarjera.lt/auth/confirm');
});
test('email throttle and neutral unknown-account response', async () => {
  responseError = { status: 429 }; assert.equal((await actions.sendAuthEmail('test@example.com', 'verification')).retryAfter, 60);
  responseError = { code: 'user_not_found' }; assert.equal((await actions.sendAuthEmail('test@example.com', 'recovery')).ok, true);
});
test('password mismatch and invalid session cannot update', async () => {
  assert.equal((await actions.updatePassword({ password: 'long-enough', confirmPassword: 'different' })).ok, false);
  confirmed = false; assert.equal((await actions.updatePassword(valid())).ok, false); assert.equal(calls.length, 0);
});
test('password update signs out all sessions and returns success', async () => {
  assert.equal((await actions.updatePassword(valid())).redirect, '/prisijungti?password=changed');
  assert.equal(calls[0][0], 'update'); assert.equal(calls[1][0], 'logout');
});
test('PKCE confirmation, recovery, invalid and expired links', async () => {
  for (const kind of [null, 'recovery']) {
    redirectType = kind;
    const r = await GET({ nextUrl: new URL('https://www.vetkarjera.lt/auth/confirm?code=test-code&next=//evil.test') });
    assert.equal(r.headers.get('location'), 'https://www.vetkarjera.lt' + (kind ? '/naujas-slaptazodis' : '/'));
    assert.match(r.headers.get('cache-control'), /no-store/);
  }
  responseError = { code: 'flow_state_expired' };
  const r = await GET({ nextUrl: new URL('https://www.vetkarjera.lt/auth/confirm?code=expired') });
  assert.equal(r.headers.get('location'), 'https://www.vetkarjera.lt/auth/klaida');
  assert.equal((await GET({ nextUrl: new URL('https://www.vetkarjera.lt/auth/confirm?token_hash=bad&type=admin') })).headers.get('location'), 'https://www.vetkarjera.lt/auth/klaida');
});
(async () => {
  for (const { name, fn } of tests) {
    responseError = null; confirmed = true; session = false; calls = []; redirectType = null;
    await fn(); console.log('PASS: ' + name);
  }
  console.log(tests.length + ' deterministic auth tests passed (mocked Auth transport).');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
