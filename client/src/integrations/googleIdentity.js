const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';

let scriptPromise = null;
let initialized = false;

let currentCredentialHandler = null;

function getGoogleClientId() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is required.');
  }

  return clientId;
}

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google.accounts.id);
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');

    script.src = GOOGLE_IDENTITY_SCRIPT;
    script.async = true;

    script.onload = () => {
      const googleIdentity = window.google?.accounts?.id;

      if (!googleIdentity) {
        scriptPromise = null;

        reject(new Error('Google Identity Services failed to initialize.'));

        return;
      }

      resolve(googleIdentity);
    };

    script.onerror = () => {
      scriptPromise = null;

      reject(new Error('Google Identity Services failed to load.'));
    };

    document.head.appendChild(script);
  });

  return scriptPromise;
}

export async function prepareGoogleIdentity(credentialHandler) {
  currentCredentialHandler = credentialHandler;

  const googleIdentity = await loadGoogleIdentityScript();

  if (!initialized) {
    googleIdentity.initialize({
      client_id: getGoogleClientId(),

      callback(response) {
        currentCredentialHandler?.(response);
      },
    });

    initialized = true;
  }

  return googleIdentity;
}
