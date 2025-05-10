import React, { useEffect, useCallback, useState } from 'react';
import AuthButton from './AuthButton'; // Assumes you have an AuthButton component
import CommonSlot from './CommonSlot.js'; // New CommonSlot component
import { QRCodeCanvas } from 'qrcode.react';

function Calendar() {
  const [gapiInited, setGapiInited] = useState(false);
  const [gisInited, setGisInited] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsFetched, setEventsFetched] = useState(false); // New state to track if events have been fetched
  const [commonSlots, setCommonSlots] = useState([]);
  const [hasFetchedCommonSlots, setHasFetchedCommonSlots] = useState(false); // New state
  const [groupId, setGroupId] = useState(null);


  useEffect(() => {
    // Fetch groupId from the server
    const fetchGroupId = async () => {
      try {
        const response = await fetch('https://sync-meet.kushankrockz.workers.dev/api/get-group-id', {
          credentials: 'include', // Include cookies in the request
        });
        const data = await response.json();

        if (response.ok) {
          setGroupId(data.groupId);
        } else {
          console.error('Failed to retrieve groupId:', data.error);
        }
      } catch (error) {
        console.error('Error fetching groupId:', error);
      }
    };

    fetchGroupId();
  }, []);

  const handleAuthCode = useCallback(async (code) => {
    console.log('Received auth code:', code);

    try {
      const tokenResponse = await fetch('https://sync-meet.kushankrockz.workers.dev/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      callback: (code) => handleAuthCode(code),
    });
    setTokenClient(tokenClient);
    setGisInited(true);
  }, [handleAuthCode]);

  const fetchEvents = async (access_token) => {
    try {
      const eventsResponse = await fetch(`https://sync-meet.kushankrockz.workers.dev/api/events?access_token=${access_token}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!eventsResponse.ok) throw new Error('Failed to fetch events');

      const eventsData = await eventsResponse.json();
      setEvents(eventsData.events || []);
      setEventsFetched(true); // Set the flag after fetching
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents(['Error fetching events']);
      setEventsFetched(true); // Set the flag even in case of error
    }
  };

  const handleAuthClick = useCallback(() => {
    if (tokenClient) {
      tokenClient.requestCode();
    }
  }, [tokenClient]);

  const getCommonTimeSlots = async () => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('Timezone:', timezone);

      const response = await fetch('https://sync-meet.kushankrockz.workers.dev/api/commonslot', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timezone }),
      });

      if (!response.ok) throw new Error('Failed to fetch common time slots');

      const data = await response.json();
      setCommonSlots(data.commonSlots || []);
      setHasFetchedCommonSlots(true); // Set to true after fetching slots
    } catch (error) {
      console.error('Error fetching common time slots:', error.message);
    }
  };

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
      <br></br>
      {eventsFetched && events.length === 0 && ( // Check if no events were fetched and API call is complete
        <p>No events found</p>
      )}

      {eventsFetched && events.length > 0 && !hasFetchedCommonSlots && (
        <pre>{`Events:\n${events.map(event => event.summary).join('\n')}`}</pre>
      )}
      {eventsFetched && events.length === 0 && (
  <p>You have no upcoming events</p>
)}
      {eventsFetched && (
        <>
           <br></br>
          <button onClick={getCommonTimeSlots}>
            Get Common Free Time Slots
          </button>
          <div>
            <h1><i>Available Free Slots</i></h1>
            {hasFetchedCommonSlots ? (
              commonSlots.length > 0 ? (
                commonSlots.map((slot, index) => (
                  <CommonSlot key={index} start={slot.start} end={slot.end} />
                ))
              ) : (
                <p>No common free slots found</p>
              )
            ) : (
              <p>Click the "Get Common Free Time Slots" button to see available slots.</p> // Prompt before clicking
            )}
            
          </div>
        </>
      )}
      <br></br>
      {groupId && (
        <div>
          <QRCodeCanvas value={`${window.location.origin}/google-calendar?groupId=${groupId}`} size={256} />
        </div>
      )}
    </div>
  );
  
  
}

export default Calendar;
