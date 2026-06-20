import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore.js';
import { connectWS } from './services/websocket.js';
import Login from './pages/Login.jsx';
import AgentDashboard from './pages/AgentDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import FarmersList from './pages/FarmersList.jsx';
import VetsList from './pages/VetsList.jsx';

function ProtectedRoute({ children, adminOnly = false }) {
  const { agent } = useAuthStore();
  if (!agent) return <Navigate to="/login" replace />;
  if (adminOnly && !agent.isAdmin) return <Navigate to="/agent" replace />;
  return children;
}

export default function App() {
  const { agent, token } = useAuthStore();

  useEffect(() => {
    if (token) connectWS(token);
  }, [token]);

  return (
    <Routes>
      <Route path="/login" element={agent ? <Navigate to={agent.isAdmin ? '/admin' : '/agent'} /> : <Login />} />
      <Route path="/agent" element={<ProtectedRoute><AgentDashboard /></ProtectedRoute>} />
      <Route path="/agent/farmers" element={<ProtectedRoute><FarmersList /></ProtectedRoute>} />
      <Route path="/agent/vets" element={<ProtectedRoute><VetsList /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={agent ? (agent.isAdmin ? '/admin' : '/agent') : '/login'} replace />} />
    </Routes>
  );
}
