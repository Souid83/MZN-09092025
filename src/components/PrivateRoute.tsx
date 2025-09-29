import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

interface PrivateRouteProps {
  children: React.ReactNode;
  roles?: string[]; // optionnel : ['admin', 'exploit']
}

export default function PrivateRoute({ children, roles }: PrivateRouteProps) {
  const { user, loading } = useUser();
console.log("🧪 USER :", user);
console.log("🧪 LOADING :", loading);

  if (loading) {
    console.log("⏳ Chargement user dans PrivateRoute");
    return <div className="p-8">Chargement...</div>;
  }

  if (!user) {
    console.log("🚫 Pas de user → redirection /login");
    return <Navigate to="/login" replace />;
  }

  if (roles) {
    const allowed = roles.map(r => r.toLowerCase());
    const current = (user.role || '').toLowerCase();
    if (!allowed.includes(current)) {
      console.log("⛔ Rôle non autorisé :", user.role);
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}
