import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Importing the pages from your src/pages directory
import Login from './pages/Login';
import Layout from './pages/Layout';
import Dashboard from './pages/Dashboard';
import LeadsManager from './pages/LeadsManager';
import SalesDashboard from './pages/SalesDashboard';
import { ProtectedRoute } from "./pages/ProtectedRoute";
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Layout: Everything inside requires a valid session token */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Automatically redirect the root path to the dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          {/* Protected Inner Routes */}
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