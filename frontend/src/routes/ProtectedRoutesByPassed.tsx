import { Route, Routes as ReactRoutes } from 'react-router-dom';
import AdminLayout from '../layouts/admin';
import React from 'react';

export default function ProtectedRoutesByPassed() {
  return (
    <ReactRoutes>
      <Route path="/*" element={<AdminLayout />} />
    </ReactRoutes>
  );
}

