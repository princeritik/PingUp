# PingUp

PingUp is a full-stack social media web application where users can create posts, upload stories, follow users, send connection requests, and chat in real time. The app uses Clerk for authentication, MongoDB for data storage, ImageKit for media uploads, and Server-Sent Events for live messaging and notifications.

## Live Links

- Frontend: https://ping-up-client-eight.vercel.app
- Backend API: https://ping-up-server-delta.vercel.app

## Features

- User authentication with Clerk
- User profile with bio, location, profile picture, and cover photo
- Discover users by username, email, full name, or location
- Follow and unfollow users
- Send, accept, and manage connection requests
- Create posts with text and media
- Like and unlike posts
- Create text, image, and video stories
- Auto-delete stories after 24 hours using Inngest
- Real-time chat using Server-Sent Events
- Message seen/unseen status
- Recent messages section
- Custom popup notification when a new message arrives
- Responsive UI built with Tailwind CSS

## Tech Stack

### Frontend

- React
- Vite
- React Router
- Redux Toolkit
- Tailwind CSS
- Clerk React SDK
- Axios
- React Hot Toast
- Lucide React
- Moment.js

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- Clerk authentication middleware
- Multer
- ImageKit
- Inngest
- Nodemailer / Brevo SMTP
- Server-Sent Events

## Project Structure

```txt
PingUp/
├── client/
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── user/
│   │   │   ├── connections/
│   │   │   └── messages/
│   │   ├── pages/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── configs/
│   │   ├── mongodb.js
│   │   ├── imagekit.js
│   │   └── multer.js
│   ├── controllers/
│   ├── inngest/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   └── package.json
```

## Environment Variables

### Frontend `.env`

Create a `.env` file inside the frontend/client folder.

```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_BACKEND_URL=http://localhost:4000
```

For production, use your deployed backend URL:

```env
VITE_BACKEND_URL=https://your-backend-url.vercel.app
```

### Backend `.env`

Create a `.env` file inside the backend/server folder.

```env
PORT=4000
MONGODB_URI=your_mongodb_connection_string

CLERK_SECRET_KEY=your_clerk_secret_key

IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=your_imagekit_url_endpoint

FRONTEND_URL=http://localhost:5173

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SENDER_EMAIL=your_verified_sender_email

INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key
```

For production, set:

```env
FRONTEND_URL=https://your-frontend-url.vercel.app
```

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/princeritik/PingUp.git
cd PingUp
```

### 2. Install frontend dependencies

```bash
cd client
npm install
```

### 3. Install backend dependencies

```bash
cd ../server
npm install
```

### 4. Start the backend

```bash
npm run server
```

The backend should run on:

```txt
http://localhost:4000
```

### 5. Start the frontend

Open another terminal:

```bash
cd client
npm run dev
```

The frontend should run on:

```txt
http://localhost:5173
```

## Important Notes

### CORS

The backend must allow both local and deployed frontend URLs.

Example:

```js
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
```

### React Router on Vercel

Add a `vercel.json` file in the frontend folder to support page refresh on nested routes.

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Server-Sent Events

PingUp uses Server-Sent Events for real-time chat and notification popups. The frontend opens an SSE connection for the logged-in user, and the backend pushes incoming messages to that user.

For large-scale production use, a dedicated real-time service such as Socket.IO, Pusher, or Ably can be used.

## API Overview

### User Routes

```txt
GET    /api/user/data
POST   /api/user/update
POST   /api/user/follow
POST   /api/user/unfollow
POST   /api/user/connect
POST   /api/user/accept
GET    /api/user/connections
POST   /api/user/discover
```

### Post Routes

```txt
POST   /api/post/create
GET    /api/post/feed
POST   /api/post/like
```

### Story Routes

```txt
POST   /api/story/create
GET    /api/story/get
```

### Message Routes

```txt
GET    /api/message/:userId
POST   /api/message/send
POST   /api/message/get
POST   /api/message/seen
GET    /api/message/recent
```

## Deployment

### Frontend Deployment

The frontend can be deployed on Vercel.

Required frontend environment variables:

```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_BACKEND_URL=https://your-backend-url.vercel.app
```

Build command:

```bash
npm run build
```

Output directory:

```txt
dist
```

### Backend Deployment

The backend can also be deployed on Vercel.

Required backend environment variables include MongoDB, Clerk, ImageKit, SMTP, Inngest, and frontend URL values.

After changing backend environment variables, redeploy the backend.

## Common Issues and Fixes

### CORS error after deployment

Make sure backend `FRONTEND_URL` is set to the deployed frontend URL and redeploy the backend.

### Vite environment variable undefined

Frontend environment variables must start with `VITE_`.

Correct:

```env
VITE_BACKEND_URL=https://your-backend-url.vercel.app
```

Wrong:

```env
BACKEND_URL=https://your-backend-url.vercel.app
```

### Video story ImageKit error

Do not apply image transformations such as `format: "webp"` to video files. Use image transformations only for image uploads.

### Real-time chat not working

Check that the frontend SSE URL matches the backend route and that the backend allows the deployed frontend origin through CORS.

## Author

Prince Raj  
Computer Science and Engineering  
National Institute of Technology Patna

## License

This project is for learning and portfolio purposes.
