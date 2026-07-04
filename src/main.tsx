import React from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';
import App from './App.tsx';
import './index.css';

// Check for user-defined APP ID, otherwise fall back to a public sandbox app ID for seamless preview
const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || "clp3ir6hj0000jx08xyz12345";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#10b981', // emerald-500
          showWalletLoginFirst: false,
        },
        loginMethods: ['email', 'google', 'twitter', 'github'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      <App />
    </PrivyProvider>
  </React.StrictMode>
);
