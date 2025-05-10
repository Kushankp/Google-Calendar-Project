Checkpoint 0:
*Project Description*
This project is a web application that allows users to share their Google Calendar data using a QR code. One user generates a QR code containing a unique session ID, 
which can be shared with others. When someone scans the QR code, they are prompted to authenticate via Google OAuth 2.0 and grant access to their Google Calendar. 
The calendar data is then automatically fetched and shared with the original user for scheduling and event planning purposes.

Checkpoint 1:
QR Code Sharing: Generate a QR code that contains a unique session ID.
OAuth 2.0 Integration: Authenticate users via Google and request access to their Google Calendar.
Google Calendar API Integration: Fetch and share calendar data after authentication.
Automatic Data Collection: No manual action is required after scanning the QR code; the process is automated.

Checkpoint 2:
1. Basic UI
2. Integration of frontend application with backend.
3. Setting up the CICD Pipeline
4. Oauth integration
5. Trying to fetch and store events for users from calendar API.
6. Finding a best time slot analysis algorithm

Final Project MVP:
1. The Creator Generates the QR code which contains a unique ID.
2. The Creator can ask his friends to scan it for authorization, and he should use the "use above QR code button" to authorize and fetch his events.
3. Events are fetched at the date and time the user clicks the AUTHORIZE button.
4. The QR code redirects them to the Authorize page where users can authorize.
5. After successfully receiving the auth code, a post request is triggered for the CloudFlare worker to exchange it with an access token.
6. After getting the access token, the worker fetches the events using the access token.
7. The fetched events are stored in the DB and the time slot analysis algorithm is
 implemented on the DB once the creator clicks the "fetch common slots" button.
8. A common time slot is sent to the frontend application.

Data Base Schema (Cloudflare D1)
We total have 4 tables
1. Events - event_id, group_id, user_id, event_title, start_time ,end_time, created_at
2. Users - user_id, group_id, auth_token, token_expires, created_at
3. Groups - group_id, group_name, created_at
4. Common slots- slot_id, group_id, start_time, end_time
