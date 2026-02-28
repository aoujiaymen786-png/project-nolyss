import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Suppress noisy ResizeObserver loop errors in development overlay
// Some browsers/libraries throw "ResizeObserver loop completed with undelivered notifications."
// which triggers the React dev overlay; swallow those to avoid blocking UX during dev.
if (typeof window !== 'undefined') {
  window.addEventListener(
    'error',
    (event) => {
      try {
        const msg = event && (event.message || (event.error && event.error.message));
        if (msg && msg.toString().includes('ResizeObserver')) {
          event.stopImmediatePropagation();
          event.preventDefault();
        }
      } catch (e) {
        // ignore
      }
    },
    true
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
