// Local QA launcher. TLS proxy preserves the application's HTTPS-only guard.
// No hosted credentials, linked project, production mutation, or application auth override.
const fs = require('node:fs'), path = require('node:path'), https = require('node:https'), http = require('node:http');
const { spawn, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..'), output = path.join(root, '.staging-results');
fs.mkdirSync(output, { recursive: true });
const distro = 'VetKarjera-Stage43', stack = '/opt/vetkarjera-stage43';
function wsl(command) {
  const r = process.platform === 'win32' ? spawnSync('wsl.exe', ['-d', distro, '-u', 'root', '--', 'bash', '-lc', command], { encoding: 'utf8' }) : spawnSync('bash', ['-lc', command], { encoding: 'utf8' });
  if (r.status !== 0) throw Error('Local staging command failed');
  return r.stdout;
}
const text = wsl(`cd ${stack}; test ! -f supabase/.temp/project-ref; node node_modules/supabase/dist/supabase.js status --output json`);
const status = JSON.parse(text.slice(text.indexOf('{')));
const api = new URL(status.API_URL);
if (!['localhost', '127.0.0.1'].includes(api.hostname) || api.port !== '54321') throw Error('Hosted target refused');
const winOutput = process.platform === 'win32' ? output.replaceAll('\\', '/').replace(/^C:/, '/mnt/c') : output;
wsl(`mkdir -p '${winOutput}'; openssl req -x509 -newkey rsa:2048 -nodes -days 2 -keyout '${winOutput}/local-key.pem' -out '${winOutput}/local-cert.pem' -subj '/CN=127.0.0.1' -addext 'subjectAltName=IP:127.0.0.1,DNS:localhost' >/dev/null 2>&1`);
const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: 'https://127.0.0.1:4355', NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY, SUPABASE_STORAGE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY, NODE_EXTRA_CA_CERTS: path.join(output, 'local-cert.pem') };
const proxy = https.createServer({ key: fs.readFileSync(path.join(output, 'local-key.pem')), cert: fs.readFileSync(path.join(output, 'local-cert.pem')) }, (req, res) => {
  const upstream = http.request({ hostname: '127.0.0.1', port: 54321, path: req.url, method: req.method, headers: { ...req.headers, host: '127.0.0.1:54321' } }, r => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  upstream.on('error', () => { res.writeHead(503); res.end(); }); req.pipe(upstream);
});
proxy.listen(4355, '127.0.0.1', () => {
  const mode = process.argv[2] || 'dev';
  if (!['dev', 'build', 'start'].includes(mode)) throw Error('Unknown mode');
  const command = mode === 'build' && process.platform !== 'win32' ? 'npm' : process.execPath;
  const args = command === 'npm' ? ['run', 'build'] : [path.join(root, 'node_modules/next/dist/bin/next'), mode, ...(mode === 'build' ? [] : ['--hostname', '127.0.0.1', '--port', '4345'])];
  const child = spawn(command, args, { cwd: root, env, stdio: 'inherit' });
  const stop = () => { child.kill(); proxy.close(); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  child.on('exit', code => { proxy.close(); process.exitCode = code ?? 1; });
  console.log('Local profile QA: HTTPS Supabase proxy 4355, app 4345.');
});
