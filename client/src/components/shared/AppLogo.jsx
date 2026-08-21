import { Link } from 'react-router';

import { classNames } from '../../utils/classNames.js';

export function AppLogo({ to = '/shop', compact = false, className = '' }) {
  return (
    <Link
      to={to}
      className={classNames(
        'inline-flex items-center gap-2.5',
        'focus-visible:outline-none',
        className,
      )}
      aria-label='MultiSport home'>
      <span
        aria-hidden='true'
        className='grid size-8 shrink-0 place-items-center bg-[var(--color-ink)] text-[10px] font-black tracking-[-0.03em] text-white'>
        MS
      </span>

      {!compact ? (
        <span className='text-[15px] font-black tracking-[-0.04em] text-[var(--color-ink)]'>
          MULTISPORT
        </span>
      ) : null}
    </Link>
  );
}
