import { Apartment, CalendarEvent } from '../types';
import { isAllowedIcalUrl, normalizeIcalUrl } from './icalUrl';

const CACHE_KEY = 'caribean_airbnb_events';
const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_FEED_CHARS = 1_000_000;
const MAX_NIGHTS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface IcsEvent {
  uid: string;
  start: string;
  end: string;
  summary: string;
}

export interface AirbnbSyncResult {
  events: CalendarEvent[];
  syncedAt: number | null;
  errors: string[];
}

interface CachedSync {
  urls: string[];
  syncedAt: number;
  events: CalendarEvent[];
}

/** Unfold RFC 5545 continuation lines and normalize line endings. */
function unfoldLines(text: string): string[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const unfolded: string[] = [];

  for (const line of lines) {
    if (/^[ \t]/.test(line) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }
  return unfolded;
}

function decodeText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\([,;\\])/g, '$1')
    .trim();
}

/** Both DATE (YYYYMMDD) and DATE-TIME (YYYYMMDDTHHMMSSZ) values are supported. */
function parseIcsDate(value: string): string | null {
  const match = /^(\d{4})(\d{2})(\d{2})/.exec(value.trim());
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

export function parseIcs(text: string): IcsEvent[] {
  const events: IcsEvent[] = [];
  let properties: Record<string, string> = {};
  let inEvent = false;

  const saveEvent = () => {
    const start = parseIcsDate(properties.DTSTART || '');
    if (!start) return;
    events.push({
      uid: properties.UID || `${start}-${properties.SUMMARY || 'event'}`,
      start,
      end: parseIcsDate(properties.DTEND || '') || start,
      summary: decodeText(properties.SUMMARY || ''),
    });
  };

  for (const line of unfoldLines(text)) {
    const upper = line.trim().toUpperCase();

    if (upper === 'BEGIN:VEVENT') {
      inEvent = true;
      properties = {};
      continue;
    }
    if (upper === 'END:VEVENT') {
      if (inEvent) saveEvent();
      inEvent = false;
      properties = {};
      continue;
    }
    if (!inEvent) continue;

    const separator = line.indexOf(':');
    if (separator === -1) continue;
    const key = line.slice(0, separator).split(';')[0].toUpperCase();
    properties[key] = line.slice(separator + 1);
  }

  return events;
}

/** DTEND is exclusive in iCal, so the checkout day is not marked as occupied. */
export function expandStayDates(start: string, end: string): string[] {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
    return [start];
  }

  const dates: string[] = [];
  for (let time = startDate.getTime(); time < endDate.getTime() && dates.length < MAX_NIGHTS; time += DAY_MS) {
    dates.push(new Date(time).toISOString().slice(0, 10));
  }
  return dates;
}

function toCalendarEvents(event: IcsEvent, apartment: Apartment): CalendarEvent[] {
  return expandStayDates(event.start, event.end).map(date => ({
    id: `airbnb-${apartment.id}-${event.uid}-${date}`,
    date,
    type: 'booking' as const,
    apartmentName: apartment.name,
    title: 'Reserva Airbnb',
    details: event.summary || 'Reserva sincronizada desde Airbnb',
  }));
}

function readCache(urls: string[]): CachedSync | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as CachedSync;
    if (!Array.isArray(cache.events) || !Array.isArray(cache.urls)) return null;
    if (cache.urls.join('|') !== urls.join('|')) return null;
    if (Date.now() - cache.syncedAt > CACHE_TTL_MS) return null;
    return cache;
  } catch {
    return null;
  }
}

function writeCache(cache: CachedSync): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage may be unavailable (private mode); sync still works without cache.
  }
}

export function clearAirbnbCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore.
  }
}

async function fetchFeed(url: string): Promise<string> {
  const response = await fetch(`/api/ical?url=${encodeURIComponent(normalizeIcalUrl(url))}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error) message = String(body.error);
    } catch {
      // Non-JSON error response.
    }
    throw new Error(message);
  }

  const text = await response.text();
  if (text.length > MAX_FEED_CHARS) throw new Error('El calendario es demasiado grande');
  if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error('El enlace no devolvió un calendario válido');
  return text;
}

/**
 * Fetches every configured Airbnb feed and returns one calendar event per
 * occupied day. Results are cached locally for 30 minutes.
 */
export async function getAirbnbEvents(
  apartments: Apartment[],
  options: { force?: boolean } = {},
): Promise<AirbnbSyncResult> {
  const feeds: { apartment: Apartment; url: string }[] = [];
  const errors: string[] = [];

  for (const apartment of apartments) {
    const url = normalizeIcalUrl(apartment.icalUrl || '');
    if (!url) continue;
    if (!isAllowedIcalUrl(url)) {
      errors.push(`${apartment.name}: la URL no es un enlace iCal de Airbnb`);
      continue;
    }
    feeds.push({ apartment, url });
  }

  const urls = feeds.map(feed => feed.url).sort();
  if (urls.length === 0) {
    if (!options.force) {
      const cached = readCache([]);
      if (cached) return { events: cached.events, syncedAt: cached.syncedAt, errors: [] };
    }
    return { events: [], syncedAt: null, errors };
  }

  const cached = options.force ? null : readCache(urls);
  if (cached) return { events: cached.events, syncedAt: cached.syncedAt, errors: [] };

  const results = await Promise.allSettled(feeds.map(async ({ apartment, url }) => {
    const ics = await fetchFeed(url);
    return parseIcs(ics).flatMap(event => toCalendarEvents(event, apartment));
  }));

  const events: CalendarEvent[] = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      events.push(...result.value);
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      errors.push(`${feeds[index].apartment.name}: ${reason}`);
    }
  });

  if (errors.length > 0) {
    return { events, syncedAt: null, errors };
  }

  const syncedAt = Date.now();
  writeCache({ urls, syncedAt, events });
  return { events, syncedAt, errors: [] };
}

export const IcalService = { getAirbnbEvents, clearAirbnbCache, parseIcs, expandStayDates };
