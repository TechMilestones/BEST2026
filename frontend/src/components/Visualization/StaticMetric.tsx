import React from 'react';

interface StaticMetricProps {
  label: string;
  value: number | undefined;
  unit?: string;
  toFixed?: number;
}

export const StaticMetric = ({
  label,
  value,
  unit = "",
  toFixed = 2
}: StaticMetricProps) => {
  return (
    <div className="visual-page_item_value">
      <p>{label}:</p>
      <span>{value != null ? value.toFixed(toFixed) : '—'}</span>{unit}
    </div>
  );
};

export default React.memo(StaticMetric);
