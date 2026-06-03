export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.PREDICT_API_URL ?? 'http://127.0.0.1:8001';

export async function GET() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  const start = Date.now();

  try {
    const res = await fetch(`${BACKEND_URL}/health`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    const latency_ms = Date.now() - start;
    clearTimeout(timeout);

    if (!res.ok) {
      return Response.json({ status: 'error', error: `HTTP ${res.status}`, latency_ms }, { status: 502 });
    }

    const data = await res.json();
    return Response.json({ ...data, latency_ms });
  } catch (err) {
    clearTimeout(timeout);
    const latency_ms = Date.now() - start;
    const isTimeout = (err as Error)?.name === 'AbortError';
    return Response.json(
      { status: 'error', error: isTimeout ? 'timeout' : String(err), latency_ms },
      { status: 503 },
    );
  }
}
