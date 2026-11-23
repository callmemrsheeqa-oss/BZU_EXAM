import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * Geometric 'Spider Cursor' reactive particle-web canvas.
 * Connects particles near the pointer with delicate radial & cross-web strands
 * resembling an interactive geometric spiderweb (NOT a neuron/brain and NOT a literal spider).
 * Automatically respects prefers-reduced-motion and simplifies on coarse touch devices.
 */
export const SpiderCursorCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isCoarsePointer =
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer: coarse)').matches;

    let width = 0;
    let height = 0;
    let rafId = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const pointer = { x: -999, y: -999, active: false };
    const particleCount = isCoarsePointer ? 24 : 58;

    interface WebNode {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
    }

    const nodes: WebNode[] = [];

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (nodes.length === 0 && width > 0 && height > 0) {
        for (let i = 0; i < particleCount; i++) {
          nodes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.42,
            vy: (Math.random() - 0.5) * 0.42,
            radius: 1.4 + Math.random() * 1.3,
          });
        }
        pointer.x = width * 0.52;
        pointer.y = height * 0.48;
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active =
        pointer.x >= 0 && pointer.x <= width && pointer.y >= 0 && pointer.y <= height;
    };

    const onPointerLeave = () => {
      pointer.active = false;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    canvas.parentElement?.addEventListener('pointerleave', onPointerLeave);

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);

      const isDark = resolvedTheme === 'dark';
      const strandRgb = isDark ? '16, 185, 129' : '11, 110, 79';
      const goldRgb = isDark ? '245, 158, 11' : '180, 83, 9';
      const maxLinkDist = 140;
      const pointerLinkDist = 185;

      // Update positions (unless reduced motion)
      if (!prefersReducedMotion) {
        for (const n of nodes) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > width) n.vx *= -1;
          if (n.y < 0 || n.y > height) n.vy *= -1;
          n.x = Math.max(0, Math.min(width, n.x));
          n.y = Math.max(0, Math.min(height, n.y));
        }
      }

      // 1. Cross-web strands between nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < maxLinkDist) {
            const alpha = (1 - dist / maxLinkDist) * (isDark ? 0.28 : 0.2);
            ctx.strokeStyle = `rgba(${strandRgb}, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.85;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // 2. Reactive Spider-Cursor radial strands + concentric anchor ring near pointer
      if (pointer.x > 0 && pointer.y > 0) {
        const nearby: Array<{ node: WebNode; dist: number; angle: number }> = [];
        for (const n of nodes) {
          const dx = n.x - pointer.x;
          const dy = n.y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < pointerLinkDist) {
            nearby.push({ node: n, dist, angle: Math.atan2(dy, dx) });
            const alpha = (1 - dist / pointerLinkDist) * (pointer.active ? 0.55 : 0.3);
            ctx.strokeStyle = `rgba(${goldRgb}, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 1.05;
            ctx.beginPath();
            ctx.moveTo(pointer.x, pointer.y);
            ctx.lineTo(n.x, n.y);
            ctx.stroke();

            // Gentle web tension pull when active
            if (pointer.active && !prefersReducedMotion && dist > 38) {
              n.x -= dx * 0.0025;
              n.y -= dy * 0.0025;
            }
          }
        }

        // Connect adjacent radial spokes to evoke a delicate spiderweb polygon
        nearby.sort((a, b) => a.angle - b.angle);
        if (nearby.length >= 3) {
          ctx.strokeStyle = `rgba(${strandRgb}, ${pointer.active ? 0.34 : 0.18})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          for (let k = 0; k < nearby.length; k++) {
            const curr = nearby[k].node;
            const next = nearby[(k + 1) % nearby.length].node;
            if (Math.hypot(curr.x - next.x, curr.y - next.y) < 170) {
              ctx.moveTo(curr.x, curr.y);
              ctx.lineTo(next.x, next.y);
            }
          }
          ctx.stroke();
        }
      }

      // 3. Draw anchor vertices
      for (const n of nodes) {
        ctx.fillStyle = `rgba(${strandRgb}, ${isDark ? 0.65 : 0.55})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        rafId = requestAnimationFrame(drawFrame);
      }
    };

    drawFrame();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      canvas.parentElement?.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [resolvedTheme]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="spider-cursor-canvas"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
};
