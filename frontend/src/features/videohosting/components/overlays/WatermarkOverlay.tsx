import React, { useEffect, useRef } from 'react';

interface WatermarkOverlayProps {
  /** Text stamped across the frame, e.g. the viewer's name or email. */
  label: string;
}

/** Diagonal spacing between stamps, in CSS pixels. */
const STAMP_SPACING_X = 220;
const STAMP_SPACING_Y = 120;

/**
 * Canvas watermark overlay — the platform's deterrence against screen recording.
 *
 * A moving, semi-transparent viewer stamp is painted over the video surface.
 * It is not foolproof (no watermark can defeat a camera pointed at the screen),
 * but it makes a re-shared recording traceable to one account, and it is drawn
 * outside the `<video>` element so it survives every capture path.
 */
export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({ label }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let frame = 0;
    let timer: number | null = null;
    const motionQuery = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    const draw = () => {
      const { clientWidth, clientHeight } = canvas;
      canvas.width = clientWidth;
      canvas.height = clientHeight;

      context.clearRect(0, 0, clientWidth, clientHeight);
      context.font = '600 13px system-ui, sans-serif';
      context.fillStyle = 'rgba(255, 255, 255, 0.12)';
      context.textBaseline = 'middle';

      // Movement is omitted when the viewer requests reduced motion.
      const drift = motionQuery?.matches ? 0 : (frame % 400) * 0.35;
      for (let y = STAMP_SPACING_Y / 2; y < clientHeight; y += STAMP_SPACING_Y) {
        for (let x = -STAMP_SPACING_X; x < clientWidth + STAMP_SPACING_X; x += STAMP_SPACING_X) {
          context.fillText(label, x + drift, y + drift / 2);
        }
      }
      frame += 1;
    };

    const syncMotion = () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      draw();
      if (!motionQuery?.matches) timer = window.setInterval(draw, 120);
    };
    syncMotion();
    motionQuery?.addEventListener?.('change', syncMotion);
    window.addEventListener('resize', draw);
    return () => {
      if (timer !== null) window.clearInterval(timer);
      motionQuery?.removeEventListener?.('change', syncMotion);
      window.removeEventListener('resize', draw);
    };
  }, [label]);

  return <canvas ref={canvasRef} className="player-watermark" aria-hidden="true" />;
};
