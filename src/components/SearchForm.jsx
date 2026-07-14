import React, { useState, useEffect } from 'react';

export default function SearchForm({ onSearch, loading }) {
  const [accountId, setAccountId] = useState('57609520');
  const [botId, setBotId] = useState('c72f03b7-cbb7-47ec-af31-cb7e16d7af56');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [envInfo, setEnvInfo] = useState(null);
  const [resolvingEnv, setResolvingEnv] = useState(false);

  // Auto-resolve environment when Account ID changes
  useEffect(() => {
    if (!accountId || accountId.length < 5) {
      setEnvInfo(null);
      return;
    }

    const timer = setTimeout(async () => {
      setResolvingEnv(true);
      try {
        const response = await fetch(`/api/env-lookup?accountId=${accountId}`);
        if (response.ok) {
          const data = await response.json();
          setEnvInfo(data);
        } else {
          setEnvInfo(null);
        }
      } catch (err) {
        console.error('Failed to auto-resolve LP environment:', err);
        setEnvInfo(null);
      } finally {
        setResolvingEnv(false);
      }
    }, 600); // Debounce typing

    return () => clearTimeout(timer);
  }, [accountId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!accountId || !botId) return;
    onSearch({ accountId, botId, dateFrom, dateTo });
  };

  const getEnvClass = (env) => {
    if (!env) return '';
    const name = env.toLowerCase();
    if (name.includes('qa')) return 'qa';
    if (name.includes('us')) return 'prod-us';
    if (name.includes('eu')) return 'prod-eu';
    return '';
  };

  return (
    <form className="glass-card search-form-card" onSubmit={handleSubmit}>
      <h3 className="search-title">Audit Query</h3>

      {/* Account ID */}
      <div className="form-group">
        <label className="form-label">LivePerson Account ID</label>
        <input 
          type="text" 
          className="form-input" 
          placeholder="e.g. 57609520"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          required 
        />
      </div>

      {/* Bot ID */}
      <div className="form-group">
        <label className="form-label">Bot ID (parentObjectId)</label>
        <input 
          type="text" 
          className="form-input" 
          placeholder="e.g. c72f03b7-cbb7-..."
          value={botId}
          onChange={(e) => setBotId(e.target.value)}
          required 
        />
      </div>

      {/* Environment Resolution Display */}
      {(resolvingEnv || envInfo) && (
        <div className="env-badge-container">
          <div className="env-badge-header">Resolved Target Environment</div>
          {resolvingEnv ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div>
              <span>Querying LP CSDS Registry...</span>
            </div>
          ) : (
            <>
              <div className={`env-badge ${getEnvClass(envInfo.env)}`}>
                ⚡ {envInfo.env}
              </div>
              <div className="env-details">
                <div><strong>ES Space:</strong> {envInfo.space}</div>
                <div><strong>Data View:</strong> {envInfo.dataView}</div>
                <div><strong>Node:</strong> {envInfo.server}</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Time filters */}
      <div className="form-group">
        <label className="form-label">From Date (Optional)</label>
        <input 
          type="date" 
          className="form-input" 
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">To Date (Optional)</label>
        <input 
          type="date" 
          className="form-input" 
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
      </div>

      <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }} disabled={loading}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <div className="spinner" style={{ width: '1rem', height: '1rem', borderTopColor: '#070913' }}></div>
            <span>Fetching Logs...</span>
          </div>
        ) : (
          'Search Logs'
        )}
      </button>
    </form>
  );
}
