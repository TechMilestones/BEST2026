import { useEffect, useRef } from 'react';
import { useVisualizationContext, type TelemetryData } from '../../context/VisualizationContext';

interface TelemetryValueProps {
  label: string;
  getValue: (t: TelemetryData) => number | null;
  unit?: string;
  toFixed?: number;
}

export const TelemetryValue = ({
  label,
  getValue,
  unit = "",
  toFixed = 2
}: TelemetryValueProps) => {
  const { subscribeTelemetry } = useVisualizationContext();
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    return subscribeTelemetry((t) => {
      if (spanRef.current) {
        const val = getValue(t);
        spanRef.current.textContent = val != null ? val.toFixed(toFixed) : '—';
      }
    });
  }, [subscribeTelemetry, getValue, toFixed]);

  return (
    <div className="visual-page_item_value">
      <p>{label}:</p>
      <span ref={spanRef}>—</span>{unit}
    </div>
  );
};
