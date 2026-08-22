export const dashboardDateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatDashboardDate(value) {
  if (!value) {
    return '—';
  }

  return dashboardDateFormatter.format(new Date(value));
}

export function formatDashboardLabel(value) {
  if (!value) {
    return 'Unknown';
  }

  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
