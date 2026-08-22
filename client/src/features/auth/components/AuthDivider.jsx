export function AuthDivider({ label = 'or' }) {
  return (
    <div className='my-6 flex items-center gap-4'>
      <div className='h-px flex-1 bg-[var(--color-border)]' />

      <span className='text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]'>
        {label}
      </span>

      <div className='h-px flex-1 bg-[var(--color-border)]' />
    </div>
  );
}
