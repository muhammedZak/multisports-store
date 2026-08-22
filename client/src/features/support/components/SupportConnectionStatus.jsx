import { Badge } from '../../../components/ui/Badge.jsx';

export function SupportConnectionStatus({ status }) {
  if (status === 'live') {
    return (
      <div className='text-right'>
        <p className='mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]'>
          Live updates
        </p>

        <Badge variant='success'>Connected</Badge>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className='text-right'>
        <p className='mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]'>
          Live updates
        </p>

        <Badge variant='warning'>Connecting...</Badge>
      </div>
    );
  }

  return (
    <div className='text-right'>
      <p className='mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]'>
        Live updates
      </p>

      <Badge variant='danger'>Offline</Badge>
    </div>
  );
}
