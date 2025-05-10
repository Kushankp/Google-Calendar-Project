import React from 'react';

function CommonSlot({ start, end }) {
  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return date.toLocaleString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div style={{ padding: '5px 0', borderBottom: '1px solid #ddd' }}>
      <p><strong>Start:</strong> {formatDateTime(start)}</p>
      <p><strong>End:</strong> {formatDateTime(end)}</p>
    </div>
  );
}

export default CommonSlot;
