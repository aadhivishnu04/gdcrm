import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Importing the pages from your src/pages directory
import Login from './pages/Login';
import Layout from './pages/Layout';
import Dashboard from './pages/Dashboard';
import LeadsManager from './pages/LeadsManager';
import SalesDashboard from './pages/SalesDashboard';

import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes wrapped in the Layout (which likely contains your Sidebar) */}
        <Route path="/" element={<Layout />}>
          {/* Automatically redirect the root path to the dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="leads" element={<LeadsManager />} />
          <Route path="sales" element={<SalesDashboard />} />
        </Route>

        {/* Fallback route for unknown URLs */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;