import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { UserProvider } from './contexts/UserContext';
import PrivateRoute from './components/PrivateRoute';
import LoginForm from './components/LoginForm';
import Pilotage from './pages/Pilotage';
import Clients from './pages/Clients';
import ClientsVisible from './pages/ClientsVisible';
import Fournisseurs from './pages/Fournisseurs';
import Transport from './pages/Transport';
import Freight from './pages/Freight';
import Settings from './pages/Settings';
import CompanySettings from './pages/CompanySettings';
import EmailSettings from './pages/EmailSettings';
import AISettings from './pages/AISettings';
import Users from './pages/Users';
import UserClientAttributions from './pages/UserClientAttributions';
import UserFournisseurAttributions from './pages/UserFournisseurAttributions';
import Disputes from './pages/Disputes';
import Pending from './pages/Pending';
import Invoices from './pages/Invoices';
import Quotes from './pages/Quotes';
import CreditNotes from './pages/CreditNotes';
import Statistics from './pages/Statistics';
import Sidebar from './components/Sidebar';

function App() {
  return (
    <Router>
      <UserProvider>
        <div className="min-h-screen bg-gray-100">
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Sidebar />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard\" replace />} />
              <Route path="dashboard" element={<Pilotage />} />
              <Route path="clients" element={
                <PrivateRoute roles={['admin', 'compta', 'direction', 'exploit', 'exploitation']}>
                  <Clients />
                </PrivateRoute>
              } />
              <Route path="clients-visible" element={
                <PrivateRoute roles={['exploit']}>
                  <ClientsVisible />
                </PrivateRoute>
              } />
              <Route path="suppliers" element={<Fournisseurs />} />
              <Route path="transport" element={<Transport />} />
              <Route path="freight" element={<Freight />} />
              <Route path="disputes" element={<Disputes />} />
              <Route path="pending" element={<Pending />} />
              <Route path="invoices" element={
                <PrivateRoute roles={['admin', 'compta', 'direction']}>
                  <Invoices />
                </PrivateRoute>
              } />
              <Route path="quotes" element={<Quotes />} />
              <Route path="credit-notes" element={<CreditNotes />} />
              <Route path="statistics" element={
                <PrivateRoute roles={['admin', 'compta', 'direction']}>
                  <Statistics />
                </PrivateRoute>
              } />
              <Route path="settings" element={<Settings />} />
              <Route
                path="settings/company"
                element={
                  <PrivateRoute>
                    <CompanySettings />
                  </PrivateRoute>
                }
              />
              <Route
                path="settings/email"
                element={
                  <PrivateRoute roles={['admin']}>
                    <EmailSettings />
                  </PrivateRoute>
                }
              />
              <Route
                path="settings/ai"
                element={
                  <PrivateRoute roles={['admin']}>
                    <AISettings />
                  </PrivateRoute>
                }
              />
              <Route
                path="settings/users"
                element={
                  <PrivateRoute roles={['admin']}>
                    <Users />
                  </PrivateRoute>
                }
              />
              <Route
                path="settings/user-clients"
                element={
                  <PrivateRoute roles={['admin']}>
                    <UserClientAttributions />
                  </PrivateRoute>
                }
              />
              <Route
                path="settings/user-fournisseurs"
                element={
                  <PrivateRoute roles={['admin']}>
                    <UserFournisseurAttributions />
                  </PrivateRoute>
                }
              />
            </Route>
          </Routes>
          <Toaster position="top-right" />
        </div>
      </UserProvider>
    </Router>
  );
}

export default App;
