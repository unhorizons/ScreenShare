# ScreenShare API

The **ScreenShare API** is a backend service designed to facilitate real-time screen sharing and broadcasting using **WebRTC**. It provides endpoints for managing users, sessions, and WebRTC connections, along with real-time event streaming using **Server-Sent Events (SSE)**.

---

## Features

- **User Management**: Register users, validate tokens, and update user information.
- **Session Management**: Create, start, and end broadcasting sessions.
- **WebRTC Integration**: Hosts can broadcast their screen, and viewers can join the broadcast.
- **Real-Time Updates**: Stream session updates using Server-Sent Events (SSE).
- **Role-Based Access Control**: Restrict certain actions to hosts only.

---

## Technologies Used

- **Node.js**: Runtime environment.
- **Express.js**: Web framework for building the API.
- **WebRTC**: Real-time communication for screen sharing.
- **JSON Web Tokens (JWT)**: Secure user authentication.
- **Server-Sent Events (SSE)**: Real-time event streaming.
- **TypeScript**: Static typing for better code quality.

---

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- SSL certificates (`key.pem` and `cert.pem`) for HTTPS

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/screenshare-api.git
   cd screenshare-api

2. Install dependencies:
   ```bash
   yarn install

3. Create a .env file in the root directory and add the following:
   ```env
   JWT_SECRET=your_jwt_secret_key

4. Generate SSL certificates (key.pem and cert.pem) and place them in the root directory.

5. Start the server:
   ```bash
   yarn start

6. The server will start at https://localhost (or your domain). The client configuration file (public/config.js) will be automatically updated with the server URL.

---

## API Documentation

### Base URL

```code
https://www.screenshare.net or https://localhost

### Authentication

- Use the token returned from the /users endpoint for authenticated requests.
- Include the token in the Authorization header:
   ```code
   Authorization: Bearer <JWT_TOKEN>

### Endpoints

#### User Management

- Register a User: POST /users
- Validate Token: GET /users/validate-token
- Update User: PATCH /users

#### Session Management

- Get All Sessions: GET /sessions
- Get a Session: GET /sessions/:session
- Create a Session: POST /sessions
- Start a Broadcast: POST /sessions/start-broadcast/:session
- End a Broadcast: POST /sessions/end-broadcast/:session
- Join a Broadcast: POST /sessions/join-broadcast/:session

#### Real-Time Events

- Stream Session Updates: GET /sessions/:session/events
- Stream Session Start Events: GET /sessions/:session/started-events

---

### Usage Example

1. Register a user
   ``` bash
   POST /users
   Body: { "username": "Alice" }
   Response: { "token": "<JWT_TOKEN>", "detail": "User registered successfully" }

2. Create a session
   ```bash 
   POST /sessions
   Headers: { "Authorization": "Bearer <JWT_TOKEN>" }
   Body: { "name": "My Session" }
   Response: { "id": 1, "name": "My Session", ... }

3. Start a Broadcast
   ```bash
   POST /sessions/start-broadcast/1
   Headers: { "Authorization": "Bearer <JWT_TOKEN>" }
   Body: { "sdp": "<SDP_OFFER>" }
   Response: { "detail": "Session started successfully", "sdp": "<SDP_ANSWER>" }

4. Join a Broadcast
   ```bash
   POST /sessions/join-broadcast/1
   Headers: { "Authorization": "Bearer <JWT_TOKEN>" }
   Body: { "sdp": "<SDP_OFFER>" }
   Response: { "sdp": "<SDP_ANSWER>", "detail": "Session joined successfully" }

5. Stream Session updates
   ```bash
   GET /sessions/1/events
   Headers: { "Authorization": "Bearer <JWT_TOKEN>" }
   Response: SSE stream with session updates

---

### Error Handling

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch (git checkout -b feature/YourFeature).
3. Commit your changes (git commit -m 'Add some feature').
4. Push to the branch (git push origin feature/YourFeature).
5. Open a pull request.