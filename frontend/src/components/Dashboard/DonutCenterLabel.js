import React from 'react';

const DonutCenterLabel = ({
  data = [],
  activeIndex = null,
  cx = '50%',
  cy = '50%',
  activeColor = null,
}) => {
  const values = (data || []).map((item) => Number(item?.value || item?.count || 0));
  const total = values.reduce((sum, value) => sum + value, 0);
  const safeIndex = activeIndex != null ? activeIndex : 0;
  const active = data?.[safeIndex];
  const activeValue = Number(active?.value || active?.count || 0);
  const percent = total > 0 ? Math.round((activeValue / total) * 100) : 0;
  const valueColor = activeColor || active?.color || 'var(--text-primary)';

  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan className="donut-center-value" fill={valueColor} x={cx} dy="0">
        {percent} %
      </tspan>
    </text>
  );
};

export default DonutCenterLabel;
