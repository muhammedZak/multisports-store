export function normalizeApiError(
  error,
  fallbackMessage = 'Something went wrong.',
) {
  const apiError = error.response?.data?.error;

  return {
    code: apiError?.code || 'REQUEST_FAILED',

    message: apiError?.message || fallbackMessage,

    fields: apiError?.fields || {},
  };
}
