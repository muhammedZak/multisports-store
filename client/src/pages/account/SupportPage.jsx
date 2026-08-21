import { useCallback, useEffect, useRef, useState } from 'react';

import { Link } from 'react-router';

import { normalizeApiError } from '../../api/errors.js';

import {
  createMySupportConversation,
  fetchMySupportConversation,
  fetchMySupportMessages,
  markMySupportConversationRead,
  sendMySupportMessage,
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

function formatMessageDate(value) {
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
    const timeDifference =
      new Date(first.createdAt).getTime() -
      new Date(second.createdAt).getTime();

    if (timeDifference !== 0) {
      return timeDifference;
    }

    return first.id.localeCompare(second.id);
  });
}

function SupportPage() {
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
      const updatedConversation = await markMySupportConversationRead();

      setConversation(updatedConversation);

      setReadError(null);
    } catch (requestError) {
      setReadError(
        normalizeApiError(
          requestError,
          'Messages are visible, but the read state could not be updated.',
        ),
      );
    }
  }, []);

  const loadSupport = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const currentConversation = await fetchMySupportConversation();

      setConversation(currentConversation);

      /*
       * Never-started Support is a normal
       * Customer state.
       */
      if (!currentConversation) {
        setMessages([]);
        setMeta(DEFAULT_META);

        return;
      }

      const result = await fetchMySupportMessages({
        page: 1,
        limit: MESSAGE_LIMIT,
      });

      shouldScrollToBottomRef.current = true;

      setMessages(result.items);
      setMeta(result.meta);

      /*
       * Opening the conversation means the
       * currently persisted history was seen.
       */
      await markConversationRead();
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,
          'Unable to load Support. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [markConversationRead]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSupport();
  }, [loadSupport]);

  /*
   * Scroll only for:
   *
   * - initial newest history
   * - newly sent Message
   * - live Message
   *
   * Loading older history should NOT push
   * the Customer back to the bottom.
   */
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
   * Socket.IO live delivery.
   *
   * The socket does not create Messages.
   *
   * REST remains the write path.
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

          setLiveError({
            code: response?.error?.code ?? 'SOCKET_ROOM_JOIN_FAILED',

            message:
              response?.error?.message ??
              'Live Support updates are unavailable.',
          });
        },
      );
    }

    function handleConnect() {
      joinConversationRoom();
    }

    function handleDisconnect() {
      if (!effectActive) {
        return;
      }

      setLiveStatus('offline');
    }

    function handleConnectError(socketError) {
      if (!effectActive) {
        return;
      }

      setLiveStatus('offline');

      setLiveError({
        code: socketError?.data?.code ?? 'SOCKET_CONNECTION_FAILED',

        message:
          socketError?.message ?? 'Live Support updates are unavailable.',
      });
    }

    function handleNewMessage(payload) {
      if (
        !effectActive ||
        payload?.conversationId !== conversation.id ||
        !payload?.message?.id
      ) {
        return;
      }

      shouldScrollToBottomRef.current = true;

      /*
       * The server sends an already-persisted
       * Message.
       *
       * Merge by Message ID because the Customer
       * who sends through REST may also receive
       * the same persisted Message over Socket.IO.
       */
      setMessages((current) => mergeUniqueMessages(current, [payload.message]));

      /*
       * Only an incoming Admin Message needs
       * Customer read-state advancement here.
       *
       * Customer sends already advance the
       * Customer marker on the backend.
       */
      if (payload.message.senderRole === 'admin') {
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
      const nextPage = meta.page + 1;

      const result = await fetchMySupportMessages({
        page: nextPage,
        limit: MESSAGE_LIMIT,
      });

      /*
       * Do not scroll to bottom here.
       *
       * These are older Messages.
       */
      setMessages((current) => mergeUniqueMessages(result.items, current));

      setMeta(result.meta);
    } catch (requestError) {
      setOlderError(
        normalizeApiError(
          requestError,
          'Unable to load earlier messages. Please try again.',
        ),
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
      let activeConversation = conversation;

      /*
       * We deliberately do not create an empty
       * Conversation merely because the Customer
       * visited /account/support.
       *
       * First actual send creates/reuses the
       * persistent Conversation.
       */
      if (!activeConversation) {
        activeConversation = await createMySupportConversation();

        setConversation(activeConversation);
      }

      /*
       * Authoritative write path.
       */
      const message = await sendMySupportMessage(text);

      shouldScrollToBottomRef.current = true;

      setMessages((current) => mergeUniqueMessages(current, [message]));

      /*
       * Keep local Conversation timestamps aligned
       * with the successful REST result.
       */
      setConversation((current) => ({
        ...(current ?? activeConversation),

        lastMessageAt: message.createdAt,

        customerLastReadAt: message.createdAt,
      }));

      setDraft('');

      setSendStatus('sent');
    } catch (requestError) {
      /*
       * Draft remains intact so the Customer can
       * retry without retyping.
       */
      setSendStatus('failed');

      setSendError(
        normalizeApiError(
          requestError,
          'Your message could not be sent. Please try again.',
        ),
      );
    }
  }

  const canLoadOlder = meta.totalPages > 0 && meta.page < meta.totalPages;

  const sending = sendStatus === 'sending';

  return (
    <main className='mx-auto max-w-4xl p-6'>
      <Link
        to='/account'
        className='text-sm font-medium underline underline-offset-4'>
        Back to profile
      </Link>

      <div className='mt-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
            My account
          </p>

          <h1 className='mt-3 text-3xl font-semibold'>Support</h1>

          <p className='mt-3 max-w-2xl text-sm leading-6 text-neutral-600'>
            Send a message to the store support team and keep your conversation
            history in one place.
          </p>
        </div>

        {conversation && (
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
        )}
      </div>

      {loading && (
        <section className='mt-8 border border-neutral-200 p-6'>
          <p className='text-sm text-neutral-600'>Loading Support...</p>
        </section>
      )}

      {!loading && error && (
        <section className='mt-8 border border-red-200 bg-red-50 p-6'>
          <p role='alert' className='text-sm text-red-700'>
            {error.message}
          </p>

          <button
            type='button'
            onClick={loadSupport}
            className='mt-4 bg-black px-4 py-2 text-sm font-medium text-white'>
            Try again
          </button>
        </section>
      )}

      {!loading && !error && liveError && conversation && (
        <div
          role='status'
          className='mt-6 border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800'>
          Live updates are currently unavailable. You can still send messages
          normally. Refreshing the conversation will load persisted replies.
        </div>
      )}

      {!loading && !error && readError && (
        <div
          role='status'
          className='mt-6 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
          {readError.message}
        </div>
      )}

      {!loading && !error && (
        <section className='mt-8 overflow-hidden border border-neutral-200'>
          <div className='border-b border-neutral-200 px-5 py-4'>
            <h2 className='font-semibold'>Customer Support</h2>

            <p className='mt-1 text-xs leading-5 text-neutral-500'>
              Your messages and Support replies are saved to this conversation.
            </p>
          </div>

          <div className='min-h-[360px] max-h-[60vh] overflow-y-auto bg-neutral-50 p-4 sm:p-6'>
            {canLoadOlder && (
              <div className='mb-6 text-center'>
                <button
                  type='button'
                  disabled={olderLoading}
                  onClick={handleLoadOlder}
                  className='border border-neutral-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50'>
                  {olderLoading ? 'Loading...' : 'Load earlier messages'}
                </button>
              </div>
            )}

            {olderError && (
              <div className='mb-6 border border-red-200 bg-red-50 px-4 py-3'>
                <p role='alert' className='text-sm text-red-700'>
                  {olderError.message}
                </p>

                <button
                  type='button'
                  disabled={olderLoading}
                  onClick={handleLoadOlder}
                  className='mt-3 text-sm font-medium underline underline-offset-4'>
                  Try again
                </button>
              </div>
            )}

            {messages.length === 0 && (
              <div className='flex min-h-[280px] items-center justify-center text-center'>
                <div className='max-w-sm'>
                  <h3 className='font-semibold'>Start a conversation</h3>

                  <p className='mt-2 text-sm leading-6 text-neutral-600'>
                    Send your first message below. We will keep this as your
                    persistent Support conversation.
                  </p>
                </div>
              </div>
            )}

            {messages.length > 0 && (
              <div className='space-y-5'>
                {messages.map((message) => {
                  const fromCustomer = message.senderRole === 'customer';

                  return (
                    <div
                      key={message.id}
                      className={`flex ${
                        fromCustomer ? 'justify-end' : 'justify-start'
                      }`}>
                      <div className='max-w-[85%] sm:max-w-[70%]'>
                        <p
                          className={`mb-1 text-xs font-medium ${
                            fromCustomer
                              ? 'text-right text-neutral-500'
                              : 'text-neutral-500'
                          }`}>
                          {fromCustomer ? 'You' : 'Support'}
                        </p>

                        <div
                          className={`px-4 py-3 text-sm leading-6 ${
                            fromCustomer
                              ? 'bg-black text-white'
                              : 'border border-neutral-200 bg-white text-neutral-900'
                          }`}>
                          <p className='whitespace-pre-wrap break-words'>
                            {message.text}
                          </p>
                        </div>

                        <p
                          className={`mt-1 text-xs text-neutral-500 ${
                            fromCustomer ? 'text-right' : ''
                          }`}>
                          {formatMessageDate(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className='border-t border-neutral-200 bg-white p-4 sm:p-5'>
            <label
              htmlFor='support-message'
              className='mb-2 block text-sm font-medium'>
              Message
            </label>

            <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
              <div className='flex-1'>
                <textarea
                  id='support-message'
                  value={draft}
                  maxLength={MESSAGE_MAX_LENGTH}
                  rows={3}
                  disabled={sending}
                  onChange={handleDraftChange}
                  placeholder='Type a message...'
                  className='w-full resize-none border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-black disabled:bg-neutral-50'
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
                className='bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50'>
                {sending ? 'Sending...' : 'Send'}
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
                  Your message is still in the box so you can retry.
                </p>
              </div>
            )}
          </form>
        </section>
      )}
    </main>
  );
}

export default SupportPage;
