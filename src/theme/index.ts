// ─── Blank Slate Design System ───────────────────────────────────────────────
// "Before Dawn" — warm ceremonial dark palette

export const colors = {
  // ── Backgrounds ─────────────────────────────────────────────────────────────
  bg:           '#07050A',  // warm near-black (screens)
  surface:      '#100B15',  // slightly elevated (tab bar, modal)
  card:         '#180E20',  // card / input background
  overlay:      'rgba(0,0,0,0.75)',

  // ── Borders ──────────────────────────────────────────────────────────────────
  border:        '#2C1F38',  // standard card border
  borderWarm:    '#3D2B18',  // amber-tinted (active/accent states)
  borderSubtle:  '#1A1220',  // very subtle divider

  // ── Accent — amber gold (replaces cold blue #42A5F5) ────────────────────────
  accent:      '#C8831E',
  accentLight: '#E09B38',
  accentDim:   'rgba(200, 131, 30, 0.12)',

  // ── Status — softer, more naturalistic ──────────────────────────────────────
  green:      '#6BAF78',
  greenGlow:  'rgba(107, 175, 120, 0.22)',
  greenDim:   'rgba(107, 175, 120, 0.07)',
  greenBorder:'rgba(107, 175, 120, 0.35)',

  yellow:     '#D4933A',
  yellowGlow: 'rgba(212, 147, 58, 0.22)',

  blue:       '#6B8EBF',
  blueGlow:   'rgba(107, 142, 191, 0.22)',

  // ── Text ─────────────────────────────────────────────────────────────────────
  textPrimary:   '#EDE8F5',  // warm white
  textSecondary: '#9080A8',  // muted purple-grey
  textTertiary:  '#5C4E6E',  // more muted
  textHint:      '#3A2F4A',  // barely visible

  // ── Functional ───────────────────────────────────────────────────────────────
  success:  '#5FAD6E',
  error:    '#BF5050',
  white:    '#FFFFFF',
} as const;

export const font = {
  display:       'CormorantGaramond_700Bold',
  displayItalic: 'CormorantGaramond_400Regular_Italic',
  displayMedium: 'CormorantGaramond_600SemiBold_Italic',
  body:          'Outfit_400Regular',
  bodyMedium:    'Outfit_500Medium',
  bodySemiBold:  'Outfit_600SemiBold',
} as const;
