import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HomePage } from './pages/HomePage';
import { FreeServicesPage } from './pages/FreeServicesPage';
import { UidCheckerPage } from './pages/UidCheckerPage';
import { SpeedTestPage } from './pages/SpeedTestPage';
import { WebsiteSpeedPage } from './pages/WebsiteSpeedPage';
import { GuildGloryPage } from './pages/GuildGloryPage';
import { ThankYouPage } from './pages/ThankYouPage';
import { AboutPage } from './pages/AboutPage';
import { SafetyPage } from './pages/SafetyPage';
import { ContactPage } from './pages/ContactPage';
import { NotFoundPage } from './pages/NotFoundPage';

function RouteViewport() {
  const { currentPath } = useApp();

  switch (currentPath) {
    case '/':
      return <HomePage />;
    case '/free-services':
      return <FreeServicesPage />;
    case '/uid-checker':
      return <UidCheckerPage />;
    case '/speed-test':
      return <SpeedTestPage />;
    case '/website-speed':
      return <WebsiteSpeedPage />;
    case '/guild-glory':
      return <GuildGloryPage />;
    case '/thank-you':
      return <ThankYouPage />;
    case '/about':
      return <AboutPage />;
    case '/safety':
      return <SafetyPage />;
    case '/contact':
      return <ContactPage />;
    case '/not-found':
    default:
      return <NotFoundPage />;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Layout>
          <RouteViewport />
        </Layout>
      </AppProvider>
    </ErrorBoundary>
  );
}
