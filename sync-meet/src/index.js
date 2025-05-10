import renderHtml from "./renderHtml.js";
import { v4 as uuidv4 } from 'uuid';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    console.log("Incoming request:", url.pathname, request.method);

    if (request.method === 'OPTIONS') {
      console.log("Handling CORS preflight");
      return handleCorsPreflight();
    }

    if (url.pathname === '/') {
      console.log("Serving HTML content for root path");
      const html = await renderHtml();
      return new Response(html, {
        headers: { 'Content-Type': 'text/html', ...corsHeaders() },
        status: 200,
      });
    }

    if (url.pathname === '/api/store-group-id') {
      console.log("Storing group ID");
      return handleStoreGroupId(request, env);
    }

    if (url.pathname === '/api/token') {
      console.log("Handling token exchange");
      return handleTokenExchange(request, env);
    }

    if (url.pathname === '/api/events') {
      console.log("Fetching events");
      return handleEventsRequest(request, env);
    }
    if (url.pathname === '/api/commonslot') {
      console.log("sending coomon slots");
      return  getCommonTimeSlots(request, env);
    }
    if (url.pathname === '/api/get-group-id') {
      console.log("sending groupId");
      return  handleGetGroupId(request, env);
    }

    console.warn("Route not found:", url.pathname);
    return new Response('Not Found', { status: 404, headers: corsHeaders() });
  },
};

