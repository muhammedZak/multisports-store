import { Alert } from '../../components/ui/Alert.jsx';

import { Button } from '../../components/ui/Button.jsx';

import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AdminPageHeader } from '../../components/shared/AdminPageHeader.jsx';

import { AnalyticsRangeSelector } from '../../features/analytics/components/AnalyticsRangeSelector.jsx';

import {
  AnalyticsCustomersSection,
  AnalyticsInventorySection,
  AnalyticsProductsSection,
  AnalyticsRefundsSection,
  AnalyticsSalesSection,
  AnalyticsSummary,
} from '../../features/analytics/components/AnalyticsSections.jsx';

import { useAdminAnalytics } from '../../features/analytics/hooks/useAdminAnalytics.js';

import {
  formatAnalyticsBoundary,
  formatAnalyticsLabel,
} from '../../features/analytics/analytics.utils.js';

function AdminAnalyticsPage() {
  const analyticsState = useAdminAnalytics();

  const {
    analytics,
    requestedRange,

    loading,
    error,
  } = analyticsState;

  return (
    <main className='p-5 sm:p-6'>
      <AdminPageHeader
        eyebrow='Store reporting'
        title='Analytics'
        description='Review store performance, Customer activity, Product demand, Inventory health and Refund behavior using backend-derived data.'
        action={
          <AnalyticsRangeSelector
            range={requestedRange}
            onChange={analyticsState.changeRange}
          />
        }
      />

      {loading ? (
        <div className='mt-8 space-y-4'>
          <Skeleton className='h-14 w-full' />

          <div className='grid gap-4 md:grid-cols-3'>
            <Skeleton className='h-24 w-full' />
            <Skeleton className='h-24 w-full' />
            <Skeleton className='h-24 w-full' />
          </div>

          <Skeleton className='h-96 w-full' />
        </div>
      ) : null}

      {!loading && error ? (
        <section className='mt-8'>
          <Alert variant='danger' title='Unable to load Analytics'>
            <p className='mb-0'>{error.message}</p>

            {error.code === 'INVALID_ANALYTICS_RANGE' ? (
              <p className='mt-2 mb-0 text-xs'>
                Choose one of the supported time ranges above.
              </p>
            ) : null}
          </Alert>

          <Button type='button' className='mt-5' onClick={analyticsState.retry}>
            Try again
          </Button>
        </section>
      ) : null}

      {!loading && !error && analytics ? (
        <>
          <section className='mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 border-y border-[var(--color-border)] py-3 text-xs leading-5 text-[var(--color-muted)]'>
            <strong className='text-[var(--color-ink)]'>
              {formatAnalyticsBoundary(
                analytics.range.startAt,

                analytics.range.timezone,
              )}
            </strong>

            <span>→</span>

            <strong className='text-[var(--color-ink)]'>
              {formatAnalyticsBoundary(
                analytics.range.endAt,

                analytics.range.timezone,
              )}
            </strong>

            <span>·</span>

            <span>{analytics.range.timezone}</span>

            <span>·</span>

            <span>{formatAnalyticsLabel(analytics.range.bucket)} buckets</span>
          </section>

          <AnalyticsSummary analytics={analytics} />

          <AnalyticsSalesSection analytics={analytics} />

          <AnalyticsProductsSection analytics={analytics} />

          <AnalyticsCustomersSection analytics={analytics} />

          <AnalyticsInventorySection analytics={analytics} />

          <AnalyticsRefundsSection analytics={analytics} />
        </>
      ) : null}
    </main>
  );
}

export default AdminAnalyticsPage;
