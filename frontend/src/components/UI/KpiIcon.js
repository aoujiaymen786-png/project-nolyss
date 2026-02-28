import React from 'react';
import AppIcon from './AppIcons';
import './KpiIcon.css';

/** Icône pour les cartes KPI — remplace les emojis */
const KpiIcon = ({ name, size }) => (
  <span className="kpi-icon-lucide" aria-hidden="true">
    <AppIcon name={name} size={size || 22} strokeWidth={1.8} />
  </span>
);

export default KpiIcon;
