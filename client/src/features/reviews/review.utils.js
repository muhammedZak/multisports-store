export const reviewDateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function getReviewStatusVariant(status) {
  return status === 'visible'
    ? 'success'
    : status === 'hidden'
      ? 'warning'
      : 'neutral';
}
