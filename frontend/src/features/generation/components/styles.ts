/** Shared style fragments built on the existing Chakra theme tokens. */
export const focusRing = {
  outline: '2px solid',
  outlineColor: 'brand.500',
  outlineOffset: '2px',
  boxShadow: '0 0 12px rgba(127, 86, 217, 0.35)',
} as const;

export const panelStyle = {
  bg: 'bg.surface',
  borderWidth: '1px',
  borderColor: 'border.default',
  borderRadius: '20px',
  boxShadow: '0 4px 24px -6px rgba(0, 0, 0, 0.06)',
} as const;

/** 44 px touch targets on small screens, compact on pointer devices. */
export const touchSize = { base: '44px', md: '36px' } as const;

export const reducedMotion = {
  '@media (prefers-reduced-motion: reduce)': { transition: 'none', animation: 'none' },
} as const;
