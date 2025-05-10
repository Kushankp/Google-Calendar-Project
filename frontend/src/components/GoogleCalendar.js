import React, { useEffect, useCallback, useState } from 'react';
import AuthButton from './AuthButton';
import { useLocation } from 'react-router-dom';

function GoogleCalendar() {
  const [gapiInited, setGapiInited] = useState(false);
  const [gisInited, setGisInited] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsLoaded, setEventsLoaded] = useState(false); // New state for tracking if events have been loaded
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const groupId = params.get('groupId');
    if (groupId) {
      // Make API call to store groupId as a cookie server-side
      fetch('https://sync-meet.kushankrockz.workers.dev/api/store-group-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies in the request
        body: JSON.stringify({ groupId }),
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to store group ID');
        }
        console.log('Group ID stored successfully');
      })
      .catch(error => {
        console.error('Error storing group ID:', error);
      });
    }
  }, [location]);

  const handleAuthCode = useCallback(async (code) => {
    console.log('Received auth code:', code);
  
    try {
      const tokenResponse = await fetch('https://sync-meet.kushankrockz.workers.dev/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: code.code }),
      });
  
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(`Failed to exchange token: ${errorData.error}`);
      }
  
      const { access_token } = await tokenResponse.json();
      fetchEvents(access_token);
    } catch (error) {
      console.error('Error during token exchange', error);
    }
  }, []);

  const gapiLoaded = useCallback(() => {
    window.gapi.load('client', async () => {
      await window.gapi.client.init({
        apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
      });
      setGapiInited(true);
    });
  }, []);

  const gisLoaded = useCallback(() => {
    const tokenClient = window.google.accounts.oauth2.initCodeClient({
      client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      ux_mode: 'popup',
      callback: (code) => handleAuthCode(code), // Use handleAuthCode here
    });
    setTokenClient(tokenClient);
    setGisInited(true);
  }, [handleAuthCode]);

  const fetchEvents = async (access_token) => {
    try {
      const eventsResponse = await fetch(`https://sync-meet.kushankrockz.workers.dev/api/events?access_token=${access_token}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
  
      if (!eventsResponse.ok) throw new Error('Failed to fetch events');

      const eventsData = await eventsResponse.json();
      setEvents(eventsData.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]); // If an error occurs, set events to an empty array
    } finally {
      setEventsLoaded(true); // Mark that events have been loaded
    }
  };

  const handleAuthClick = useCallback(() => {
    if (tokenClient) {
      tokenClient.requestCode();
    }
  }, [tokenClient]);

  useEffect(() => {
    const script1 = document.createElement('script');
    script1.src = 'https://apis.google.com/js/api.js';
    script1.async = true;
    script1.defer = true;
    script1.onload = gapiLoaded;
    document.body.appendChild(script1);

    const script2 = document.createElement('script');
    script2.src = 'https://accounts.google.com/gsi/client';
    script2.async = true;
    script2.defer = true;
    script2.onload = gisLoaded;
    document.body.appendChild(script2);

    return () => {
      document.body.removeChild(script1);
      document.body.removeChild(script2);
    };
  }, [gapiLoaded, gisLoaded]);

  return (
    <div>
      <p>Google Calendar API</p>
      <AuthButton onClick={handleAuthClick} disabled={!gapiInited || !gisInited} text="Authorize" />
      {eventsLoaded ? (
        events.length ? (
          <pre>{`Events:\n${events.map(event => event.summary).join('\n')}`}</pre>
        ) : (
          <p>No <strong>Upcoming events</strong> found</p>
        )
      ) : (
        <p>Click on <strong>Authorize</strong> to Submit Your Events</p>
      )}
     <p>Once authorized, any upcoming events from your calendar will be displayed here and stored in the backend database. These events will be used to determine common free time slots when the organizer clicks the 'Fetch Common Free Time Slot' button, which is only visible to the person who generated QR after his authorization.</p>
    </div>
  );
}

export default GoogleCalendar;
