import { useLayoutEffect, useRef, useState } from "react";

// Self-contained pan/zoom surface: drag (mouse + one finger) pans, wheel and
// two-finger pinch zoom. Keeps content centred within a fixed viewport.
export function PanZoom({ children, className, contentWidth, contentHeight }: { children: React.ReactNode; className?: string; contentWidth: number; contentHeight: number }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const clampScale = (scale: number) => Math.min(2.5, Math.max(0.3, scale));

  // Fit the whole tree on first mount so nothing starts off-screen.
  useLayoutEffect(() => {
    const box = viewport.current?.getBoundingClientRect();
    if (!box) return;
    const scale = clampScale(Math.min(box.width / contentWidth, box.height / contentHeight) * 0.96);
    setView({ scale, x: (box.width - contentWidth * scale) / 2, y: (box.height - contentHeight * scale) / 2 });
  }, [contentWidth, contentHeight]);

  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    const box = viewport.current?.getBoundingClientRect(); if (!box) return;
    setView((current) => {
      const scale = clampScale(current.scale * factor);
      const ratio = scale / current.scale;
      const px = clientX - box.left, py = clientY - box.top;
      return { scale, x: px - (px - current.x) * ratio, y: py - (py - current.y) * ratio };
    });
  };
  const onWheel = (event: React.WheelEvent) => { event.preventDefault(); zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 1.12 : 1 / 1.12); };
  const onPointerDown = (event: React.PointerEvent) => {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: view.scale }; }
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const previous = pointers.current.get(event.pointerId); if (!previous) return;
    const now = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, now);
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, (distance / pinch.current.distance) * (pinch.current.scale / view.scale));
      pinch.current.distance = distance; pinch.current.scale = view.scale;
      return;
    }
    setView((current) => ({ ...current, x: current.x + (now.x - previous.x), y: current.y + (now.y - previous.y) }));
  };
  const endPointer = (event: React.PointerEvent) => { pointers.current.delete(event.pointerId); if (pointers.current.size < 2) pinch.current = null; };

  return <div ref={viewport} className={`panzoom ${className ?? ""}`} onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endPointer} onPointerCancel={endPointer}>
    <div className="panzoom-content" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>{children}</div>
  </div>;
}
