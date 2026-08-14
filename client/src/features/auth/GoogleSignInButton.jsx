import { useEffect, useRef, useState } from 'react';

import { prepareGoogleIdentity } from '../../integrations/googleIdentity.js';

function GoogleSignInButton({ onCredential, disabled = false }) {
  const buttonRef = useRef(null);
  const handlerRef = useRef(onCredential);

  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    handlerRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;

    async function renderGoogleButton() {
      try {
        setLoadError('');

        const googleIdentity = await prepareGoogleIdentity((response) => {
          if (
            !cancelled &&
            typeof response?.credential === 'string' &&
            response.credential
          ) {
            handlerRef.current?.(response.credential);
          }
        });

        if (cancelled || !buttonRef.current) {
          return;
        }

        buttonRef.current.replaceChildren();

        googleIdentity.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        });
      } catch {
        if (!cancelled) {
          setLoadError('Google sign-in is unavailable right now.');
        }
      }
    }

    renderGoogleButton();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className={disabled ? 'pointer-events-none opacity-50' : undefined}>
        <div ref={buttonRef} />
      </div>

      {loadError && (
        <p role='alert' className='mt-2 text-sm text-red-600'>
          {loadError}
        </p>
      )}
    </div>
  );
}

export default GoogleSignInButton;
