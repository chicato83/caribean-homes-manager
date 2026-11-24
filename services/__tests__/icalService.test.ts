import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseIcs, expandStayDates, getAirbnbEvents } from '../icalService';
import { isAllowedIcalUrl } from '../icalUrl';
import type { Apartment } from '../../types';

const SAMPLE_ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//Airbnb Inc//Airbnb Calendar//EN',
  'BEGIN:VEVENT',
  'UID:res-1@airbnb.com',
  'DTSTAMP:20250101T120000Z',
  'DTSTART;VALUE=DATE:20250310',
  'DTEND;VALUE=DATE:20250313',
  'SUMMARY:Reserved - Juan',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:block-1@airbnb.com',
  'DTSTART;VALUE=DATE:20250320',
  'DTEND;VALUE=DATE:20250321',
  'SUMMARY:Blocked\\, owner use',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

const apartment: Apartment = {
  id: 'apt-1',
  name: 'Apartamento Centro',
  address: 'Calle 1',
  description: '',
  imageUrl: '',
  pricePerNight: 100,
  bedrooms: 1,
  bathrooms: 1,
  amenities: [],
  recommendations: [],
  notes: '',
  icalUrl: 'https://www.airbnb.com/calendar/ical/12345/ics/abc.ics',
};

describe('iCal parsing', () => {
  it('parses Airbnb DATE events and decodes escaped text', () => {
    const events = parseIcs(SAMPLE_ICS);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      uid: 'res-1@airbnb.com',
      start: '2025-03-10',
      end: '2025-03-13',
      summary: 'Reserved - Juan',
    });
    expect(events[1].summary).toBe('Blocked, owner use');
  });

  it('treats DTEND as exclusive and unfolds long lines', () => {
    expect(expandStayDates('2025-03-10', '2025-03-13')).toEqual([
      '2025-03-10',
      '2025-03-11',
      '2025-03-12',
    ]);

    const folded = 'BEGIN:VEVENT\r\nUID:x\r\nDTSTART;VALUE=DATE:20250401\r\nDTEND;VALUE=DATE:2025\r\n 0402\r\nSUMMARY:Test\r\nEND:VEVENT';
    expect(parseIcs(folded)[0].end).toBe('2025-04-02');
  });
});

describe('iCal URL validation', () => {
  it('only accepts https Airbnb hosts', () => {
    expect(isAllowedIcalUrl(apartment.icalUrl!)).toBe(true);
    expect(isAllowedIcalUrl('https://airbnb.es/calendar/ical/x/ics/y.ics')).toBe(true);
    expect(isAllowedIcalUrl('https://www.airbnb.com.ar/calendar/ical/x/ics/y.ics')).toBe(true);
    expect(isAllowedIcalUrl('http://www.airbnb.com/calendar/ical/x')).toBe(false);
    expect(isAllowedIcalUrl('https://airbnb.evil.com/calendar/ical/x')).toBe(false);
    expect(isAllowedIcalUrl('')).toBe(false);
  });
});

describe('getAirbnbEvents', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('converts reservations into booking events and caches the result', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => SAMPLE_ICS });
    vi.stubGlobal('fetch', fetchMock);

    const first = await getAirbnbEvents([apartment]);
    expect(first.events).toHaveLength(4);
    expect(first.events[0]).toMatchObject({
      type: 'booking',
      date: '2025-03-10',
      apartmentName: 'Apartamento Centro',
      title: 'Reserva Airbnb',
    });
    expect(first.errors).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const second = await getAirbnbEvents([apartment]);
    expect(second.events).toEqual(first.events);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports invalid feeds without throwing', async () => {
    const result = await getAirbnbEvents([{ ...apartment, icalUrl: 'https://example.com/feed.ics' }]);
    expect(result.events).toEqual([]);
    expect(result.errors[0]).toContain('no es un enlace iCal de Airbnb');
  });
});
