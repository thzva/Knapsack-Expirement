/**
 * Display palette for question items.
 *
 * The question data stores the original bright Tailwind classes
 * (bg-red-500, bg-blue-500, ...). We keep the data untouched and remap at
 * render time to a muted, professional palette — still six clearly
 * distinguishable hues, just desaturated.
 */

const BALL_COLOR_MAP: Record<string, string> = {
  'bg-red-500': 'bg-slate-700',
  'bg-blue-500': 'bg-blue-800',
  'bg-green-500': 'bg-teal-700',
  'bg-yellow-500': 'bg-amber-600',
  'bg-purple-500': 'bg-indigo-700',
  'bg-pink-500': 'bg-rose-700',
}

export function ballColorClass(storedColor: string): string {
  return BALL_COLOR_MAP[storedColor] ?? storedColor
}
