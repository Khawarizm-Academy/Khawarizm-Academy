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
    const draw = () => {
      const { clientWidth, clientHeight } = canvas;
      canvas.width = clientWidth;
      canvas.height = clientHeight;

      context.clearRect(0, 0, clientWidth, clientHeight);
      context.font = '600 13px system-ui, sans-serif';
      context.fillStyle = 'rgba(255, 255, 255, 0.12)';
      context.textBaseline = 'middle';

      // Each row drifts a little each frame so a still capture cannot mask the
      // stamp, and the offset cycles back so the pattern fills any aspect ratio.
      const drift = (frame % 400) * 0.35;
      for (let y = STAMP_SPACING_Y / 2; y < clientHeight; y += STAMP_SPACING_Y) {
        for (let x = -STAMP_SPACING_X; x < clientWidth + STAMP_SPACING_X; x += STAMP_SPACING_X) {
          context.fillText(label, x + drift, y + drift / 2);
        }
      }
      frame += 1;
    };

    draw();
    const timer = window.setInterval(draw, 120);
    return () => window.clearInterval(timer);
  }, [label]);

  return <canvas ref={canvasRef} className="player-watermark" aria-hidden="true" />;
};
