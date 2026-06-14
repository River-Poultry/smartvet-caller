import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import TicketDetail from './pages/TicketDetail';
import KnowledgeBase from './pages/KnowledgeBase';
import Paravets from './pages/Paravets';
import Dispatch from './pages/Dispatch';
import AiAssistant from './pages/AiAssistant';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/tickets/:id" element={<TicketDetail />} />
          <Route path="/knowledge" element={<KnowledgeBase />} />
          <Route path="/paravets" element={<Paravets />} />
          <Route path="/dispatch" element={<Dispatch />} />
          <Route path="/assistant" element={<AiAssistant />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
