import React, { useState, useEffect } from 'react';
import './App.css';
import Timeline from './components/Timeline.jsx';
import lpLogo from './lp-logo.png';

// --- Custom Resilient Client-Side Log Parser Engine ---
function parseAuditLog(logText) {
  if (!logText || !logText.includes('[AuditTrail]') || !logText.includes('AuditEvent(')) {
    return null;
  }
  
  try {
    // Extract userId
    const userIdMatch = logText.match(/userId=([^, ]+)/);
    // Extract userName
    const userNameMatch = logText.match(/userName=([^,]+), timestamp=/);
    // Extract timestamp
    const timestampMatch = logText.match(/timestamp=(\d+)/);
    // Extract accountId
    const accountIdMatch = logText.match(/accountId=([^, ]+)/);
    
    // Extract auditEntity fields
    const parentObjectIdMatch = logText.match(/parentObjectId=([^, ]+)/);
    const parentObjectNameMatch = logText.match(/parentObjectName=([^,]+), parentObjectType=/);
    const objectNameMatch = logText.match(/objectName=([^,]+), objectId=/);
    const objectIdMatch = logText.match(/objectId=([^,]+), activity=/);
    const activityMatch = logText.match(/activity=([^, ]+)/);
    
    // Extract modifications
    const modifications = [];
    const modRegex = /Modification\(([^)]+)\)/g;
    let modMatch;
    const modsSectionMatch = logText.match(/modificationsList=\[(.*)\]\)\)/);
    if (modsSectionMatch) {
      const modsStr = modsSectionMatch[1];
      while ((modMatch = modRegex.exec(modsStr)) !== null) {
        const modContent = modMatch[1];
        
        const element = (modContent.match(/element=([^,]+)/) || [])[1] || '';
        
        let oldValue = '';
        let newValue = '';
        
        const oldValMatch = modContent.match(/oldValue=(?:"([^"\\]*(?:\\.[^"\\]*)*)"|([^,)]+))/);
        if (oldValMatch) {
          oldValue = oldValMatch[1] !== undefined ? oldValMatch[1] : oldValMatch[2];
        }
        
        const newValMatch = modContent.match(/newValue=(?:"([^"\\]*(?:\\.[^"\\]*)*)"|([^,)]+))/);
        if (newValMatch) {
          newValue = newValMatch[1] !== undefined ? newValMatch[1] : newValMatch[2];
        }
        
        modifications.push({ element, oldValue, newValue });
      }
    }
    
    return {
      userId: userIdMatch ? userIdMatch[1] : '',
      userName: userNameMatch ? userNameMatch[1] : '',
      timestamp: timestampMatch ? parseInt(timestampMatch[1]) : Date.now(),
      accountId: accountIdMatch ? accountIdMatch[1] : '',
      parentObjectId: parentObjectIdMatch ? parentObjectIdMatch[1] : '',
      parentObjectName: parentObjectNameMatch ? parentObjectNameMatch[1] : '',
      objectName: objectNameMatch ? objectNameMatch[1] : '',
      objectId: objectIdMatch ? objectIdMatch[1] : '',
      activity: activityMatch ? activityMatch[1] : '',
      modifications
    };
  } catch (e) {
    console.error("Failed parsing audit log line", e);
    return null;
  }
}

