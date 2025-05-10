import React, { useState, useEffect, useRef } from "react";

function InfoNote() {
  const [showNote, setShowNote] = useState(false);
  const noteRef = useRef(null);
  const iconRef = useRef(null);

  // HTML structure for instructions
  const note = `
    <p><strong>Before starting to test the application:</strong></p>
    <ul>
      <li>Please create some <b>Upcoming events</b>, not tasks, in Google Calendar.</li>
      <li>Ensure to test with <b>at least two users or by authorizing twice (by clicking on authorize button twice)</b>, as the application is designed to find common time slots between users.</li>
      <li>Ensure <b>Third-party cookies</b> are enabled in your browser settings, as server-side cookies are set for storing related information.</li>
      <li>If you're using Brave, <b>please turn off Brave Shields</b> to allow the application to function correctly.</li>
      <li>The Creator of the QR code can ask his friends to scan the QR for authorization and the<b> Creator should use the "use above QR code button"</b> to authorize and fetch his events.</li>
    </ul>`;

  // Toggle display of the note
  const toggleNote = () => setShowNote((prev) => !prev);

  // Close the tooltip if clicked outside the tooltip or icon
  const handleClickOutside = (event) => {
    if (
      noteRef.current &&
      !noteRef.current.contains(event.target) &&
      iconRef.current &&
      !iconRef.current.contains(event.target)
    ) {
      setShowNote(false);
    }
  };

  useEffect(() => {
    // Automatically show the note when the component mounts
    setShowNote(true);

    // Automatically hide the note after 5 seconds (you can adjust this duration)
    const timeoutId = setTimeout(() => {
      setShowNote(false);
    }, 15000); // Adjust time in milliseconds

    // Add click event listener to handle outside clicks
    document.addEventListener("click", handleClickOutside);

    // Cleanup event listener and timeout when component unmounts or when `showNote` changes
    return () => {
      clearTimeout(timeoutId); // Clear timeout to avoid memory leaks
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <div className="info-note">
      <div className="info-icon" onClick={toggleNote} ref={iconRef}>
        i
      </div>
      {/* Include h1 tag directly in JSX */}
      {showNote && (
        <div className="note-tooltip" ref={noteRef} dangerouslySetInnerHTML={{ __html: note }} />
      )}
    </div>
  );
}

export default InfoNote;
