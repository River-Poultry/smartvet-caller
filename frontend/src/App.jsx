import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import TicketDetail from './pages/TicketDetail';
import Calls from './pages/Calls';
import Analytics from './pages/Analytics';
import VetboardReviews from './pages/VetboardReviews';
import Paravets from './pages/Paravets';
import Dispatch from './pages/Dispatch';
import AiAssistant from './pages/AiAssistant';
import Recordings from './pages/Recordings';
import Users from './pages/Users';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/analytics" element={
              <ProtectedRoute roles={['super_admin', 'admin']}>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
            <Route path="/calls" element={<Calls />} />
            <Route path="/paravets" element={<Paravets />} />
            <Route path="/dispatch" element={<Dispatch />} />
            <Route path="/assistant" element={<AiAssistant />} />
            <Route path="/recordings" element={<Recordings />} />
            <Route path="/vetboard" element={<VetboardReviews />} />
            <Route
              path="/users"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Users />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
