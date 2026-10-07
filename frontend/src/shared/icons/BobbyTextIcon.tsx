import React from 'react';

const BobbyTextIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={className} style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1 }} aria-hidden="true">
    <span style={{ fontSize: 19, fontWeight: 750, letterSpacing: '-0.6px' }}>Bobby</span>
    <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '2.5px', marginTop: 3 }}>STUDIO</span>
  </span>
);

export default BobbyTextIcon;
