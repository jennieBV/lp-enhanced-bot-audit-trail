import React from 'react';

export default function DiffViewer({ oldValue, newValue }) {
  // Convert null, objects, or arrays into readable text lines
  const formatVal = (val) => {
    if (val === null || val === undefined) return 'null';
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val, null, 2);
      } catch (e) {
        return String(val);
      }
    }
    return String(val);
  };

  const oldStr = formatVal(oldValue);
  const newStr = formatVal(newValue);

  return (
    <div className="mod-item">
      <div className="diff-container">
        {/* Old Value Side (Red / Delete) */}
        <div className="diff-panel old">
          {oldStr === 'null' ? (
            <span style={{ fontStyle: 'italic', opacity: 0.5 }}>[empty / none]</span>
          ) : (
            oldStr
          )}
        </div>

        {/* New Value Side (Green / Add) */}
        <div className="diff-panel new">
          {newStr === 'null' ? (
            <span style={{ fontStyle: 'italic', opacity: 0.5 }}>[deleted / removed]</span>
          ) : (
            newStr
          )}
        </div>
      </div>
    </div>
  );
}

