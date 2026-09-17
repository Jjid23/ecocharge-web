/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { BottleDetectionPage } from './pages/BottleDetectionPage';
import { PortSelectionPage } from './pages/PortSelectionPage';
import { ChargingDurationPage } from './pages/ChargingDurationPage';
import { ChargingSessionPage } from './pages/ChargingSessionPage';
import { RecyclingHistoryPage } from './pages/RecyclingHistoryPage';
import { ChargingHistoryPage } from './pages/ChargingHistoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { TermsPrivacyPage } from './pages/TermsPrivacyPage';

const MainContent: React.FC = () => {
  const { currentPage, user } = useAuth();

  const renderView = () => {
    switch (currentPage) {
      case 'landing':
      case 'how-it-works':
      case 'rewards':
      case 'about':
        return <LandingPage />;
      case 'signin':
        return <LoginPage />;
      case 'register':
        return <RegisterPage />;
      case 'dashboard':
        return user ? <DashboardPage /> : <LoginPage />;
      case 'bottle-detection':
        return user ? <BottleDetectionPage /> : <LoginPage />;
      case 'port-selection':
        return user ? <PortSelectionPage /> : <LoginPage />;
      case 'charging-duration':
        return user ? <ChargingDurationPage /> : <LoginPage />;
      case 'charging-session':
        return user ? <ChargingSessionPage /> : <LoginPage />;
      case 'recycling-history':
        return user ? <RecyclingHistoryPage /> : <LoginPage />;
      case 'charging-history':
        return user ? <ChargingHistoryPage /> : <LoginPage />;
      case 'profile':
        return user ? <ProfilePage /> : <LoginPage />;
      case 'admin':
        return user ? <AdminDashboardPage /> : <LoginPage />;
      case 'terms-privacy':
        return <TermsPrivacyPage />;
      default:
        return <LandingPage />;
    }
  };

  const isAdmin = user?.role === 'admin';
  const isAdminPage = currentPage === 'admin';

  return (
    /* Portrait kiosk container for user pages; full-width for admin */
    <div className={
      isAdminPage
        ? "w-full min-h-screen bg-emerald-950 text-emerald-100 font-sans flex flex-col"
        : "kiosk-screen bg-emerald-950 text-emerald-100 font-sans selection:bg-emerald-500 selection:text-emerald-950"
    }>
      {!isAdminPage && <Navbar />}
      <main className={`flex-1 flex flex-col ${isAdminPage ? '' : 'kiosk-scroll'}`}>
        {renderView()}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
