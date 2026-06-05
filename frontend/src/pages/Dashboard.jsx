import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL ?? '';
// Share links need an absolute URL — empty VITE_API_URL means "use Vite proxy" in dev, not a real origin
const SHARE_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAction(action, fileName) {
  const name = fileName ? ` "${fileName}"` : '';
  const map = {
    register:       'Created account',
    login:          'Signed in',
    upload:         `Uploaded${name}`,
    download:       `Downloaded${name}`,
    delete:         `Deleted${name}`,
    share:          `Shared${name}`,
    unshare:        `Unshared${name}`,
    share_download: `${fileName ? `"${fileName}"` : 'A file'} was downloaded via share link`,
  };
  return map[action] || action;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString();
}

export default function Dashboard() {
  const navigate    = useNavigate();
  const email       = getEmail();
  const fileInput   = useRef(null);
  const [files,     setFiles]     = useState([]);
  const [logs,      setLogs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');
  const [copiedId,  setCopiedId]  = useState(null);

  useEffect(() => {
    fetchFiles();
    fetchActivity();
  }, []);

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

  async function fetchActivity() {
    try {
      const res = await fetch(`${API}/api/activity`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setLogs(data.logs);
    } catch {}
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
      fetchActivity();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setUploading(false);
      fileInput.current.value = '';
    }
  }

  async function handleDownload(file) {
    setError('');
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
      fetchActivity();
    } catch {
      setError('Could not reach the server.');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this file?')) return;
    setError('');
    try {
      const res = await fetch(`${API}/api/files/${id}`, {
        method:  'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) { setError('Delete failed.'); return; }
      setFiles(prev => prev.filter(f => f.id !== id));
      fetchActivity();
    } catch {
      setError('Could not reach the server.');
    }
  }

  async function handleShare(id) {
    setError('');
    try {
      const res  = await fetch(`${API}/api/files/${id}/share`, {
        method:  'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not generate share link.'); return; }
      setFiles(prev => prev.map(f => f.id === id ? { ...f, share_token: data.share_token } : f));
      fetchActivity();
    } catch {
      setError('Could not reach the server.');
    }
  }

  async function handleUnshare(id) {
    setError('');
    try {
      const res = await fetch(`${API}/api/files/${id}/share`, {
        method:  'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) { setError('Could not remove share link.'); return; }
      setFiles(prev => prev.map(f => f.id === id ? { ...f, share_token: null } : f));
      fetchActivity();
    } catch {
      setError('Could not reach the server.');
    }
  }

  function copyLink(fileId, token) {
    navigator.clipboard.writeText(`${SHARE_BASE}/api/share/${token}`);
    setCopiedId(fileId);
    setTimeout(() => setCopiedId(null), 2000);
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
                <div className="file-main">
                  <span className="file-name">{file.original_name}</span>
                  <span className="file-size">{formatSize(file.size)}</span>
                  <div className="file-actions">
                    <button onClick={() => handleDownload(file)} className="btn-secondary">Download</button>
                    {file.share_token
                      ? <button onClick={() => handleUnshare(file.id)} className="btn-secondary">Unshare</button>
                      : <button onClick={() => handleShare(file.id)}   className="btn-secondary">Share</button>
                    }
                    <button onClick={() => handleDelete(file.id)} className="btn-danger">Delete</button>
                  </div>
                </div>
                {file.share_token && (
                  <div className="share-row">
                    <span className="share-url">{`${SHARE_BASE}/api/share/${file.share_token}`}</span>
                    <button onClick={() => copyLink(file.id, file.share_token)} className="btn-copy">
                      {copiedId === file.id ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {logs.length > 0 && (
          <div className="activity-section">
            <h2 className="activity-title">Recent Activity</h2>
            <ul className="activity-list">
              {logs.map((entry, i) => (
                <li key={i} className="activity-item">
                  <span className="activity-action">{formatAction(entry.action, entry.file_name)}</span>
                  <span className="activity-time">{formatDate(entry.created_at)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
