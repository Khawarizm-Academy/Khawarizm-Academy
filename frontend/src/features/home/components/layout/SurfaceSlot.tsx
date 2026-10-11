import React from 'react';

export type SurfaceBreakpoint = 'md' | 'lg';

interface SurfaceSlotProps {
  breakpoint: SurfaceBreakpoint;
  desktop: React.ReactNode;
  mobile: React.ReactNode;
}

/** The hidden/block surface wrappers, keyed so breakpoints stay literal. */
const SURFACE_CLASS: Record<SurfaceBreakpoint, { desktop: string; mobile: string }> = {
  md: { desktop: 'hidden md:block w-full', mobile: 'block md:hidden w-full' },
  lg: { desktop: 'hidden lg:block w-full', mobile: 'block lg:hidden w-full' },
};

/** Mounts both surfaces of a shared component; CSS shows one per viewport. */
export const SurfaceSlot: React.FC<SurfaceSlotProps> = ({ breakpoint, desktop, mobile }) => {
  const surface = SURFACE_CLASS[breakpoint];

  return (
    <>
      <div className={surface.desktop}>{desktop}</div>
      <div className={surface.mobile}>{mobile}</div>
    </>
  );
};