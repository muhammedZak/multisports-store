import { useCallback, useEffect, useRef, useState } from 'react';

import { Link, useParams } from 'react-router';

import { normalizeApiError } from '../../api/errors.js';

import {
  fetchAdminSupportConversation,
  fetchAdminSupportMessages,
  markAdminSupportConversationRead,
  sendAdminSupportMessage,
} from '../../api/supportApi.js';

import { getRealtimeSocket } from '../../realtime/socket.client.js';

const MESSAGE_LIMIT = 20;
const MESSAGE_MAX_LENGTH = 2000;

const DEFAULT_META = {
  page: 1,
  limit: MESSAGE_LIMIT,
  totalItems: 0,
  totalPages: 0,
};

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value) {
  if (!value) {
    return '';
  }

  return dateFormatter.format(new Date(value));
}

function mergeUniqueMessages(...groups) {
  const messagesById = new Map();

  for (const group of groups) {
    for (const message of group ?? []) {
      if (message?.id) {
        messagesById.set(message.id, message);
      }
    }
  }

  return Array.from(messagesById.values()).sort((first, second) => {
    const difference =
      new Date(first.createdAt).getTime() -
      new Date(second.createdAt).getTime();

    if (difference !== 0) {
      return difference;
    }

    return first.id.localeCompare(second.id);
  });
}

