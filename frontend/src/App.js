import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useCapacitor, useSafeArea, isNativeApp } from './utils/capacitor';
import Navbar from './components/Navbar';
import AuthCallback from './components/AuthCallback';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateRaffle from './pages/CreateRaffle';
import ManageRaffle from './pages/ManageRaffle';
import PublicRaffle from './pages/PublicRaffle';
import MyTickets from './pages/MyTickets';
import Pricing from './pages/Pricing';
import PaymentSuccess from './pages/PaymentSuccess';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsConditions from './pages/TermsConditions';
import './App.css';
import OAuthSuccess from './pages/OAuthSuccess';
import OAuthError from './pages/OAuthError';


// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Guest Route Component (for login/register when already logged in)
const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Layout with Navbar
const Layout = ({ children, showNavbar = true }) => {
  return (
    <>
      {showNavbar && <Navbar />}
      {children}
    </>
  );
};

// Router wrapper
function AppRouter() {
  return <AppRoutes />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Layout><Landing /></Layout>} />
      <Route path="/pricing" element={<Layout><Pricing /></Layout>} />
      <Route path="/raffle/:shareCode" element={<Layout><PublicRaffle /></Layout>} />
      <Route path="/payment/success" element={<Layout><PaymentSuccess /></Layout>} />
      <Route path="/privacy" element={<Layout><PrivacyPolicy /></Layout>} />
      <Route path="/terms" element={<Layout><TermsConditions /></Layout>} />

      {/* Guest Routes */}
      <Route
        path="/login"
        element={
          <GuestRoute>
            <Layout showNavbar={false}><Login /></Layout>
          </GuestRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestRoute>
            <Layout showNavbar={false}><Register /></Layout>
          </GuestRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout><Dashboard /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-raffle"
        element={
          <ProtectedRoute>
            <Layout><CreateRaffle /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/manage-raffle/:raffleId"
        element={
          <ProtectedRoute>
            <Layout><ManageRaffle /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-tickets"
        element={
          <ProtectedRoute>
            <Layout><MyTickets /></Layout>
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/oauth-success" element={<Layout><OAuthSuccess /></Layout>} />
      <Route path="/oauth-error" element={<Layout><OAuthError /></Layout>} />
    </Routes>
  );
}

function App() {
  // Initialize Capacitor for native app
  useCapacitor();
  useSafeArea();

  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <AuthProvider>
          <div className={isNativeApp() ? 'native-app' : ''}>
            <AppRouter />
            <Toaster position="top-right" richColors />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
