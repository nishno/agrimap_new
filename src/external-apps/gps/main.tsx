import '../../lib/leafletSafety';
import 'leaflet/dist/leaflet.css';
import '../../index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { GpsIotApp } from './GpsIotApp';

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <ErrorBoundary>
      <LanguageProvider>
        <GpsIotApp />
      </LanguageProvider>
    </ErrorBoundary>
  );
}
