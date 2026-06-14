import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function Dashboard() {
  const [tickets, setTickets] = useState([]);
  const [paravets, setParavets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getTickets(), api.getParavets()])
      .then(([t, p]) => {
        setTickets(t);
        setParavets(p);
      })
      .finally(() => setLoading(false));
  }, []);

  const open = tickets.filter((t) => t.status === 'open').length;
  const assigned = tickets.filter((t) => t.status === 'assigned').length;
  const resolved = tickets.filter((t) => t.status === 'resolved').length;
  const available = paravets.filter((p) => p.status === 'available').length;

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Open Cases" value={open} color="bg-amber-100 text-amber-800" />
        <StatCard label="Assigned" value={assigned} color="bg-blue-100 text-blue-800" />
        <StatCard label="Resolved" value={resolved} color="bg-green-100 text-green-800" />
        <StatCard label="Available Paravets" value={available} color="bg-emerald-100 text-emerald-800" />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Recent Cases</h2>
          <Link to="/tickets" className="text-sm text-emerald-700 hover:underline">View all</Link>
        </div>
        <ul className="divide-y divide-gray-100">
          {tickets.slice(0, 5).map((t) => (
            <li key={t.id} className="px-4 py-3 flex items-center justify-between text-sm">
              <div>
                <Link to={`/tickets/${t.id}`} className="font-medium text-gray-800 hover:text-emerald-700">
                  {t.farmer_name}
                </Link>
                <p className="text-gray-500">{t.animal_type || '—'} · {t.issue_description?.slice(0, 60) || 'No description'}</p>
              </div>
              <StatusBadge status={t.status} />
            </li>
          ))}
          {tickets.length === 0 && <li className="px-4 py-6 text-center text-gray-400 text-sm">No cases yet</li>}
        </ul>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-lg p-4 ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function StatusBadge({ status }) {
  const styles = {
    open: 'bg-amber-100 text-amber-800',
    assigned: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
    in_progress: 'bg-purple-100 text-purple-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}
