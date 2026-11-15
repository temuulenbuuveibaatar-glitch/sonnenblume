// Live space weather from NASA's DONKI (Space Weather Database Of Notifications, Knowledge, Information).
// Server-side proxy so the page keeps a strict Content Security Policy, and so one cached copy
// (shared at the edge for an hour) serves every visitor without hitting NASA's rate limits.
// Set NASA_API_KEY in Vercel for a personal key (free at api.nasa.gov); DEMO_KEY is the fallback.
const KEY = process.env.NASA_API_KEY || 'DEMO_KEY';
const BASE = 'https://api.nasa.gov/DONKI/';
const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
const iso = d => d.toISOString().slice(0, 10);

async function feed(type, start, end) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 7000);
  try {
    const r = await fetch(`${BASE}${type}?startDate=${start}&endDate=${end}&api_key=${KEY}`, { signal: ctl.signal });
    if (r.status === 404) return { ok: true, items: [] };          // DONKI answers 404 when a window has no events
    if (!r.ok) return { ok: false, items: [], status: r.status };
    const j = await r.json();
    return { ok: true, items: Array.isArray(j) ? j.slice(-60) : [] };
  } catch (e) {
    return { ok: false, items: [], status: 'timeout' };
  } finally { clearTimeout(t); }
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.setHeader('Allow', 'GET, HEAD'); return res.status(405).json({ error: 'method-not-allowed' }); }
  const end = new Date(), start = new Date(end.getTime() - 30 * 864e5);
  const [flr, sep, gst] = await Promise.all([feed('FLR', iso(start), iso(end)), feed('SEP', iso(start), iso(end)), feed('GST', iso(start), iso(end))]);
  const out = {
    source: 'NASA DONKI (CCMC)', fetched: end.toISOString(), window: { start: iso(start), end: iso(end) },
    feeds: { flares: flr.ok, particles: sep.ok, storms: gst.ok },
    flares: flr.items.map(f => ({ id: str(f.flrID, 60), peak: str(f.peakTime || f.beginTime, 30), cls: str(f.classType, 8), source: str(f.sourceLocation, 20), link: str(f.link, 200) })).filter(f => f.id),
    particles: sep.items.map(s => ({ id: str(s.sepID, 60), time: str(s.eventTime, 30), link: str(s.link, 200) })).filter(s => s.id),
    storms: gst.items.map(g => ({ id: str(g.gstID, 60), start: str(g.startTime, 30), kp: Math.max(0, ...((g.allKpIndex || []).map(k => +k.kpIndex).filter(Number.isFinite))), link: str(g.link, 200) })).filter(g => g.id)
  };
  const anyOk = flr.ok || sep.ok || gst.ok;
  res.setHeader('Cache-Control', anyOk ? 'public, s-maxage=3600, stale-while-revalidate=21600' : 'public, s-maxage=300');
  return res.status(200).json(out);
}
