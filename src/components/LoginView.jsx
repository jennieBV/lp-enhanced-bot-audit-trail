import React, { useState, useEffect } from 'react';

export default function LoginView({ onLoginSuccess }) {
  const [email, setEmail] = useState('zheni.vasileva@liveperson.com');
  const [name, setName] = useState('Zheni Vasileva');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if the Google SDK is loaded on the page
    const initGoogleSignIn = () => {
      if (window.google && window.google.accounts) {
        try {
          window.google.accounts.id.initialize({
            client_id: '51760566597-smb92m0f5o02j1hmdkn695g5a9oipq1q.apps.googleusercontent.com',
            callback: handleCredentialResponse,
            ux_mode: 'popup'
          });
          
          window.google.accounts.id.renderButton(
            document.getElementById('google-signin-btn'),
            { theme: 'outline', size: 'large', width: '380px' }
          );
        } catch (err) {
          console.error('Failed to initialize Google Sign-In Client:', err);
        }
      } else {
        // Retry in 300ms if SDK isn't fully loaded yet
        setTimeout(initGoogleSignIn, 300);
      }
    };

    initGoogleSignIn();
  }, []);

  const handleCredentialResponse = async (response) => {
    setLoading(true);
    setError('');

    try {
      // Send the secure Google JWT ID Token directly to the backend
      const res = await fetch('/auth/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential })
      });

      const data = await res.json();
      if (res.ok) {
        onLoginSuccess(data.user);
      } else {
        setError(data.error || 'Failed to authenticate secure Google token.');
      }
    } catch (err) {
      setError('Connection failed. Make sure Express server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeveloperBypass = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/auth/developer-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name })
      });

      const data = await response.json();
      if (response.ok) {
        onLoginSuccess(data.user);
      } else {
        setError(data.error || 'Failed to authenticate.');
      }
    } catch (err) {
      setError('Connection to backend failed. Make sure server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass-card">
        <div className="login-logo">CB</div>
        <h1 className="login-title">CB-Audit</h1>
        <p className="login-desc" style={{ marginBottom: '2rem' }}>
          LivePerson Conversation Builder Audit Trail Explorer.
          Log in with your official LivePerson corporate Google account to search and inspect logs.
        </p>

        {error && (
          <div style={{ 
            color: 'var(--color-error)', 
            background: 'rgba(248, 113, 113, 0.1)', 
            border: '1px solid rgba(248, 113, 113, 0.2)', 
            borderRadius: '0.5rem', 
            padding: '0.75rem', 
            fontSize: '0.85rem', 
            marginBottom: '1.5rem' 
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Live official Google Sign-In button container */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', minHeight: '44px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              <div className="spinner" style={{ width: '1.25rem', height: '1.25rem' }}></div>
              <span>Securing corporate session...</span>
            </div>
          ) : (
            <div id="google-signin-btn"></div>
          )}
        </div>

        <div className="divider">Or Developer Sandbox Bypass</div>

        {/* Developer Sandbox Bypass Form */}
        <form className="bypass-form" onSubmit={handleDeveloperBypass}>
          <div className="form-group">
            <label className="form-label">Gmail/LP Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Your Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required 
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            Enter Developer Sandbox
          </button>
        </form>
      </div>
    </div>
  );
}
