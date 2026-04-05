import { useEffect, useRef } from 'react';
import { useVisualizationContext } from '../../context/VisualizationContext';

// MM:SS.mmm format
function formatTime(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  const ms = Math.floor((sec % 1) * 1000).toString().padStart(3, '0');
  return `${m}:${s}.${ms}`;
}

export const FlightTimeValue = () => {
  const { subscribeTelemetry } = useVisualizationContext();
  const elapsedRef = useRef<HTMLSpanElement>(null);
  const remainingRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    return subscribeTelemetry((t) => {
      if (elapsedRef.current) elapsedRef.current.textContent = formatTime(t.elapsedSec);
      if (remainingRef.current) remainingRef.current.textContent = `Залишилося: ${formatTime(t.remainingSec)}`;
    });
  }, [subscribeTelemetry]);

  return (
    <div className="visual-page_item_value">
      <p ref={remainingRef}>Залишилося: —</p>
      <span ref={elapsedRef}>00:00.000</span>
    </div>
  );
};