function AdminSupportConversationPage() {
  const { conversationId } = useParams();

  const [conversation, setConversation] = useState(null);

  const [messages, setMessages] = useState([]);

  const [meta, setMeta] = useState(DEFAULT_META);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [olderLoading, setOlderLoading] = useState(false);

  const [olderError, setOlderError] = useState(null);

  const [draft, setDraft] = useState('');

  const [sendStatus, setSendStatus] = useState('idle');

  const [sendError, setSendError] = useState(null);

  const [readError, setReadError] = useState(null);

  const [liveStatus, setLiveStatus] = useState('idle');

  const [liveError, setLiveError] = useState(null);

  const messagesEndRef = useRef(null);

  const shouldScrollToBottomRef = useRef(false);

  const markConversationRead = useCallback(async () => {
    try {
      const updatedConversation =
        await markAdminSupportConversationRead(conversationId);

      setConversation(updatedConversation);

      setReadError(null);
    } catch (requestError) {
      setReadError(
        normalizeApiError(
          requestError,
          'Messages are visible, but the Admin read state could not be updated.',
        ),
      );
    }
  }, [conversationId]);

  const loadConversation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [conversationResult, messageResult] = await Promise.all([
        fetchAdminSupportConversation(conversationId),

        fetchAdminSupportMessages(conversationId, {
          page: 1,
          limit: MESSAGE_LIMIT,
        }),
      ]);

      setConversation(conversationResult);

      shouldScrollToBottomRef.current = true;

      setMessages(messageResult.items);
      setMeta(messageResult.meta);

      /*
       * Opening the conversation means the
       * currently persisted history was viewed.
       */
      await markConversationRead();
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,
          'Unable to load this Support conversation.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [conversationId, markConversationRead]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    if (!shouldScrollToBottomRef.current) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });

    shouldScrollToBottomRef.current = false;
  }, [messages]);

  /*
   * Join only the currently open
   * authorized Support Conversation.
   */
  useEffect(() => {
    if (!conversation?.id) {
      return undefined;
    }

    const socket = getRealtimeSocket();

    let effectActive = true;

    function joinConversationRoom() {
      if (!effectActive) {
        return;
      }

      setLiveStatus('connecting');
      setLiveError(null);

      socket.emit(
        'support:room:join',
        {
          conversationId: conversation.id,
        },
        (response) => {
          if (!effectActive) {
            return;
          }

          if (response?.success) {
            setLiveStatus('live');
            setLiveError(null);

            return;
          }

          setLiveStatus('offline');

          setLiveError(
            response?.error?.message ?? 'Live Support updates are unavailable.',
          );
        },
      );
    }

    function handleConnect() {
      joinConversationRoom();
    }

    function handleDisconnect() {
      if (effectActive) {
        setLiveStatus('offline');
      }
    }

    function handleConnectError(socketError) {
      if (!effectActive) {
        return;
      }

      setLiveStatus('offline');

      setLiveError(
        socketError?.message ?? 'Live Support updates are unavailable.',
      );
    }

    function handleNewMessage(payload) {
      if (
        !effectActive ||
        payload?.conversationId !== conversation.id ||
        !payload?.message?.id
      ) {
        return;
      }

      const message = payload.message;

      shouldScrollToBottomRef.current = true;

      setMessages((current) => mergeUniqueMessages(current, [message]));

      setConversation((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          lastMessageAt: message.createdAt,

          unread: message.senderRole === 'customer' ? true : current.unread,
        };
      });

      /*
       * If the Customer sends while this
       * Admin is actively viewing the
       * Conversation, advance the persisted
       * Admin read marker.
       */
      if (message.senderRole === 'customer') {
        void markConversationRead();
      }
    }

    socket.on('connect', handleConnect);

    socket.on('disconnect', handleDisconnect);

    socket.on('connect_error', handleConnectError);

    socket.on('support:message:new', handleNewMessage);

    if (socket.connected) {
      joinConversationRoom();
    } else {
      setLiveStatus('connecting');
      socket.connect();
    }

    return () => {
      effectActive = false;

      if (socket.connected) {
        socket.emit('support:room:leave', {
          conversationId: conversation.id,
        });
      }

      socket.off('connect', handleConnect);

      socket.off('disconnect', handleDisconnect);

      socket.off('connect_error', handleConnectError);

      socket.off('support:message:new', handleNewMessage);

      socket.disconnect();
    };
  }, [conversation?.id, markConversationRead]);

  async function handleLoadOlder() {
    if (olderLoading || meta.page >= meta.totalPages) {
      return;
    }

    setOlderLoading(true);
    setOlderError(null);

    try {
      const result = await fetchAdminSupportMessages(conversationId, {
        page: meta.page + 1,
        limit: MESSAGE_LIMIT,
      });

      setMessages((current) => mergeUniqueMessages(result.items, current));

      setMeta(result.meta);
    } catch (requestError) {
      setOlderError(
        normalizeApiError(requestError, 'Unable to load earlier messages.'),
      );
    } finally {
      setOlderLoading(false);
    }
  }

  function handleDraftChange(event) {
    setDraft(event.target.value);

    if (sendStatus !== 'sending') {
      setSendStatus('idle');
      setSendError(null);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (sendStatus === 'sending') {
      return;
    }

    const text = draft.trim();

    if (!text) {
      setSendStatus('failed');

      setSendError({
        code: 'SUPPORT_MESSAGE_INVALID',
        message: 'Enter a message before sending.',
      });

      return;
    }

    if (text.length > MESSAGE_MAX_LENGTH) {
      setSendStatus('failed');

      setSendError({
        code: 'SUPPORT_MESSAGE_INVALID',
        message: `Message must be ${MESSAGE_MAX_LENGTH} characters or fewer.`,
      });

      return;
    }

    setSendStatus('sending');
    setSendError(null);

    try {
      const message = await sendAdminSupportMessage(conversationId, text);

      shouldScrollToBottomRef.current = true;

      setMessages((current) => mergeUniqueMessages(current, [message]));

      setConversation((current) => ({
        ...current,

        lastMessageAt: message.createdAt,

        adminLastReadAt: message.createdAt,

        unread: false,
      }));

      setDraft('');
      setSendStatus('sent');
    } catch (requestError) {
      setSendStatus('failed');

      setSendError(
        normalizeApiError(
          requestError,
          'Your Support reply could not be sent. Please try again.',
        ),
      );
    }
  }

  const canLoadOlder = meta.page < meta.totalPages;

  const sending = sendStatus === 'sending';

  return (
    <main className='p-5 sm:p-6'>
      <Link
        to='/admin/support'
        className='text-sm font-medium underline underline-offset-4'>
        Back to Support
      </Link>

      {loading && (
        <section className='mt-6 border border-neutral-200 p-8 text-sm text-neutral-600'>
          Loading Support conversation...
        </section>
      )}

      {!loading && error && (
        <section className='mt-6 border border-red-200 bg-red-50 p-6'>
          <p role='alert' className='text-sm text-red-700'>
            {error.message}
          </p>

          <button
            type='button'
            onClick={loadConversation}
            className='mt-4 bg-black px-4 py-2 text-sm font-medium text-white'>
            Try again
          </button>
        </section>
      )}

      {!loading && !error && conversation && (
        <>
          <div className='mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
            <div>
              <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
                Support conversation
              </p>

              <h1 className='mt-3 text-3xl font-semibold'>
                {conversation.customer?.name ?? 'Customer'}
              </h1>

              <p className='mt-2 break-all text-sm text-neutral-600'>
                {conversation.customer?.email ?? 'Email unavailable'}
              </p>
            </div>

            <div className='w-fit border border-neutral-200 px-4 py-3'>
              <p className='text-xs font-medium uppercase tracking-wide text-neutral-500'>
                Live updates
              </p>

              <p className='mt-1 text-sm font-medium'>
                {liveStatus === 'live'
                  ? 'Connected'
                  : liveStatus === 'connecting'
                    ? 'Connecting...'
                    : 'Offline'}
              </p>
            </div>
          </div>

          {liveError && (
            <div className='mt-5 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
              Live updates are currently unavailable. REST messaging remains
              available.
            </div>
          )}

          {readError && (
            <div className='mt-5 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
              {readError.message}
            </div>
          )}

          <section className='mt-6 overflow-hidden border border-neutral-200'>
            <div className='border-b border-neutral-200 px-5 py-4'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <h2 className='font-semibold'>Conversation</h2>

                {conversation.unread ? (
                  <span className='bg-black px-2.5 py-1 text-xs font-medium text-white'>
                    Unread
                  </span>
                ) : (
                  <span className='text-xs font-medium text-neutral-500'>
                    Read
                  </span>
                )}
              </div>
            </div>

            <div className='min-h-[400px] max-h-[60vh] overflow-y-auto bg-neutral-50 p-4 sm:p-6'>
              {canLoadOlder && (
                <div className='mb-6 text-center'>
                  <button
                    type='button'
                    disabled={olderLoading}
                    onClick={handleLoadOlder}
                    className='border border-neutral-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50'>
                    {olderLoading ? 'Loading...' : 'Load earlier messages'}
                  </button>
                </div>
              )}

              {olderError && (
                <div className='mb-6 border border-red-200 bg-red-50 px-4 py-3'>
                  <p role='alert' className='text-sm text-red-700'>
                    {olderError.message}
                  </p>
                </div>
              )}

              {messages.length === 0 && (
                <div className='flex min-h-[300px] items-center justify-center text-center'>
                  <div>
                    <h3 className='font-semibold'>No messages yet</h3>

                    <p className='mt-2 text-sm text-neutral-600'>
                      This Support conversation has no messages.
                    </p>
                  </div>
                </div>
              )}

              <div className='space-y-5'>
                {messages.map((message) => {
                  const fromAdmin = message.senderRole === 'admin';

                  return (
                    <div
                      key={message.id}
                      className={`flex ${
                        fromAdmin ? 'justify-end' : 'justify-start'
                      }`}>
                      <div className='max-w-[85%] sm:max-w-[70%]'>
                        <p
                          className={`mb-1 text-xs font-medium text-neutral-500 ${
                            fromAdmin ? 'text-right' : ''
                          }`}>
                          {fromAdmin
                            ? 'You'
                            : (conversation.customer?.name ?? 'Customer')}
                        </p>

                        <div
                          className={`px-4 py-3 text-sm leading-6 ${
                            fromAdmin
                              ? 'bg-black text-white'
                              : 'border border-neutral-200 bg-white'
                          }`}>
                          <p className='whitespace-pre-wrap break-words'>
                            {message.text}
                          </p>
                        </div>

                        <p
                          className={`mt-1 text-xs text-neutral-500 ${
                            fromAdmin ? 'text-right' : ''
                          }`}>
                          {formatDate(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleSubmit}
              className='border-t border-neutral-200 bg-white p-4 sm:p-5'>
              <label
                htmlFor='admin-support-message'
                className='mb-2 block text-sm font-medium'>
                Reply
              </label>

              <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
                <div className='flex-1'>
                  <textarea
                    id='admin-support-message'
                    rows={3}
                    value={draft}
                    maxLength={MESSAGE_MAX_LENGTH}
                    disabled={sending}
                    onChange={handleDraftChange}
                    placeholder='Type a reply...'
                    className='w-full resize-none border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-black disabled:bg-neutral-50'
                  />

                  <div className='mt-1 flex justify-between gap-4 text-xs text-neutral-500'>
                    <span>Text messages only</span>

                    <span>
                      {draft.length}/{MESSAGE_MAX_LENGTH}
                    </span>
                  </div>
                </div>

                <button
                  type='submit'
                  disabled={sending || !draft.trim()}
                  className='bg-black px-6 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50'>
                  {sending ? 'Sending...' : 'Send reply'}
                </button>
              </div>

              {sendStatus === 'sent' && (
                <p
                  role='status'
                  className='mt-3 text-sm font-medium text-green-700'>
                  Sent
                </p>
              )}

              {sendStatus === 'failed' && sendError && (
                <div className='mt-3 border border-red-200 bg-red-50 px-4 py-3'>
                  <p role='alert' className='text-sm text-red-700'>
                    {sendError.message}
                  </p>

                  <p className='mt-1 text-xs text-red-600'>
                    Your reply remains in the box so you can retry.
                  </p>
                </div>
              )}
            </form>
          </section>
        </>
      )}
    </main>
  );
}

export default AdminSupportConversationPage;
