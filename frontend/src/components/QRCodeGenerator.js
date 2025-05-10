import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import DatePicker from 'react-datepicker';
import DOMPurify from 'dompurify'; // Import DOMPurify
import 'react-datepicker/dist/react-datepicker.css';
import '../QRCodeGenerator.css';

function QRCodeGenerator() {
  const [groupId, setGroupId] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const navigate = useNavigate();

  // Handle group name input and sanitize the value
  const handleGroupNameChange = (e) => {
    const sanitizedGroupName = DOMPurify.sanitize(e.target.value); // Sanitize the group name input
    setGroupName(sanitizedGroupName);
  };

  async function generateQRCode() {
    const newGroupId = uuidv4();
    const createdAt = new Date().toISOString(); // Generate the current timestamp
    setShowAlert(false); // Hide alert if the QR code is generated

    setGroupId(newGroupId); // Update group ID state

    const data = { groupId: newGroupId, groupName, createdAt, selectedDate }; // Include group name, createdAt, and selectedDate in data

    try {
      const response = await fetch('https://sync-meet.kushankrockz.workers.dev/api/store-group-id', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data), // Send group ID, group name, createdAt, and selectedDate
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log('QR Code generated:', result);
    } catch (error) {
      console.error('Failed to fetch:', error);
    }
  }

  const handleScan = () => {
    if (!groupId) {
      // Show alert banner if QR code is not generated
      setShowAlert(true);
    } else {
      // Navigate to the GoogleCalendar component without passing group ID in the URL
      navigate(`/calendar`);
    }
  };

  return (
    <div>
      <h2>Create Group QR Code
      </h2>

      {/* Group Name Input with sanitization */}
      <div>
        <input
          type="text"
          placeholder="Enter Group Name"
          value={groupName}
          onChange={handleGroupNameChange} // Use sanitized change handler
          style={{ marginBottom: '10px' }}
        />
      </div>

      {/* Step 2: Date Picker */}
      <div>
        <h3>Select a Date:</h3>
        <DatePicker
          selected={selectedDate} // Set selected date
          onChange={(date) => setSelectedDate(date)} // Update selected date on change
          dateFormat="yyyy-MM-dd" // Set date format
          minDate={new Date()} // Prevent past dates
          placeholderText="Choose a date"
          style={{ marginBottom: '10px' }}
        />
      </div>

      {/* Step 3: Generate QR Code Button */}
      <button 
        onClick={generateQRCode} 
        disabled={!groupName || !selectedDate} // Disable if group name or date is not selected
        style={{ marginBottom: '10px' }}
      >
        Generate QR Code
      </button>

      {/* Show QR code after it's generated */}
      {groupId && (
        <div>
          <h3>Scan the QR Code:</h3>
          <QRCodeCanvas value={`${window.location.origin}/google-calendar?groupId=${groupId}`} size={256} />
        </div>
      )}

      {showAlert && (
        <div className="alert-banner">
          <p>Please generate the QR code first!</p>
        </div>
      )}

      <button onClick={handleScan} style={{ marginTop: '20px' }}>
        Use the above QR 
      </button>
    </div>
  );
}

export default QRCodeGenerator;
