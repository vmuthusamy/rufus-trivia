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
