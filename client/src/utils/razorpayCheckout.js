const RAZORPAY_CHECKOUT_SCRIPT_ID = 'razorpay-checkout-script';

const RAZORPAY_CHECKOUT_SCRIPT_URL =
  'https://checkout.razorpay.com/v1/checkout.js';

let checkoutLoaderPromise = null;

export function loadRazorpayCheckout() {
  if (typeof window === 'undefined') {
    return Promise.reject(
      new Error('Razorpay Checkout can only load in the browser.'),
    );
  }

  if (window.Razorpay) {
    return Promise.resolve(window.Razorpay);
  }

  if (checkoutLoaderPromise) {
    return checkoutLoaderPromise;
  }

  checkoutLoaderPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(RAZORPAY_CHECKOUT_SCRIPT_ID);

    function handleLoad() {
      if (!window.Razorpay) {
        reject(
          new Error(
            'Razorpay Checkout loaded without exposing the Checkout API.',
          ),
        );

        return;
      }

      resolve(window.Razorpay);
    }

    function handleError() {
      reject(new Error('Unable to load Razorpay Checkout.'));
    }

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad, {
        once: true,
      });

      existingScript.addEventListener('error', handleError, {
        once: true,
      });

      return;
    }

    const script = document.createElement('script');

    script.id = RAZORPAY_CHECKOUT_SCRIPT_ID;

    script.src = RAZORPAY_CHECKOUT_SCRIPT_URL;

    script.async = true;

    script.addEventListener('load', handleLoad, {
      once: true,
    });

    script.addEventListener('error', handleError, {
      once: true,
    });

    document.body.appendChild(script);
  }).catch((error) => {
    checkoutLoaderPromise = null;

    throw error;
  });

  return checkoutLoaderPromise;
}

export async function openRazorpayCheckout({ options, onPaymentFailed }) {
  const Razorpay = await loadRazorpayCheckout();

  return new Promise((resolve, reject) => {
    let settled = false;

    const checkout = new Razorpay({
      ...options,

      handler(response) {
        if (settled) {
          return;
        }

        settled = true;

        resolve({
          status: 'success',
          response,
        });
      },

      modal: {
        ...(options.modal ?? {}),

        ondismiss() {
          options.modal?.ondismiss?.();

          if (settled) {
            return;
          }

          settled = true;

          resolve({
            status: 'cancelled',
          });
        },
      },
    });

    checkout.on('payment.failed', (response) => {
      onPaymentFailed?.(response?.error ?? null);
    });

    try {
      checkout.open();
    } catch (error) {
      reject(error);
    }
  });
}
