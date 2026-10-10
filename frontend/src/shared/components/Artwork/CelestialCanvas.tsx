import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  targetAlpha: number;
  speed: number;
  twinkleSpeed: number;
}

export const CelestialCanvas: React.FC<{ className?: string }> = ({
  className = 'absolute inset-0 pointer-events-none',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || 600;
    };

    window.addEventListener('resize', handleResize);

    // Star palette resolved from design tokens so the canvas stays in sync with the theme.
    const tokenColor = (name: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim();

    const starColors = ['--color-white', '--color-gold-400', '--color-blue-400', '--color-white-100']
      .map(tokenColor)
      .filter(Boolean);

    const starCount = Math.floor((width * height) / 14000);
    const stars: Star[] = [];

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.5,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        alpha: Math.random() * 0.7 + 0.2,
        targetAlpha: Math.random() * 0.7 + 0.2,
        speed: (Math.random() - 0.5) * 0.08,
        twinkleSpeed: Math.random() * 0.015 + 0.005,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        // Twinkle update
        if (Math.abs(star.alpha - star.targetAlpha) < 0.02) {
          star.targetAlpha = Math.random() * 0.75 + 0.2;
        } else if (star.alpha < star.targetAlpha) {
          star.alpha += star.twinkleSpeed;
        } else {
          star.alpha -= star.twinkleSpeed;
        }

        // Slight drift
        star.y += star.speed;
        if (star.y < 0) star.y = height;
        if (star.y > height) star.y = 0;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = Math.max(0.1, Math.min(1, star.alpha));
        ctx.shadowBlur = star.radius * 3;
        ctx.shadowColor = star.color;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
};
