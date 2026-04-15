import React from 'react';
import { Navigate } from 'react-router-dom';

export default function PrivateRoute({ children, requiredRole }) {
  const token = localStorage.getItem('token');
  const userStorage = localStorage.getItem('user');
  const user = userStorage ? JSON.parse(userStorage) : null;

  if (!token || !user) return <Navigate to="/" />;

  // Optional: Check for role if required
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" />;
  }

  return children;
}
