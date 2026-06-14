import { useEffect, useState } from 'react';
import { api } from '../api/client';

const emptyForm = { title: '', category: '', content: '', tags: '' };

export default function KnowledgeBase() {
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState(null);

  function load(q) {
    api.getArticles(q ? `q=${encodeURIComponent(q)}` : undefined).then(setArticles);
  }

  useEffect(() => load(), []);

  function handleSearch(e) {
    e.preventDefault();
    load(search);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await api.createArticle(form);
    setForm(emptyForm);
    setShowForm(false);
    load(search);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this article?')) return;
    await api.deleteArticle(id);
    setSelected(null);
    load(search);
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-1">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-gray-800">Knowledge Base</h1>
        </div>
        <form onSubmit={handleSearch} className="mb-3 flex gap-2">
          <input
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="bg-emerald-700 text-white px-3 py-2 rounded-md text-sm font-medium">Search</button>
        </form>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="w-full mb-3 border border-emerald-700 text-emerald-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-emerald-50"
        >
          {showForm ? 'Cancel' : '+ New Article'}
        </button>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-3 mb-3 space-y-2">
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Title"
              value={form.title}
              required
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Category (e.g. Cattle, Poultry)"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Content"
              rows={4}
              required
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Tags (comma separated)"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
            <button className="bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium w-full">Save Article</button>
          </form>
        )}

        <ul className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {articles.map((a) => (
            <li
              key={a.id}
              onClick={() => setSelected(a)}
              className={`px-3 py-2.5 cursor-pointer hover:bg-gray-50 text-sm ${selected?.id === a.id ? 'bg-emerald-50' : ''}`}
            >
              <p className="font-medium text-gray-800">{a.title}</p>
              <p className="text-gray-500 text-xs">{a.category || 'Uncategorized'}</p>
            </li>
          ))}
          {articles.length === 0 && <li className="px-3 py-6 text-center text-gray-400 text-sm">No articles found</li>}
        </ul>
      </div>

      <div className="col-span-2">
        {selected ? (
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{selected.title}</h2>
                <p className="text-sm text-gray-500">{selected.category || 'Uncategorized'}</p>
              </div>
              <button onClick={() => handleDelete(selected.id)} className="text-red-600 text-sm hover:underline">
                Delete
              </button>
            </div>
            <p className="text-gray-800 whitespace-pre-wrap mb-3">{selected.content}</p>
            {selected.tags && (
              <div className="flex gap-2 flex-wrap">
                {selected.tags.split(',').map((tag) => (
                  <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">{tag.trim()}</span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-400">
            Select an article to view its content
          </div>
        )}
      </div>
    </div>
  );
}
