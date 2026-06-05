import React from 'react';
import { useNavigate } from 'react-router-dom';

function getEmail() {
  try {
    const token   = localStorage.getItem('sv_token');
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.email;
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const email    = getEmail();

  function logout() {
    localStorage.removeItem('sv_token');
    navigate('/login');
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-card">
        <h1>SecureVault</h1>
        <p className="dashboard-greeting">Welcome, {email}</p>
        <p className="dashboard-hint">File upload and management coming in Phase 3.</p>
        <button onClick={logout} className="btn-secondary">Sign out</button>
      </div>
    </main>
  );
}
