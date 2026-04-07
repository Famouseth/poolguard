"use client";

/**
 * MatrixRain — subtle falling-character canvas, fixed behind all content.
 * Opacity is intentionally very low so it acts as ambience, not distraction.
 */
import { useEffect, useRef } from "react";

const CHARS =
  "01ｦｧｨｩｪｫｬｭｮﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ$%#@?><|{}[]ABCDEFZ∞≠∑◊₿";

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const FS = 13;
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    let cols = Math.ceil(W / FS);

    // Randomise starting positions so columns don't all fire at once
    let drops: number[] = Array.from(
      { length: cols },
      () => Math.floor(Math.random() * -(H / FS)),
    );

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      cols = Math.ceil(W / FS);
      while (drops.length < cols) drops.push(0);
    };
    window.addEventListener("resize", onResize);

    let raf: number;
    let last = 0;

    const frame = (ts: number) => {
      raf = requestAnimationFrame(frame);
      // ~18 fps — slow enough to read individual characters
      if (ts - last < 55) return;
      last = ts;

      // Fade the canvas each tick → creates the organic trail effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
      ctx.fillRect(0, 0, W, H);

      ctx.font = `${FS}px "Geist Mono", monospace`;

      for (let i = 0; i < cols; i++) {
        const y = drops[i] * FS;
        const x = i * FS;

        // Head character — brightest, slight glow
        const head = CHARS[Math.floor(Math.random() * CHARS.length)];
        ctx.fillStyle = "#c8ffd6";
        ctx.shadowBlur = 6;
        ctx.shadowColor = "#00ff41";
        ctx.fillText(head, x, y);
        ctx.shadowBlur = 0;

        // Previous character — medium green trail
        const trail = CHARS[Math.floor(Math.random() * CHARS.length)];
        ctx.fillStyle = "rgba(0, 210, 60, 0.5)";
        ctx.fillText(trail, x, y - FS);

        // Reset column when it exits the screen
        if (y > H + FS && Math.random() > 0.972) {
          drops[i] = 0;
        }
        drops[i] += 0.7;
      }
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        // Above body background (z-0 default) — below all app content
        zIndex: 1,
        // Low enough to be ambient texture, not distracting
        opacity: 0.13,
        pointerEvents: "none",
      }}
    />
  );
}
