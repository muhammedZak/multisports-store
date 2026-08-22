import { useEffect, useState } from 'react';

export function useResendCooldown() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds <= 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [seconds]);

  function start(duration) {
    setSeconds(duration);
  }

  function reset() {
    setSeconds(0);
  }

  return {
    seconds,

    active: seconds > 0,

    start,
    reset,
  };
}
