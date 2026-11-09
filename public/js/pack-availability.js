// One event window for both the shop and the server. The server's clock decides purchases.
export function packAvailability(pack, now = Date.now()) {
  if (!pack.season) return 'open';
  if (now < Date.parse(pack.season.startsAt)) return 'upcoming';
  if (now >= Date.parse(pack.season.endsAt)) return 'ended';
  return 'open';
}
export function seasonLabel(pack, now = Date.now()) {
  if (!pack.season) return '';
  const format = (ms) => new Intl.DateTimeFormat('en-US', {
    timeZone: pack.season.timeZone, month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(ms);
  const state = packAvailability(pack, now);
  if (state === 'upcoming') return `Opens ${format(Date.parse(pack.season.startsAt))} · Closes ${format(Date.parse(pack.season.endsAt) - 60000)}`;
  if (state === 'ended') return 'Event ended · collected cards stay yours';
  return `Collect through ${format(Date.parse(pack.season.endsAt) - 60000)}`;
}

const DAY = 24 * 60 * 60 * 1000;

// A short line for shelves and lists, in words a 9-year-old can use: "3 days left".
// The exact minute and time zone stay in seasonLabel(), shown in each pack's details.
export function seasonShort(pack, now = Date.now()) {
  if (!pack.season) return '';
  const start = Date.parse(pack.season.startsAt), end = Date.parse(pack.season.endsAt);
  const day = (ms) => new Intl.DateTimeFormat('en-US', { timeZone: pack.season.timeZone, weekday: 'short', month: 'short', day: 'numeric' }).format(ms);
  const state = packAvailability(pack, now);
  if (state === 'upcoming') return `Opens ${day(start)} · here for ${Math.round((end - start) / DAY)} days`;
  if (state === 'ended') return 'Event ended · your cards stay yours';
  const left = end - now;
  return left <= DAY ? 'Last day!' : `${Math.ceil(left / DAY)} days left · last day ${day(end - 60000)}`;
}

// Seasonal packs in the order a player cares about: open now (ending soonest first),
// then coming soon (opening soonest first), then ended (most recent first).
export function seasonOrder(packs, now = Date.now()) {
  const group = { open: 0, upcoming: 1, ended: 2 };
  const when = (p, state) => (state === 'open' ? Date.parse(p.season.endsAt)
    : state === 'upcoming' ? Date.parse(p.season.startsAt) : -Date.parse(p.season.endsAt));
  return packs.filter((p) => p.season)
    .map((p) => ({ p, state: packAvailability(p, now) }))
    .sort((a, b) => group[a.state] - group[b.state] || when(a.p, a.state) - when(b.p, b.state))
    .map(({ p }) => p);
}

// What Rufus says when the Card House opens: the newest open event's hello, or null.
export function seasonHello(packs, now = Date.now()) {
  const open = packs.filter((p) => p.season && p.season.hello && packAvailability(p, now) === 'open');
  open.sort((a, b) => Date.parse(b.season.startsAt) - Date.parse(a.season.startsAt));
  return open.length ? open[0].season.hello : null;
}
