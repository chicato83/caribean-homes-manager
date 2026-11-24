import { isAllowedIcalUrl } from '../../services/icalUrl';

/**
 * Cloudflare Pages Function: GET /api/ical?url=<airbnb-ical-url>
 * Fetches the Airbnb feed server-side because Airbnb does not send CORS headers.
 */
const MAX_FEED_CHARS = 1_000_000;
const TIMEOUT_MS = 10_000;

interface PagesContext {
  request: Request;
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function onRequestGet({ request }: PagesContext): Promise<Response> {
  const urlParam = new URL(request.url).searchParams.get('url') || '';

  if (!isAllowedIcalUrl(urlParam)) {
    return jsonError('URL de calendario no válida', 400);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(urlParam, {
      signal: controller.signal,
      headers: { 'User-Agent': 'CaribeanHomes-CalendarSync/1.0' },
    });

    if (!upstream.ok) {
      return jsonError(`Airbnb devolvió HTTP ${upstream.status}`, 502);
    }

    const text = await upstream.text();
    if (text.length > MAX_FEED_CHARS) {
      return jsonError('El calendario es demasiado grande', 413);
    }

    return new Response(text, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    return jsonError(timedOut ? 'Tiempo de espera agotado al contactar Airbnb' : 'No se pudo obtener el calendario', 502);
  } finally {
    clearTimeout(timer);
  }
}
