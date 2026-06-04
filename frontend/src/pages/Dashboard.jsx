import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/client';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelative(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return formatDate(iso);
}

function getFileIcon(mime) {
  if (!mime) return '📁';
  if (mime.startsWith('image/'))           return '🖼️';
  if (mime === 'application/pdf')          return '📄';
  if (mime.startsWith('text/'))            return '📝';
  if (mime.includes('zip') || mime.includes('archive')) return '🗜️';
  if (mime.includes('word') || mime.includes('document')) return '📃';
  if (mime.includes('excel') || mime.includes('sheet'))   return '📊';
  return '📁';
}

const ACTION_ICONS = {
  login:          '🔑',
  register:       '👤',
  upload:         '⬆️',
  download:       '⬇️',
  delete:         '🗑️',
  share_on:       '🔗',
  share_off:      '🔒',
  public_download:'⬇️',
};

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return <div className={`toast ${type}`}>{message}</div>;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [files,          setFiles]          = useState([]);
  const [stats,          setStats]          = useState({ fileCount: 0, totalSize: 0 });
  const [logs,           setLogs]           = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [uploading,      setUploading]      = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver,       setDragOver]       = useState(false);
  const [deleteTarget,   setDeleteTarget]   = useState(null); // file to confirm delete
  const [shareTarget,    setShareTarget]    = useState(null); // file for share modal
  const [toast,          setToast]          = useState(null);
  const fileInputRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  // Fetch files, stats, and recent activity in parallel
  const fetchAll = useCallback(async () => {
    try {
      const [fRes, sRes, aRes] = await Promise.all([
        api.get('/api/files'),
        api.get('/api/files/stats'),
        api.get('/api/activity?limit=15'),
      ]);
      setFiles(fRes.data.files);
      setStats(sRes.data);
      setLogs(aRes.data.logs);
    } catch {
      showToast('Failed to load data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Upload ────────────────────────────────────────────────────────────────

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) =>
          setUploadProgress(Math.round((e.loaded / e.total) * 100)),
      });
      showToast('File uploaded!');
      fetchAll();
    } catch (err) {
      showToast(err.response?.data?.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  // ── Download ──────────────────────────────────────────────────────────────

  const handleDownload = async (file) => {
    try {
      const res = await api.get(`/api/files/${file.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = file.original_name;
      a.click();
      URL.revokeObjectURL(url);
      // Refresh activity log only (no full reload needed)
      api.get('/api/activity?limit=15').then((r) => setLogs(r.data.logs));
    } catch {
      showToast('Download failed.', 'error');
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/files/${deleteTarget.id}`);
      setDeleteTarget(null);
      showToast('File deleted.');
      fetchAll();
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed.', 'error');
    }
  };

  // ── Share toggle ──────────────────────────────────────────────────────────

  const handleToggleShare = async (file) => {
    try {
      const res = await api.patch(`/api/files/${file.id}/share`);
      const updated = res.data.file;

      // Update the file in the list without a full reload
      setFiles((prev) => prev.map((f) => (f.id === file.id ? updated : f)));

      // If this file is the one shown in the share modal, update or close it
      if (shareTarget?.id === file.id) {
        setShareTarget(updated.is_public ? updated : null);
      }

      showToast(res.data.message);
      api.get('/api/activity?limit=15').then((r) => setLogs(r.data.logs));
    } catch {
      showToast('Failed to update sharing.', 'error');
    }
  };

  const copyShareLink = (token) => {
    const url = `${window.location.origin}/api/files/public/${token}`;
    navigator.clipboard.writeText(url).then(() => showToast('Link copied!'));
  };

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="loading-screen">Loading your vault…</div>;
  }

  const publicCount = files.filter((f) => f.is_public).length;

  return (
    <div className="page">
      <div className="container">

        {/* Stats */}
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-label">Total Files</div>
            <div className="stat-value">{stats.fileCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Storage Used</div>
            <div className="stat-value">{formatBytes(stats.totalSize)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Public Files</div>
            <div className="stat-value">{publicCount}</div>
          </div>
        </div>

        {/* Upload zone */}
        <div
          className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        >
          <div className="upload-zone-icon">{uploading ? '⏳' : '📤'}</div>
          <div className="upload-zone-text">
            {uploading
              ? `Uploading… ${uploadProgress}%`
              : 'Drop a file here, or click to upload'}
          </div>
          <div className="upload-zone-hint">Max 50 MB · Images, PDFs, docs, text, archives</div>
          {uploading && (
            <div className="progress-wrap">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="upload-input"
            onChange={(e) => handleUpload(e.target.files[0])}
          />
        </div>

        {/* Files section */}
        <div className="section-header">
          <h2 className="section-title">Your Files</h2>
          <span style={{ fontSize: '.8125rem', color: 'var(--text-muted)' }}>
            {files.length} {files.length === 1 ? 'file' : 'files'}
          </span>
        </div>

        {files.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🗄️</div>
            <div className="empty-title">No files yet</div>
            <div className="empty-sub">Upload your first file above to get started</div>
          </div>
        ) : (
          <div className="file-list">
            <div className="file-header">
              <span>Name</span>
              <span>Size</span>
              <span>Uploaded</span>
              <span style={{ textAlign: 'right' }}>Actions</span>
            </div>
            {files.map((file) => (
              <div className="file-row" key={file.id}>
                {/* Name + badge */}
                <div>
                  <div className="file-name-cell">
                    <span className="file-icon">{getFileIcon(file.mime_type)}</span>
                    <span className="file-name-text" title={file.original_name}>
                      {file.original_name}
                    </span>
                  </div>
                  <div className="file-badge-row">
                    {file.is_public
                      ? <span className="badge badge-public">Public</span>
                      : <span className="badge badge-private">Private</span>}
                  </div>
                </div>

                <div className="file-size">{formatBytes(file.size)}</div>
                <div className="file-date">{formatDate(file.created_at)}</div>

                {/* Actions */}
                <div className="file-actions">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleDownload(file)}
                    title="Download"
                  >⬇</button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setShareTarget(file)}
                    title={file.is_public ? 'View share link' : 'Share'}
                    style={file.is_public ? { color: 'var(--success)', borderColor: 'var(--success)' } : {}}
                  >🔗</button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => setDeleteTarget(file)}
                    title="Delete"
                  >🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Activity log */}
        <div className="activity-section">
          <div className="section-header">
            <h2 className="section-title">Recent Activity</h2>
          </div>
          {logs.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <div className="empty-sub">No activity yet</div>
            </div>
          ) : (
            <div className="activity-list">
              {logs.map((log) => (
                <div className="activity-item" key={log.id}>
                  <span className="activity-icon">{ACTION_ICONS[log.action] || '📋'}</span>
                  <div>
                    <div className="activity-text">{log.details || log.action}</div>
                    <div className="activity-time">{formatRelative(log.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Delete confirm modal ── */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Delete file?</h3>
            <p className="modal-body">
              <strong>{deleteTarget.original_name}</strong> will be permanently deleted.
              This cannot be undone.
            </p>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Share modal ── */}
      {shareTarget && (
        <div className="modal-overlay" onClick={() => setShareTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              {shareTarget.is_public ? '🔗 Share link' : '🔒 Private file'}
            </h3>
            <p className="modal-body" style={{ marginBottom: '.5rem' }}>
              <strong>{shareTarget.original_name}</strong>
            </p>

            {shareTarget.is_public ? (
              <>
                <p className="modal-body">Anyone with this link can download the file.</p>
                <div className="share-box">
                  {`${window.location.origin}/api/files/public/${shareTarget.share_token}`}
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-outline"
                    style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    onClick={() => handleToggleShare(shareTarget)}
                  >
                    Make private
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => copyShareLink(shareTarget.share_token)}
                  >
                    Copy link
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="modal-body">
                  This file is private. Make it public to generate a shareable link.
                </p>
                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={() => setShareTarget(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={() => handleToggleShare(shareTarget)}>
                    Make public
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
