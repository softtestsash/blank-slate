// Minimal date helpers — replaces date-fns to avoid its ESM/import.meta
// incompatibility with Metro's web bundler.

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Monday-based start of week (weekStartsOn: 1) */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Monday-based end of week (Sunday 23:59:59.999) */
export function endOfWeek(date: Date): Date {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Next Sunday relative to date (skips to following week if already Sunday) */
export function nextSunday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? 7 : 7 - day));
  return d;
}

/**
 * Subset of date-fns format tokens we actually use:
 *   yyyy  MM  dd  MMM  d
 *   Literal text in single-quotes: 'Week of'
 */
export function format(date: Date, pattern: string): string {
  const yyyy = date.getFullYear().toString();
  const MM   = String(date.getMonth() + 1).padStart(2, '0');
  const dd   = String(date.getDate()).padStart(2, '0');
  const MMM  = MONTHS[date.getMonth()];
  const d    = String(date.getDate());

  // Protect single-quoted literals, then substitute tokens, then restore.
  const literals: string[] = [];
  let s = pattern.replace(/'([^']*)'/g, (_, lit) => {
    literals.push(lit);
    return `\x00${literals.length - 1}\x00`;
  });

  s = s
    .replace('yyyy', yyyy)
    .replace('MMM', MMM)   // before MM so 'MMM' isn't half-matched
    .replace('MM', MM)
    .replace('dd', dd)     // before d so 'dd' isn't half-matched
    .replace('d', d);

  return s.replace(/\x00(\d+)\x00/g, (_, i) => literals[parseInt(i, 10)]);
}

export function differenceInHours(later: Date, earlier: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / 3_600_000);
}

export function differenceInMinutes(later: Date, earlier: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / 60_000);
}
