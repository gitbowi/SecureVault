import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL ?? '';

function getEmail() {
  try {
    const token   = localStorage.getItem('sv_token');
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.email;
  } catch {
    return null;
  }
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('sv_token')}` };
}

function formatSize(bytes) {
  if (bytes < 1024)             return `${bytes} B`;
  if (bytes < 1024 * 1024)     return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Dashboard() {
  const navigate    = useNavigate();
  const email       = getEmail();
  const fileInput   = useRef(null);
  const [files,     setFiles]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => { fetchFiles(); }, []);

  async function fetchFiles() {
    try {
      const res = await fetch(`${API}/api/files`, { headers: authHeaders() });
      if (!res.ok) { logout(); return; }
      const data = await res.json();
      setFiles(data.files);
    } catch {
      setError('Could not load files.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res  = await fetch(`${API}/api/files/upload`, {
        method:  'POST',
        headers: authHeaders(),
        body:    form,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Upload failed.'); return; }
      setFiles(prev => [data.file, ...prev]);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setUploading(false);
      fileInput.current.value = '';
    }
  }

  async function handleDownload(file) {
    try {
      const res = await fetch(`${API}/api/files/${file.id}/download`, { headers: authHeaders() });
      if (!res.ok) { setError('Download failed.'); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = file.original_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Could not reach the server.');
    }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`${API}/api/files/${id}`, {
        method:  'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) { setError('Delete failed.'); return; }
      setFiles(prev => prev.filter(f => f.id !== id));
    } catch {
      setError('Could not reach the server.');
    }
  }

  function logout() {
    localStorage.removeItem('sv_token');
    navigate('/login');
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <div>
            <h1>SecureVault</h1>
            <p className="dashboard-greeting">Welcome, {email}</p>
          </div>
          <button onClick={logout} className="btn-secondary">Sign out</button>
        </div>

        <div className="upload-area">
          <input
            ref={fileInput}
            id="file-input"
            type="file"
            className="file-input-hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <label htmlFor="file-input" className={`btn-upload${uploading ? ' disabled' : ''}`}>
            {uploading ? 'Uploading…' : 'Upload file'}
          </label>
          {error && <p className="error-msg" style={{ marginTop: '0.75rem' }}>{error}</p>}
        </div>

        {loading ? (
          <p className="file-list-empty">Loading…</p>
        ) : files.length === 0 ? (
          <p className="file-list-empty">No files yet. Upload one above.</p>
        ) : (
          <ul className="file-list">
            {files.map(file => (
              <li key={file.id} className="file-item">
                <span className="file-name">{file.original_name}</span>
                <span className="file-size">{formatSize(file.size)}</span>
                <div className="file-actions">
                  <button onClick={() => handleDownload(file)} className="btn-secondary">Download</button>
                  <button onClick={() => handleDelete(file.id)}  className="btn-danger">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
