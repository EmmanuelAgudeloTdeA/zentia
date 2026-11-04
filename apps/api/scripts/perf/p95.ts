/**
 * RNF-05: p50, p95 y máximo de PDF, asistente y rutas de referencia con N solicitudes secuenciales.
 * Uso: pnpm --filter @zentia/api perf:p95 -- --base-url https://staging.example.com --email admin@x.co --password ...
 * Crea datos marcados [PERF] (cliente, productos y dos cotizaciones) con el usuario indicado, que debe ser administrador.
 */
import { performance } from 'node:perf_hooks';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    'base-url': { type: 'string', default: 'http://localhost:3000' },
    email: { type: 'string' },
    password: { type: 'string' },
    n: { type: 'string', default: '100' },
    // El asistente permite 10 solicitudes por minuto por usuario.
    'ai-delay-ms': { type: 'string', default: '6100' },
    only: { type: 'string' },
  },
});

const BASE = `${values['base-url'].replace(/\/$/, '')}/api`;
const N = Number.parseInt(values.n, 10);
const AI_DELAY_MS = Number.parseInt(values['ai-delay-ms'], 10);
const THRESHOLD_MS = 5000;

if (!values.email || !values.password) {
  console.error('Faltan --email y --password');
  process.exit(1);
}

let token = '';

async function login(): Promise<void> {
  const response = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: values.email, password: values.password }),
  });
  if (!response.ok) throw new Error(`Login ${response.status}`);
  token = ((await response.json()) as { accessToken: string }).accessToken;
}

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok)
    throw new Error(`${method} ${path} → ${response.status} ${await response.text()}`);
  return (await response.json()) as T;
}

function percentile(sorted: readonly number[], p: number): number {
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)] ?? 0;
}

interface Result {
  scenario: string;
  n: number;
  p50: number;
  p95: number;
  max: number;
  errors: number;
}

async function measure(
  scenario: string,
  path: string,
  method = 'GET',
  delayMs = 0,
): Promise<Result> {
  // El access token dura 15 min: se renueva antes de cada escenario.
  await login();
  const times: number[] = [];
  let errors = 0;
  for (let i = 0; i < N; i++) {
    const started = performance.now();
    const response = await fetch(`${BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    });
    await response.arrayBuffer();
    times.push(performance.now() - started);
    if (!response.ok) errors++;
    if (delayMs > 0 && i < N - 1) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  times.sort((a, b) => a - b);
  const result = {
    scenario,
    n: N,
    p50: percentile(times, 50),
    p95: percentile(times, 95),
    max: times[times.length - 1] ?? 0,
    errors,
  };
  console.error(`✓ ${scenario}: p95 ${result.p95.toFixed(0)} ms (${errors} errores)`);
  return result;
}

interface Created {
  id: string;
  updatedAt: string;
}

async function prepare(): Promise<{ quote10: string; quote100: string }> {
  await login();
  const run = Date.now().toString(36).toUpperCase();
  const customer = await api<Created>('POST', '/customers', {
    name: `[PERF] Cliente ${run}`,
    documentId: `PERF${run}`,
    email: 'perf@example.com',
  });
  const products: string[] = [];
  for (let i = 1; i <= 100; i++) {
    const product = await api<Created>('POST', '/products', {
      name: `[PERF] Producto ${run}-${i}`,
      category: `Rendimiento ${(i % 5) + 1}`,
      price: String(10_000 * i),
      vatRate: i % 3 === 0 ? 'REDUCED_5' : 'GENERAL_19',
    });
    products.push(product.id);
  }
  const create = (count: number) =>
    api<Created>('POST', '/quotes', {
      customerId: customer.id,
      items: products.slice(0, count).map((productId, index) => ({
        productId,
        quantity: String((index % 4) + 1),
      })),
    });
  const quote10 = await create(10);
  const quote100 = await create(100);
  // El asistente solo aplica a Enviadas.
  await api('POST', `/quotes/${quote10.id}/send`, { updatedAt: quote10.updatedAt });
  return { quote10: quote10.id, quote100: quote100.id };
}

const ms = (value: number) => `${(value / 1000).toFixed(2)} s`;

async function main(): Promise<void> {
  const { quote10, quote100 } = await prepare();
  const scenarios: [string, string, string, number][] = [
    ['PDF de 10 líneas', `/quotes/${quote10}/pdf`, 'GET', 0],
    ['PDF de 100 líneas', `/quotes/${quote100}/pdf`, 'GET', 0],
    ['Asistente de seguimiento', `/quotes/${quote10}/follow-up-message`, 'POST', AI_DELAY_MS],
    ['GET /api/quotes (referencia)', '/quotes?page=1&pageSize=20', 'GET', 0],
    ['GET /api/dashboard/summary (referencia)', '/dashboard/summary', 'GET', 0],
  ];
  const results: Result[] = [];
  for (const [name, path, method, delay] of scenarios) {
    if (values.only && !name.toLowerCase().includes(values.only.toLowerCase())) continue;
    results.push(await measure(name, path, method, delay));
  }
  console.log(`Entorno: ${values['base-url']} · ${new Date().toISOString()} · N = ${N}\n`);
  console.log('| Escenario | N | p50 | p95 | Máximo | Errores | p95 < 5 s |');
  console.log('|---|---|---|---|---|---|---|');
  for (const r of results) {
    const ok = r.p95 < THRESHOLD_MS && r.errors === 0 ? 'Sí' : 'No';
    console.log(
      `| ${r.scenario} | ${r.n} | ${ms(r.p50)} | ${ms(r.p95)} | ${ms(r.max)} | ${r.errors} | ${ok} |`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
