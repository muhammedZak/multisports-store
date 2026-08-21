import { io } from 'socket.io-client';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error('VITE_API_BASE_URL is required');
}

/*
 * Example:
 *
 * VITE_API_BASE_URL
 * http://localhost:5000/api/v1
 *
 * Socket server
 * http://localhost:5000
 */
const socketBaseUrl = new URL(apiBaseUrl, window.location.origin).origin;

let socketInstance = null;

export function getRealtimeSocket() {
  if (!socketInstance) {
    socketInstance = io(socketBaseUrl, {
      autoConnect: false,

      /*
       * Send the same application-session
       * cookie used by Axios.
       */
      withCredentials: true,
    });
  }

  return socketInstance;
}
