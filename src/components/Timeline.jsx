import React, { useState } from 'react';
import DiffViewer from './DiffViewer.jsx';

export default function Timeline({ events, botName }) {
  const [expandedEvents, setExpandedEvents] = useState({});

  const toggleExpand = (index) => {
    setExpandedEvents((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const formatTimestamp = (ts) => {
    return new Date(ts).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getCleanUserId = (userIdStr) => {
    if (!userIdStr) return '';
    const parts = userIdStr.split('.');
    return parts.length > 1 ? parts[1] : parts[0];
  };

  if (!events || events.length === 0) {
    return (
      <div className="empty-state">
        <h3 className="empty-state-title">No Audit Events Found</h3>
        <p className="empty-state-desc">
          Upload a log sheet to display the bot's audit trail timeline.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="timeline-header">
        <h2 className="timeline-title">
          Audit Trail {botName && <>for <span style={{ color: 'var(--color-primary)' }}>{botName}</span></>}
        </h2>
        <span className="timeline-count">{events.length} Events</span>
      </div>

      <div className="timeline">
        {events.map((event, index) => {
          const isExpanded = !!expandedEvents[index];
          const animationDelay = `${index * 0.05}s`;
          const cleanUserId = getCleanUserId(event.userId);

          return (
            <div 
              key={index} 
              className={`timeline-item ${event.activity}`}
              style={{ animationDelay }}
            >
              <div className="timeline-dot"></div>
              
              <div 
                className="glass-card event-card" 
                onClick={() => toggleExpand(index)}
              >
                <div className="event-meta">
                  <div className="event-actor-time">
                    <span className="event-actor">
                      {event.userName} 
                      {cleanUserId && (
                        <span className="event-userid-inline"> (ID: {cleanUserId})</span>
                      )}
                    </span>
                    <span className="event-time"> {formatTimestamp(event.timestamp)}</span>
                  </div>
                  
                  <span className={`event-badge-activity ${event.activity}`}>
                    {event.activity}
                  </span>
                </div>

                <div className="event-target">
                  <span className="event-target-name">
                    {event.objectName} 
                    {event.objectId && (
                      <span className="event-objectid-inline"> (ID: {event.objectId})</span>
                    )}
                  </span>
                </div>

                {isExpanded && event.modifications && event.modifications.length > 0 && (
                  <>
                    <div className="mod-list" onClick={(e) => e.stopPropagation()}>
                      {event.modifications.map((mod, mIdx) => (
                        <DiffViewer 
                          key={mIdx}
                          oldValue={mod.oldValue}
                          newValue={mod.newValue}
                        />
                      ))}
                    </div>
                    <div className="reveal-prompt close" style={{ marginTop: '0.75rem' }}>
                      <span>Click to hide modification details</span>
                      <span>▲</span>
                    </div>
                  </>
                )}
                
                {!isExpanded && event.modifications && event.modifications.length > 0 && (
                  <div className="reveal-prompt">
                    <span>Click to show {event.modifications.length} modification details</span>
                    <span>▼</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

