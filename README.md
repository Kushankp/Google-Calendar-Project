# 📅 Google Calendar QR Sharing App

This web application enables users to coordinate meetings by sharing Google Calendar availability via QR codes. It helps groups find common free time slots using Google OAuth and Cloudflare infrastructure.

---

![Status](https://img.shields.io/badge/status-live-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Deploy](https://img.shields.io/badge/deployed-Google_Cloud_Run-orange)
![Cloudflare](https://img.shields.io/badge/backend-Cloudflare_Workers-yellow)

---

## 🚀 Final MVP Features

- ✅ **QR Code Generation**  
  Creator generates a QR with a unique group ID.

- 🔗 **OAuth Flow**  
  - Friends scan QR → Authorize Google Calendar → Events fetched.
  - Cloudflare Worker exchanges auth code for access token and stores data in D1.

- 🧠 **Common Slot Finder**  
  After all users authorize, the system analyzes events to identify shared free slots.

- 🗃️ **Secure Data Storage**  
  Uses Cloudflare D1 to persist user events, group metadata, and computed common slots.

---

## 🗃️ Database Schema (Cloudflare D1)

### 📌 `Users`
| Column         | Type      |
|----------------|-----------|
| user_id        | UUID      |
| group_id       | UUID      |
| auth_token     | TEXT      |
| token_expires  | TIMESTAMP |
| created_at     | TIMESTAMP |

### 📌 `Events`
| Column      | Type      |
|-------------|-----------|
| event_id    | UUID      |
| group_id    | UUID      |
| user_id     | UUID      |
| event_title | TEXT      |
| start_time  | TIMESTAMP |
| end_time    | TIMESTAMP |
| created_at  | TIMESTAMP |

### 📌 `Groups`
| Column     | Type      |
|------------|-----------|
| group_id   | UUID      |
| group_name | TEXT      |
| created_at | TIMESTAMP |

### 📌 `CommonSlots`
| Column     | Type      |
|------------|-----------|
| slot_id    | UUID      |
| group_id   | UUID      |
| start_time | TIMESTAMP |
| end_time   | TIMESTAMP |

---

## 🧑‍💻 Tech Stack

- **Frontend**: React
- **Backend**: Cloudflare Workers (Node.js)
- **Database**: Cloudflare D1
- **Authentication**: Google OAuth 2.0
- **UUID**-based session management
- **QR Code**: Dynamically generated for each group

---

## 🛠 Setup Instructions

> 💡 Make sure Node.js and Wrangler CLI are installed.

```bash
# Install dependencies
npm install

# Authenticate with Cloudflare
npx wrangler login

# Start development worker locally
npx wrangler dev
```

Update `.env` or `wrangler.toml` with your secrets:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_secret
DB_URL=your_d1_connection_string
```

---

## 🚀 Deployment (Cloudflare Pages + Workers)

1. **Push code to GitHub**
2. **Connect repo to Cloudflare Pages**
3. **Set environment variables in Cloudflare dashboard**
4. **Deploy backend with Wrangler**

```bash
npx wrangler deploy
```

---

## 🤝 Contributing

Contributions are welcome! Follow these steps:

1. Fork the repository
2. Create a new branch (`git checkout -b feature-name`)
3. Commit your changes
4. Push to your branch (`git push origin feature-name`)
5. Create a Pull Request

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---
