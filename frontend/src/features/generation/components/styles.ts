/** Shared style fragments built on the existing Chakra theme tokens. */
export const focusRing = {
  outline: '2px solid',
  outlineColor: 'brand.500',
  outlineOffset: '2px',
  boxShadow: 'none',
} as const;

export const panelStyle = {
  bg: 'bg.surface',
  borderWidth: '1px',
  borderColor: 'border.default',
  borderRadius: '16px',
} as const;

/** 44 px touch targets on small screens, compact on pointer devices. */
export const touchSize = { base: '44px', md: '36px' } as const;

export const reducedMotion = {
  '@media (prefers-reduced-motion: reduce)': { transition: 'none', animation: 'none' },
} as const;
