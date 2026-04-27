export const PROJECT_STATUS_ORDER = [
  'prospecting',
  'quotation',
  'inProgress',
  'validation',
  'completed',
  'archived',
];

export const PROJECT_STATUS_COLORS = {
  prospecting: '#94a3b8',
  quotation: '#f59e0b',
  inProgress: '#0ea5e9',
  validation: '#8b5cf6',
  completed: '#22c55e',
  archived: '#64748b',
};

export const TASK_STATUS_ORDER = ['todo', 'inProgress', 'review', 'done'];

export const TASK_STATUS_COLORS = {
  todo: '#64748b',
  inProgress: '#0ea5e9',
  review: '#f59e0b',
  done: '#22c55e',
};

export const INVOICE_STATUS_ORDER = ['draft', 'sent', 'partial', 'overdue', 'paid', 'cancelled'];

export const INVOICE_STATUS_COLORS = {
  paid: '#22c55e',
  sent: '#0ea5e9',
  partial: '#f59e0b',
  overdue: '#ef4444',
  draft: '#94a3b8',
  cancelled: '#64748b',
};

export function sortByKeyOrder(items, key, order = []) {
  const orderIndex = new Map((order || []).map((value, idx) => [value, idx]));
  return [...(items || [])].sort((a, b) => {
    const ka = a?.[key];
    const kb = b?.[key];
    const ia = orderIndex.has(ka) ? orderIndex.get(ka) : 9999;
    const ib = orderIndex.has(kb) ? orderIndex.get(kb) : 9999;
    if (ia !== ib) return ia - ib;
    return String(ka || '').localeCompare(String(kb || ''), 'fr');
  });
}

