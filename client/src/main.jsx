import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router';

import './index.css';

import App from './App.jsx';

import { store } from './app/store/store.js';

import { bootstrapAuth } from './features/auth/authSlice.js';

store.dispatch(bootstrapAuth());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