// Handle CORS preflight request with logging
function handleCorsPreflight() {
  console.log("Processing CORS preflight request");
  return new Response(null, {
    headers: {
      ...corsHeaders(),
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Reusable CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': 'https://sync-meet.pages.dev', // Allow the frontend origin
    'Access-Control-Allow-Credentials': 'true', // Enable credentials for CORS
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// Parse cookies from request headers with additional logging
function parseCookies(request) {
  const cookies = {};
  (request.headers.get('Cookie') || '').split(';').forEach(cookie => {
    const [name, value] = cookie.split('=').map(c => c.trim());
    if (name && value) {
      cookies[name] = value;
    }
  });
  console.log("Parsed cookies:", cookies); // Debugging log
  return cookies;
}

// Store group ID in a cookie with logging and insert data into Cloudflare database
async function handleStoreGroupId(request, env) {
  if (request.method !== 'POST') {
    console.error("Invalid method for storing group ID:", request.method);
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() });
  }

  const { groupId, groupName, createdAt, selectedDate } = await request.json();
  console.log("Received data:", { groupId, groupName, createdAt, selectedDate });

  // Check if groupId is provided
  if (!groupId) {
    return new Response(JSON.stringify({ error: 'Missing group ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  }

  const headers = new Headers(corsHeaders());
  headers.set('Content-Type', 'application/json');

  try {
    // Case 1: Only groupId provided, set only groupId cookie and skip database insertion
    if (!groupName || !createdAt || !selectedDate) {
      headers.set('Set-Cookie', `groupId=${groupId}; Path=/; SameSite=None; Secure; HttpOnly`);
      return new Response(JSON.stringify({ message: 'Group ID stored as cookie' }), {
        status: 200,
        headers,
      });
    }

    // Case 2: All fields provided, insert into database and set all four cookies
    await env.DATABASE.prepare(
      "INSERT INTO Groups (group_id, group_name, created_at) VALUES (?, ?, ?)"
    ).bind(groupId, groupName, createdAt).run();

    headers.append('Set-Cookie', `groupId=${groupId}; Path=/; SameSite=None; Secure; HttpOnly`);
    headers.append('Set-Cookie', `groupName=${encodeURIComponent(groupName)}; Path=/; SameSite=None; Secure; HttpOnly`);
    headers.append('Set-Cookie', `createdAt=${createdAt}; Path=/; SameSite=None; Secure; HttpOnly`);
    headers.append('Set-Cookie', `selectedDate=${selectedDate}; Path=/; SameSite=None; Secure; HttpOnly`);

    return new Response(JSON.stringify({ message: 'Group data stored' }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error storing group data in the database:', error.message);
    return new Response(JSON.stringify({ error: 'Failed to store group data' }), {
      status: 500,
      headers,
    });
  }
}

async function handleGetGroupId(request) {
  const headers = new Headers(corsHeaders());
  headers.set('Content-Type', 'application/json');

  // Parse the cookies from the request headers
  const cookies = parseCookies(request);

  // Check if the groupId exists in the cookies
  const groupId = cookies['groupId'];
  console.log("Group ID found in cookies:", groupId);

  if (!groupId) {
    return new Response(JSON.stringify({ error: 'No group ID found in cookies' }), {
      status: 400,
      headers,
    });
  }

  // Return the groupId as a JSON response
  return new Response(JSON.stringify({ groupId }), {
    status: 200,
    headers,
  });
}

// Handle token exchange with error logging and store token in the database
async function handleTokenExchange(request, env) {
  if (request.method !== 'POST') {
    console.error("Invalid method for token exchange:", request.method);
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() });
  }

  const { code } = await request.json();
  console.log("Authorization code received:", code);

  if (!code) {
    return new Response(JSON.stringify({ error: 'Missing authorization code' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  }

  try {
    // Generate a unique user_id
    const userId = uuidv4();

    // Exchange authorization code for tokens
    const tokenResponse = await exchangeCodeForToken(code, env);
    const tokenData = await tokenResponse.json();

    // Parse cookies to get group_id from the request
    const cookies = parseCookies(request);
    const groupId = cookies.groupId;

    // Ensure that group_id is available
    if (!groupId) {
      return new Response(JSON.stringify({ error: 'Missing group ID from cookies' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    // Insert user data into the database with the generated user_id
    await env.DATABASE.prepare(
      "INSERT INTO Users (user_id, group_id, auth_token, token_expires, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(userId, groupId, tokenData.access_token, tokenData.expires_in, new Date().toISOString()).run();

    // Return the token data as a response and store user_id in cookies
    return new Response(JSON.stringify({ user_id: userId, ...tokenData }), {
      headers: {
        'Set-Cookie': `userId=${userId}; Path=/; SameSite=None; Secure; HttpOnly`,  // Store userId in cookies
        'Content-Type': 'application/json',
        ...corsHeaders(),
      },
    });
    

  } catch (error) {
    console.error('Error during token exchange or database insert:', error.message);
    return new Response(JSON.stringify({ error: 'Failed to store token data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  }
}


// Fetch events using access token and group ID from cookies with logging
async function handleEventsRequest(request, env) {
  const access_token = new URL(request.url).searchParams.get('access_token');
  const cookies = parseCookies(request); // Assuming parseCookies is a utility to extract cookies from the request
  const groupId = cookies.groupId; // Fetch the group ID from cookies
  const userId = cookies.userId; // Assuming userId is also stored in cookies
  
  console.log("All cookies:", cookies);
  console.log("Access token:", access_token);
  console.log("Group ID from cookies:", groupId);

  // Validate if groupId and userId exist
  if (!groupId || !userId) {
    return new Response(JSON.stringify({ error: 'Missing group ID or user ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  }

  if (!access_token) {
    return new Response(JSON.stringify({ error: 'Missing access token' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  }

  try {
    // Get the current date in ISO format
    const now = new Date().toISOString();

    // Fetch only future events starting from the current date
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    // Handle non-OK responses from the API
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error fetching events:', errorData.error.message);
      throw new Error(errorData.error.message || 'Failed to fetch events');
    }

    const data = await response.json(); // Extract event data from the response
    console.log("Fetched events:", data.items);

    // Iterate over the event items and insert them into the database
    for (const event of data.items) {
      const eventId = uuidv4(); // Generate a unique event ID
      const createdAt = new Date().toISOString(); // Use the current timestamp for created_at

      // Handle events with either dateTime (specific time) or date (all-day event)
      const startTime = event.start.dateTime || event.start.date;
      const endTime = event.end.dateTime || event.end.date;

      // Insert the event data into the Events table
      await env.DATABASE.prepare(
        "INSERT INTO Events (event_id, group_id, user_id, event_title, start_time, end_time, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        eventId,         // event_id
        groupId,         // group_id from cookies
        userId,          // user_id from cookies
        event.summary || "No title", // Event title, default to 'No title' if empty
        startTime,       // Start time of the event
        endTime,         // End time of the event
        createdAt        // Timestamp when the event is inserted
      )
      .run();
    }

    return new Response(JSON.stringify({ success: true, events: data.items }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });

  } catch (error) {
    console.error('Error processing events:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  }
}


// Helper function to exchange authorization code for access token with error logging
async function exchangeCodeForToken(code, env) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: 'https://sync-meet.pages.dev',  // Make sure this matches the registered redirect URI
      grant_type: 'authorization_code',
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Token exchange failed:', data.error || data);
    throw new Error(data.error || 'Failed to exchange token');
  }

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

// Updated function to fetch events for the group using env.DATABASE
async function fetchEventsForGroup(groupId, env) {
  const query = `SELECT * FROM events WHERE group_id = ? ORDER BY start_time ASC`;

  // Execute the query using `prepare` and bind the groupId
  const stmt = env.DATABASE.prepare(query);
  const events = await stmt.bind(groupId).all();

  return events.results; // Assuming `results` contains the array of events
}

// Main function to get common time slots with refined timezone handling
async function getCommonTimeSlots(request, env) {
  try {
    const cookies = parseCookies(request);
    const groupId = cookies.groupId;
    const selectedDate = cookies.selectedDate;
    const body = await request.json();
    const timezoneStr = body.timezone || "UTC"; // User's local timezone, defaulting to UTC if not provided

    const date = dayjs(selectedDate).format('YYYY-MM-DD');
    console.log("Parsed Date:", date);
    console.log("Timezone:", timezoneStr);

    // Get the current time in the user's time zone
    const now = dayjs().tz(timezoneStr);

    // Fetch events for the group
    const events = await fetchEventsForGroup(groupId, env);
    if (events.length === 0) {
      const freeSlotsForWholeDay = [{
        start: dayjs.tz(`${date}T00:00:00`, timezoneStr).format(),
        end: dayjs.tz(`${date}T23:59:59`, timezoneStr).format()
      }];
      return new Response(JSON.stringify({ commonSlots: freeSlotsForWholeDay }), {
        status: 200,
        headers: {
          ...corsHeaders(),
          'Content-Type': 'application/json'
        }
      });
    }

    // Define free time slots for each user with precise timezone handling
    const usersFreeSlots = [];
    const uniqueUsers = [...new Set(events.map(event => event.user_id))];

    for (const userId of uniqueUsers) {
      const userEvents = events.filter(event => event.user_id === userId);
      userEvents.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

      let freeSlots = [];
      let lastEnd = dayjs.tz(`${date}T00:00:00`, timezoneStr);

      for (const event of userEvents) {
        const eventStart = dayjs.tz(event.start_time, 'UTC');
        const eventEnd = dayjs.tz(event.end_time, 'UTC');

        if (eventStart.isAfter(lastEnd)) {
          freeSlots.push({
            start: lastEnd.isAfter(dayjs.tz(`${date}T00:00:00`, timezoneStr)) ? lastEnd : dayjs.tz(`${date}T00:00:00`, timezoneStr),
            end: eventStart.isBefore(dayjs.tz(`${date}T23:59:59`, timezoneStr)) ? eventStart : dayjs.tz(`${date}T23:59:59`, timezoneStr),
          });
        }
        lastEnd = eventEnd.isAfter(lastEnd) ? eventEnd : lastEnd;
      }

      if (lastEnd.isBefore(dayjs.tz(`${date}T23:59:59`, timezoneStr))) {
        freeSlots.push({
          start: lastEnd,
          end: dayjs.tz(`${date}T23:59:59`, timezoneStr),
        });
      }

      usersFreeSlots.push(freeSlots);
    }

    const commonSlots = findCommonFreeSlots(usersFreeSlots, now);

    // Convert the common slots to the user's local time zone for the final output
    const commonSlotsInUserTimezone = commonSlots.map(slot => ({
      start: dayjs(slot.start).tz(timezoneStr).format(),
      end: dayjs(slot.end).tz(timezoneStr).format(),
    }));

    if (commonSlotsInUserTimezone.length === 0) {
      return new Response(JSON.stringify({ message: 'No common slots found' }), {
        status: 200,
        headers: {
          ...corsHeaders(),
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response(JSON.stringify({ commonSlots: commonSlotsInUserTimezone }), {
      status: 200,
      headers: {
        ...corsHeaders(),
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error fetching common time slots:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: {
        ...corsHeaders(),
        'Content-Type': 'application/json'
      }
    });
  }
}

// Helper function to find overlapping free slots across multiple users and filter based on the current time
function findCommonFreeSlots(usersFreeSlots, now) {
  if (usersFreeSlots.length === 0) return [];

  // Start with the free slots of the first user
  let commonSlots = usersFreeSlots[0];

  // Iteratively find the intersection with each subsequent user's free slots
  for (let i = 1; i < usersFreeSlots.length; i++) {
    const userFreeSlots = usersFreeSlots[i];
    commonSlots = intersectTimeRanges(commonSlots, userFreeSlots);

    // If no common slots remain, exit early as no further intersections are possible
    if (commonSlots.length === 0) break;
  }

  // Filter out any common slots that end before the current time
  return commonSlots.filter(slot => dayjs(slot.end).isAfter(now));
}

// Helper function to calculate the intersection of two users' free time slots
function intersectTimeRanges(slotsA, slotsB) {
  const result = [];

  // Traverse through both slot lists and find overlapping intervals
  for (const slotA of slotsA) {
    for (const slotB of slotsB) {
      const start = dayjs(slotA.start).isAfter(dayjs(slotB.start)) ? dayjs(slotA.start) : dayjs(slotB.start);
      const end = dayjs(slotA.end).isBefore(dayjs(slotB.end)) ? dayjs(slotA.end) : dayjs(slotB.end);

      // Ensure the duration is at least the minimum required for a valid slot
      if (start.isBefore(end) && end.diff(start, 'minute') >= 30) {
        result.push({ start, end });
      }
    }
  }

  return result;
}
