import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { SearchProvider } from './contexts/SearchContext';
import { ToastContainer } from './components/ToastContainer';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <SearchProvider>
          <App />
          <ToastContainer />
        </SearchProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);