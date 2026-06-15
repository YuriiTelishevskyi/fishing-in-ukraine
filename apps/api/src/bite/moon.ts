// Pure astronomical moon-phase calculator (synodic approximation, no external API)

const KNOWN_NEW_MOON_JD = 2451550.1; // 2000-01-06 new moon Julian Day
const SYNODIC_MONTH = 29.530588853; // days
const TWO_PI = 2 * Math.PI;
const UNIX_EPOCH_JD = 2440587.5; // Julian Day of 1970-01-01T00:00:00Z

/**
 * Compute the moon phase for a given date.
 * @returns phase 0..1 (0=new, 0.25=first quarter, 0.5=full, 0.75=last quarter)
 *          illumination 0..1 (fraction of disc lit)
 */
export function moonPhase(date: Date): { phase: number; illumination: number } {
  const jd = date.getTime() / 86400000 + UNIX_EPOCH_JD;
  const daysSince = jd - KNOWN_NEW_MOON_JD;
  const raw = daysSince % SYNODIC_MONTH;
  const phase = ((raw % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH / SYNODIC_MONTH;
  const illumination = (1 - Math.cos(TWO_PI * phase)) / 2;
  return { phase, illumination };
}

/**
 * Map phase 0..1 to a translation key.
 * 8 buckets with ±0.03 windows around cardinal points.
 */
export function moonNameKey(phase: number): string {
  // new moon: 0 (or ~1)
  if (phase <= 0.03 || phase >= 0.97) return 'moon.new';
  // waxing crescent: 0.03..0.22
  if (phase < 0.22) return 'moon.waxingCrescent';
  // first quarter: 0.25 ± 0.03
  if (phase <= 0.28) return 'moon.firstQuarter';
  // waxing gibbous: 0.28..0.47
  if (phase < 0.47) return 'moon.waxingGibbous';
  // full moon: 0.5 ± 0.03
  if (phase <= 0.53) return 'moon.full';
  // waning gibbous: 0.53..0.72
  if (phase < 0.72) return 'moon.waningGibbous';
  // last quarter: 0.75 ± 0.03
  if (phase <= 0.78) return 'moon.lastQuarter';
  // waning crescent: 0.78..0.97
  return 'moon.waningCrescent';
}
