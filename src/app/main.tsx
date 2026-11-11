import { initializePersistence } from '../store/sessionStore';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import '../styles/global.css';

const stopPersistence = initializePersistence();
if (import.meta.hot) import.meta.hot.dispose(stopPersistence);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
