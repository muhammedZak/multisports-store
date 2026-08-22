import { Button } from '../../../components/ui/Button.jsx';

import { ANALYTICS_RANGE_OPTIONS } from '../analytics.constants.js';

export function AnalyticsRangeSelector({
  range,

  onChange,
}) {
  return (
    <div>
      <p className='mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]'>
        Time range
      </p>

      <div className='flex flex-wrap gap-2'>
        {ANALYTICS_RANGE_OPTIONS.map((option) => {
          const selected = range === option.value;

          return (
            <Button
              key={option.value}
              type='button'
              size='sm'
              variant={selected ? 'primary' : 'secondary'}
              aria-pressed={selected}
              onClick={() => onChange(option.value)}>
              {option.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