// Custom CSV Parser that correctly handles commas inside quoted fields
function parseCSV(text) {
  const rows = [];
  let row = [""];
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i+1];
    
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      rows.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  
  if (row.length > 1 || row[0] !== '') {
    rows.push(row);
  }
  
  return rows;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'paste'
  const [events, setEvents] = useState([]);
  
  // Theme state system (LivePerson Orange/Purple Dark & Light Mode)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };
  
  // File upload state
  const [fileDetails, setFileDetails] = useState(null);
  const [botName, setBotName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [parsingError, setParsingError] = useState('');

  // Pasting raw state
  const [rawLogText, setRawLogText] = useState('');
  const [pastedEvents, setPastedEvents] = useState([]);

  // Client-side dynamic filtering states
  const [filterUsername, setFilterUsername] = useState('');
  const [filterActivity, setFilterActivity] = useState('');
  const [filterObjectType, setFilterObjectType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique filter lists from parsed events
  const uniqueUsers = [...new Set(events.map(e => e.userName).filter(Boolean))];
  const uniqueActivities = [...new Set(events.map(e => e.activity).filter(Boolean))];
  const uniqueObjectTypes = [...new Set(events.map(e => e.objectName).filter(Boolean))];

  // Core file parsing handler
  const processLogContent = (text, name, size) => {
    setParsingError('');
    try {
      let parsedList = [];
      
      // Determine file format and scan for [AuditTrail] signature
      if (name.endsWith('.csv')) {
        const rows = parseCSV(text);
        rows.forEach(row => {
          row.forEach(cell => {
            if (cell && cell.includes('[AuditTrail]')) {
              const event = parseAuditLog(cell);
              if (event) parsedList.push(event);
            }
          });
        });
      } else {
        // Standard TXT split by line
        const lines = text.split(/\r?\n/);
        lines.forEach(line => {
          if (line.includes('[AuditTrail]')) {
            const event = parseAuditLog(line);
            if (event) parsedList.push(event);
          }
        });
      }

      if (parsedList.length === 0) {
        setParsingError('No valid audit logs detected. Make sure the file contains "AuditEvent" log strings.');
        return;
      }

      // Sort timeline descending by timestamp
      parsedList.sort((a, b) => b.timestamp - a.timestamp);
      
      // Extract bot name (parentObjectName of the first log line that has it)
      const firstWithBotName = parsedList.find(e => e.parentObjectName);
      if (firstWithBotName) {
        setBotName(firstWithBotName.parentObjectName);
      } else {
        setBotName('Unknown Bot');
      }
      
      setEvents(parsedList);
      setFileDetails({
        name,
        size: (size / 1024).toFixed(1) + ' KB',
        count: parsedList.length
      });
      setActiveTab('upload');
    } catch (err) {
      console.error(err);
      setParsingError('Failed parsing sheet content. Verify file format.');
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      readAndProcessFile(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      readAndProcessFile(file);
    }
  };

  const readAndProcessFile = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      processLogContent(event.target.result, file.name, file.size);
    };
    reader.readAsText(file);
  };

  // Handlers for raw pasted logs
  const handleParseRawText = () => {
    if (!rawLogText.trim()) return;
    const lines = rawLogText.split(/\r?\n/);
    const parsedList = lines
      .map(line => parseAuditLog(line))
      .filter(Boolean)
      .sort((a, b) => b.timestamp - a.timestamp);

    if (parsedList.length === 0) {
      setParsingError('Unrecognized format. Paste standard AuditEvent log lines.');
      return;
    }

    const firstWithBotName = parsedList.find(e => e.parentObjectName);
    if (firstWithBotName) {
      setBotName(firstWithBotName.parentObjectName);
    } else {
      setBotName('Unknown Bot');
    }

    setPastedEvents(parsedList);
  };

  const handleClear = () => {
    setEvents([]);
    setBotName('');
    setFileDetails(null);
    setPastedEvents([]);
    setRawLogText('');
    setParsingError('');
  };

  // Dynamic filter cascade logic (no Bot ID field since single bot is assumed)
  const filteredEvents = events.filter(event => {
    const matchesUser = filterUsername ? event.userName === filterUsername : true;
    const matchesActivity = filterActivity ? event.activity === filterActivity : true;
    const matchesObjType = filterObjectType ? event.objectName === filterObjectType : true;
    
    const matchesSearch = searchQuery ? (
      event.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.parentObjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.objectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.objectId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(event.modifications).toLowerCase().includes(searchQuery.toLowerCase())
    ) : true;

    return matchesUser && matchesActivity && matchesObjType && matchesSearch;
  });

  const exportToJson = (eventsList) => {
    if (!eventsList || eventsList.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(eventsList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "parsed_bot_audit_trail.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="app-container">
      {/* Background Aurora Blur Blobs */}
      <div className="aurora-bg">
        <div className="aurora-blob blob-orange"></div>
        <div className="aurora-blob blob-purple"></div>
        <div className="aurora-blob blob-cyan"></div>
      </div>

      {/* App Header */}
      <header className="app-header">
        <div className="brand">
          <img src={lpLogo} alt="LivePerson" className="brand-logo-img" />
          <div>
            <h1 className="brand-title">LivePerson Enhanced Bot Audit Trail</h1>
            <div className="brand-subtitle" style={{ textTransform: 'none', letterSpacing: 'normal', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Get detailed information about updates made to your bot such as author, interactions changed, before and after comparison.
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Theme Toggle Button */}
          <button className="theme-toggle-btn" onClick={toggleTheme} title="Switch Theme">
            {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="dashboard-grid">
        
        {/* Left Control Column */}
        <aside>
          {fileDetails ? (
            /* Active File Metadata & Slicing Filters */
            <>
              {/* Back to Start Navigation */}
              <button 
                className="theme-toggle-btn" 
                style={{ width: '100%', marginBottom: '1.25rem', borderColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} 
                onClick={handleClear}
              >
                <span>←</span> Upload New File
              </button>

              <div className="glass-card search-form-card">
                <h3 className="search-title">File Details</h3>
                <div className="env-details" style={{ marginBottom: '0', background: 'var(--bg-card-hover)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                  {botName && <div style={{ marginBottom: '0.25rem' }}><strong>Bot Name:</strong> <span style={{ color: 'var(--color-primary)', fontWeight: '700' }}>{botName}</span></div>}
                  <div><strong>File:</strong> {fileDetails.name}</div>
                  <div><strong>Size:</strong> {fileDetails.size}</div>
                  <div><strong>Total Logs:</strong> {fileDetails.count}</div>
                </div>

                <h3 className="search-title" style={{ paddingTop: '0.5rem' }}>
                  Filter Timeline
                </h3>

                {/* Text Search */}
                <div className="form-group">
                  <label className="form-label">Search Keywords</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Username, field, etc..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* User Dropdown */}
                {uniqueUsers.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Filter by User</label>
                    <select className="form-input" value={filterUsername} onChange={(e) => setFilterUsername(e.target.value)}>
                      <option value="">All Users</option>
                      {uniqueUsers.map(user => <option key={user} value={user}>{user}</option>)}
                    </select>
                  </div>
                )}

                {/* Activity Dropdown */}
                {uniqueActivities.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Filter by Activity</label>
                    <select className="form-input" value={filterActivity} onChange={(e) => setFilterActivity(e.target.value)}>
                      <option value="">All Activities</option>
                      {uniqueActivities.map(act => <option key={act} value={act}>{act}</option>)}
                    </select>
                  </div>
                )}

                {/* Object Name Dropdown */}
                {uniqueObjectTypes.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Filter by Object Name</label>
                    <select className="form-input" value={filterObjectType} onChange={(e) => setFilterObjectType(e.target.value)}>
                      <option value="">All Objects</option>
                      {uniqueObjectTypes.map(obj => <option key={obj} value={obj}>{obj}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Structured Tool Instructions Card */
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 className="search-title" style={{ paddingBottom: '0.5rem' }}>About the Tool</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>1. Export Bot History</strong>
                  Export your bot's change logs as a CSV or TXT file.
                </div>
                
                <div>
                  <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>2. Drag & Drop Upload</strong>
                  Drop your raw file into the upload area on the right. The engine instantly scans columns to extract modifications.
                </div>
                
                <div>
                  <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>3. Secure local execution</strong>
                  No credentials or logins needed. All log parsing and rendering occur 100% locally within your web browser.
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Right Dashboard Timeline */}
        <main>
          {/* Landing / State Router tabs */}
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              Upload Logs
            </button>
            <button 
              className={`tab ${activeTab === 'paste' ? 'active' : ''}`}
              onClick={() => setActiveTab('paste')}
            >
              Paste Raw Log
            </button>
          </div>

          {/* TAB 1: CSV / TXT SHEET UPLOADER VIEW */}
          {activeTab === 'upload' && (
            <div>
              {/* Dropzone Rendered only if no file loaded */}
              {!fileDetails && (
                <div 
                  className={`dropzone-card glass-card ${isDragging ? 'dragging' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '5rem 2rem',
                    textAlign: 'center',
                    border: isDragging ? '2px dashed var(--color-primary)' : '1px dashed var(--border-light)',
                    borderRadius: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    background: isDragging ? 'rgba(255, 90, 0, 0.05)' : 'var(--bg-card)',
                    marginBottom: '2rem'
                  }}
                >
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    Drag and Drop Log Sheet Here
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '400px', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                    Supports CSV or TXT format.
                    The engine automatically scans rows and columns to find audit trail logs.
                  </p>
                  
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <label className="btn-primary" style={{ padding: '0.6rem 2rem', cursor: 'pointer', display: 'inline-block' }}>
                      Browse Files
                      <input type="file" accept=".csv,.txt" onChange={handleFileSelect} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
              )}

              {parsingError && (
                <div style={{ 
                  color: 'var(--color-error)', 
                  background: 'rgba(248, 113, 113, 0.08)', 
                  border: '1px solid rgba(248, 113, 113, 0.15)', 
                  borderRadius: '0.75rem', 
                  padding: '1rem', 
                  fontSize: '0.9rem', 
                  marginBottom: '1.5rem' 
                }}>
                  {parsingError}
                </div>
              )}

              {/* Show parsed Timeline if file loaded */}
              {fileDetails && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      Showing {filteredEvents.length} of {events.length} parsed events
                    </div>
                    <button 
                      className="btn-primary" 
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                      onClick={() => exportToJson(filteredEvents)}
                      disabled={filteredEvents.length === 0}
                    >
                      Export Filtered (JSON)
                    </button>
                  </div>

                  <Timeline events={filteredEvents} botName={botName} />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DIRECT PASTE VIEW */}
          {activeTab === 'paste' && (
            <div className="raw-paste-container">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Paste raw AuditEvent log lines below to parse their contents immediately:
              </p>
              
              <textarea 
                className="raw-textarea" 
                placeholder="Paste raw log lines here..."
                value={rawLogText}
                onChange={(e) => setRawLogText(e.target.value)}
              />
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', marginBottom: '1.5rem' }}>
                <button 
                  className="btn-primary" 
                  onClick={handleParseRawText}
                  disabled={!rawLogText.trim()}
                >
                  Parse and Format Log
                </button>
                {pastedEvents.length > 0 && (
                  <button className="btn-logout" style={{ background: 'transparent', color: 'var(--text-secondary)' }} onClick={handleClear}>
                    Clear
                  </button>
                )}
              </div>

              {pastedEvents.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      Successfully parsed {pastedEvents.length} event(s)
                    </span>
                    <button 
                      className="btn-primary" 
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                      onClick={() => exportToJson(pastedEvents)}
                    >
                      Export (JSON)
                    </button>
                  </div>
                  <Timeline events={pastedEvents} botName={botName} />
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
