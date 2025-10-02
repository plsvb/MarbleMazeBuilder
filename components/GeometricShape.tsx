import React from 'react';
import type { RacerId } from '../types';

interface GeometricShapeProps {
  shapeId: RacerId;
  className?: string;
}

export const GeometricShape: React.FC<GeometricShapeProps> = ({ shapeId, className }) => {
  const commonProps = {
    className: className || "w-full h-full",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    stroke: "none",
  };

  switch (shapeId) {
    case 'circle':
      return (
        <svg {...commonProps} aria-label="Circle Shape">
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
    case 'square':
      return (
        <svg {...commonProps} aria-label="Square Shape">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      );
    case 'triangle':
      return (
        <svg {...commonProps} aria-label="Triangle Shape">
          <polygon points="12 2, 22 21, 2 21" />
        </svg>
      );
    default:
      return null;
  }
};