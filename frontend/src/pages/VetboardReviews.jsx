import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
};

const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export default function VetboardReviews() {
  const { user } = useAuth();
  const isVSB = user?.role === 'vetboard';
  const canFlagForReview = ['admin', 'supervisor', 'super_admin'].includes(user?.role);

  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState('');
  const [activeReview, setActiveReview] = useState(null);
  const [findings, setFindings] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.getVetboardReviews(filter || undefined).then(setReviews);
  }

  useEffect(load, [filter]);

  async function handleComplete(review) {
    setSaving(true);
    setError('');
    try {
      await api.updateVetboardReview(review.id, {
        findings,
        recommendation,
        status: 'completed',
      });
      setActiveReview(null);
      setFindings('');
      setRecommendation('');
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkInProgress(review) {
    await api.updateVetboardReview(review.id, { status: 'in_progress' });
    load();
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-gray-800 mb-1">Vet Science Board Reviews</h1>
      <p className="text-sm text-gray-500 mb-4">
        {isVSB
          ? 'Every resolved case is queued here for your review. Complete each one with findings and a recommendation to build our learning dataset.'
          : 'Every resolved case is automatically queued for Vet Science Board review.'}
      </p>

      <div className="flex gap-2 mb-4">
        {['', 'pending', 'in_progress', 'completed'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
              filter === s ? 'bg-brand-red text-white border-brand-red' : 'bg-white border-gray-200 text-gray-600'
            }`}
          >
            {s === '' ? 'All' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {reviews.length === 0 && (
          <p className="text-gray-400 text-center py-10">No reviews found</p>
        )}

        {reviews.map((r) => (
          <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-gray-800">{r.farmer_name}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Case #{r.ticket_id}
                  {r.animal_type && ` · ${r.animal_type}`}
                  {r.location && ` · ${r.location}`}
                  {r.priority && ` · ${r.priority} priority`}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Flagged by {r.created_by_name} on {new Date(r.created_at).toLocaleDateString()}
                  {r.assigned_to_name && ` · Assigned to ${r.assigned_to_name}`}
                  {r.completed_at && ` · Completed ${new Date(r.completed_at).toLocaleDateString()}`}
                </p>
              </div>
              <Link to={`/tickets/${r.ticket_id}`} className="text-sm text-brand-navy hover:underline shrink-0 ml-3">
                View Case
              </Link>
            </div>

            {r.issue_description && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-md p-2 mb-2">{r.issue_description}</p>
            )}

            {r.status === 'completed' && (r.findings || r.recommendation) && (
              <div className="border border-green-200 bg-green-50 rounded-md p-3 text-sm space-y-1">
                {r.findings && (
                  <p><span className="font-medium text-green-800">Findings:</span> <span className="text-green-900">{r.findings}</span></p>
                )}
                {r.recommendation && (
                  <p><span className="font-medium text-green-800">Recommendation:</span> <span className="text-green-900">{r.recommendation}</span></p>
                )}
              </div>
            )}

            {isVSB && r.status !== 'completed' && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                {activeReview?.id !== r.id ? (
                  <div className="flex gap-2">
                    {r.status === 'pending' && (
                      <button
                        onClick={() => handleMarkInProgress(r)}
                        className="text-sm px-3 py-1.5 border border-blue-200 text-blue-700 rounded-md hover:bg-blue-50"
                      >
                        Begin Review
                      </button>
                    )}
                    <button
                      onClick={() => { setActiveReview(r); setFindings(r.findings || ''); setRecommendation(r.recommendation || ''); setError(''); }}
                      className="text-sm px-3 py-1.5 bg-brand-red text-white rounded-md hover:bg-brand-red-dark"
                    >
                      Complete Review
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Findings</label>
                      <textarea
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        rows={3}
                        placeholder="Document clinical findings, compliance observations, any issues noted..."
                        value={findings}
                        onChange={(e) => setFindings(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Recommendation</label>
                      <textarea
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        rows={2}
                        placeholder="Approved / Requires follow-up / Escalate / Further training needed..."
                        value={recommendation}
                        onChange={(e) => setRecommendation(e.target.value)}
                      />
                    </div>
                    {error && <p className="text-red-600 text-sm">{error}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleComplete(r)}
                        disabled={saving || !findings.trim()}
                        className="px-4 py-2 bg-brand-red text-white rounded-md text-sm font-medium hover:bg-brand-red-dark disabled:opacity-50"
                      >
                        {saving ? 'Saving…' : 'Confirm & Complete'}
                      </button>
                      <button
                        onClick={() => setActiveReview(null)}
                        className="px-4 py-2 border border-gray-200 text-gray-600 rounded-md text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
