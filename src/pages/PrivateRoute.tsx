import React from 'react';
import { Navigate } from 'react-router-dom';

export default function PrivateRoute({ children, requiredRole }) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  if (!token || !user) return <Navigate to="/" />;

  // Optional: Check for role if required
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" />;
  }

  return children;
}
