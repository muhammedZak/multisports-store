import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AccountPageHeader } from '../../features/account/components/AccountPageHeader.jsx';

import { SupportConnectionStatus } from '../../features/support/components/SupportConnectionStatus.jsx';
import { SupportConversation } from '../../features/support/components/SupportConversation.jsx';

import { useCustomerSupport } from '../../features/support/hooks/useCustomerSupport.js';

function SupportPage() {
  const support = useCustomerSupport();

  return (
    <div className='max-w-4xl'>
      <AccountPageHeader
        title='Support'
        description='Send a message to the store Support team and keep your conversation history in one place.'
        action={
          support.conversation ? (
            <SupportConnectionStatus status={support.liveStatus} />
          ) : null
        }
      />

      {support.loading ? (
        <section className='mt-8 border-y border-[var(--color-border)] py-6'>
          <Skeleton className='h-5 w-40' />

          <Skeleton className='mt-5 h-72 w-full' />

          <Skeleton className='mt-5 h-24 w-full' />
        </section>
      ) : null}

      {!support.loading && support.error ? (
        <Alert
          variant='danger'
          title='Unable to load Support'
          className='mt-8'
          actions={
            <Button
              type='button'
              variant='secondary'
              size='sm'
              onClick={support.loadSupport}>
              Try again
            </Button>
          }>
          {support.error.message}
        </Alert>
      ) : null}

      {!support.loading &&
      !support.error &&
      support.liveError &&
      support.conversation ? (
        <Alert
          variant='warning'
          title='Live updates unavailable'
          className='mt-6'>
          You can still send messages normally. Persisted Support Messages
          continue to use the REST API. Refreshing the conversation will load
          persisted replies.
        </Alert>
      ) : null}

      {!support.loading &&
      !support.error &&
      support.syncError &&
      support.conversation ? (
        <Alert
          variant='warning'
          title='Latest messages could not be synchronized'
          className='mt-6'>
          {support.syncError.message} Refresh the page to load authoritative
          Support history.
        </Alert>
      ) : null}

      {!support.loading && !support.error && support.readError ? (
        <Alert variant='warning' className='mt-6'>
          {support.readError.message}
        </Alert>
      ) : null}

      {!support.loading && !support.error ? (
        <SupportConversation support={support} />
      ) : null}
    </div>
  );
}

export default SupportPage;
