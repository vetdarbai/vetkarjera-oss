/* Run: node --conditions=react-server scripts/check-supabase.cjs
 * Exercises the actual TypeScript helpers without adding a public route.
 * The browser helper is exercised in Node; browser rendering is a separate check.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
require('@next/env').loadEnvConfig(process.cwd());

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

async function main() {
  for (const kind of ['server', 'client']) {
    const { createClient } = require(path.resolve(`lib/supabase/${kind}.ts`));
    const client = createClient();
    const { data, error } = await client.from('jobs').select('id').limit(1);
    assert.equal(error, null, `${kind}: ${error?.code || 'request failed'}`);
    assert.deepEqual(data, [], `${kind}: anonymous reads must return no rows`);
    const privateRead = await client.from('profiles').select('id').limit(1);
    assert.equal(privateRead.error?.code, '42501', `${kind}: private tables must reject anonymous reads`);
    console.log(`${kind} helper: connection PASS; anonymous RLS PASS; private access denied PASS`);
  }

  const { getSupabaseEnvironment } = require(path.resolve('lib/supabase/env.ts'));
  const saved = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  try {
    for (const invalid of ['sb_secret_test', `header.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.signature`]) {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = invalid;
      assert.throws(getSupabaseEnvironment, /public anon or publishable key/);
    }
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    assert.throws(getSupabaseEnvironment, /Missing/);
  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = saved;
  }
  console.log('Privileged-key rejection and missing-env checks: PASS');
}

main().catch((error) => {
  // Do not log configuration, HTTP headers, or key values.
  console.error(error.message);
  process.exitCode = 1;
});
