import React, { useState, useEffect, useCallback } from 'react';
import { Responsive as ResponsiveGridLayout, WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './DashboardWidgetGrid.css';

const ResponsiveGrid = WidthProvider(ResponsiveGridLayout);

const STORAGE_PREFIX = 'dashboard-layout-';

/**
 * Grille de widgets déplaçables. Les widgets peuvent être déplacés directement
 * via la poignée sans mode d'édition.
 *
 * @param {string} storageKey - Clé pour persister le layout (ex: 'executive', 'team-member')
 * @param {Array} defaultLayout - Layout par défaut [{ i, x, y, w, h }, ...]
 * @param {React.ReactNode} children - Enfants avec key correspondant au layout
 */
const DashboardWidgetGrid = ({ storageKey, defaultLayout, id, children }) => {
  const [layouts, setLayouts] = useState({ lg: defaultLayout });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.lg?.length) setLayouts({ lg: parsed.lg });
      }
    } catch (_) {
      /* ignore */
    }
  }, [storageKey]);

  const handleLayoutChange = useCallback(
    (layout, allLayouts) => {
      if (allLayouts?.lg) {
        setLayouts({ lg: allLayouts.lg });
        try {
          localStorage.setItem(`${STORAGE_PREFIX}${storageKey}`, JSON.stringify({ lg: allLayouts.lg }));
        } catch (_) {
          /* ignore */
        }
      }
    },
    [storageKey]
  );

  return (
    <div id={id} className="dashboard-widget-grid-wrap">
      <ResponsiveGrid
        className="dashboard-grid-layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={80}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        isDraggable={true}
        isResizable={false}
        draggableHandle=".dashboard-widget-drag-handle"
        onLayoutChange={handleLayoutChange}
        compactType="vertical"
      >
        {children}
      </ResponsiveGrid>
    </div>
  );
};

export default DashboardWidgetGrid;
