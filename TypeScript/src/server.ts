import dotenv from "dotenv";
dotenv.config(); // Load environment variables from .env file

import express, { NextFunction, Request, Response } from "express"; // Express framework
import { WebSocket, WebSocketServer } from "ws";
import bodyParser from "body-parser"; // Middleware to parse request bodies
import cors from "cors"; // Middleware to enable CORS

import fs from "fs"; // File system module
import https from "https"; // HTTPS server
import http from "http"; // HTTP server
import dns from "dns"; // DNS module for domain resolution
import os from "os"; // Operating system utilities
import { exec } from "child_process"; // Execute shell commands

import { User, Session } from "./database"; // User model
import { generateHostAccessCode, generateToken } from "./authentication"; // Authentication utilities
import { session_router } from "./routers/session"; // Session router
import { user_router } from "./routers/user"; // User router
import { WebRTCConnection } from "./webrtc";

import {
    RTCPeerConnection,
    RTCSessionDescription,
    RTCIceCandidate,
} from "wrtc"; // WebRTC library

const app = express(); // Create an Express app
app.use(cors()); // Enable CORS for all routes

let access_code: string; // Host access code
let access_code_renewer: NodeJS.Timeout; // Timer to renew the access code
let host_logged_in = false; // Flag to track if the host has logged in
const HOST_ACCESS_PATH = "/users/host-login"; // Path for host login

// Log all incoming requests
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(
        `[${new Date().toLocaleString()}] [${req.method}] : ${req.path}`
    );
    next();
});

app.use(express.static("public")); // Serve static files from the 'public' directory
app.use(bodyParser.json()); // Parse JSON request bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Middleware to prevent access until the host logs in
app.use((req, res, next) => {
    if (!host_logged_in && req.path != HOST_ACCESS_PATH) {
        res.status(403); // Forbidden status
        const msg = "Server locked down until the host logs in";
        console.log(msg);
        res.json({
            detail: msg,
        });
        return;
    }
    next();
});

// Use the session and user routers
app.use("/sessions", session_router);
app.use("/users", user_router);

// Host login endpoint
app.post(
    HOST_ACCESS_PATH,
    ({ body: { username, code } }: Request, res: Response) => {
        if (host_logged_in) {
            res.sendStatus(403); // Forbidden if the host is already logged in
            return;
        }
        if (code === access_code) {
            // Create a new host user and generate a token
            const user = new User({ username, role: "host" });
            const token = generateToken(user);

            host_logged_in = true; // Set host login flag
            clearInterval(access_code_renewer); // Stop renewing the access code
            res.json({
                token: token,
                detail: "Host logged in, the server has been unlocked",
            });
            return;
        }
        res.status(400); // Bad request if the access code is invalid
        res.json({
            detail: "Invalid access code",
        });
        return;
    }
);

// Redirect to the user login page for a specific session
app.get("/live/:session", ({ params: { session } }: Request, res: Response) => {
    res.redirect(301, `/?route=user-login/${session}`);
});

// Redirect to a specific route
app.get("/:route", ({ params: { route } }: Request, res: Response) => {
    res.redirect(301, `/?route=${route}`);
});

// HTTPS server options (SSL/TLS certificates)
const options = {
    key: fs.readFileSync("key.pem"), // Private key
    cert: fs.readFileSync("cert.pem"), // Certificate
};

const server = https.createServer(options, app);

// WebSocket server
const wss = new WebSocketServer({ server });

// Store connected clients
const clients = new Map();

// WebSocket connection handler
wss.on("connection", (ws: WebSocket, req) => {
    console.log("A new client connected!");

    const clientId = Math.random().toString(36).substring(7);
    clients.set(clientId, ws);

    // Send the client their ID
    ws.send(JSON.stringify({ type: "id", id: clientId }));

    // Handle incoming messages
    ws.on("message", async (message) => {
        const data = JSON.parse(message.toString());

        if (data.type === "offer") {
            const session = Session.get(data.session_id) as Session;
            if (!session) {
                console.log(`Session ${data.session_id} not found`);
                ws.send(
                    JSON.stringify({
                        error: "Session not found",
                    })
                );
                return;
            }

            await WebRTCConnection.incomingOffer({
                session,
                ws,
                offer: data.offer,
            });
        }

        if (data.type === "reverseoffer") {
            console.log("Reverse offer");

            const session = Session.get(data.session_id) as Session;
            if (!session) {
                console.log(`Session ${data.session_id} not found`);
                ws.send(
                    JSON.stringify({
                        error: "Session not found",
                    })
                );
                return;
            }

            await WebRTCConnection.outgoingOffer({
                session,
                ws,
            });
        }
    });

    // Handle client disconnection
    ws.on("close", () => {
        console.log("A client disconnected.");
    });
});

let domain = `www.screenshare.net`; // Default domain
let hostaddress: string | undefined; // Host IP address

// Get the local IP address of the machine
const interfaces = os.networkInterfaces();
for (const iface of Object.values(interfaces)) {
    if (iface) {
        for (const config of iface) {
            if (config.family === "IPv4" && !config.internal) {
                hostaddress = config.address; // Set the host IP address
            }
        }
    }
}

const client_config_path = "./public/config.js"; // Path to the client configuration file

/**
 * Updates the API URL in the client configuration file.
 *
 * This function reads the content of the client configuration file,
 * replaces the existing API URL with the new URL provided, and then
 * writes the updated content back to the file.
 *
 * @param {string} newUrl - The new API URL to be set in the client configuration.
 * @throws {Error} If there is an issue reading or writing the configuration file.
 */
function updateApiUrl(newUrl: string) {
    let content = fs.readFileSync(client_config_path, "utf8"); // Read the file

    // Replace the existing API URL with the new URL
    content = content.replace(/"apiurl"\s*:\s*".*?"/, `"apiurl": "${newUrl}"`);

    fs.writeFileSync(client_config_path, content, "utf8"); // Write the updated content
}

// Resolve the domain and start the server
dns.lookup(domain, (err, address) => {
    if (err) {
        // Fallback to the local IP address or 'localhost' if the domain cannot be resolved
        domain = hostaddress ? hostaddress : "localhost";
    } else {
        if (hostaddress && hostaddress === address) {
            domain = "www.screenshare.net"; // Use the domain if it matches the local IP
        } else {
            domain = hostaddress ? hostaddress : "localhost"; // Fallback to the local IP or 'localhost'
        }
    }

    const url = `https://${domain}`; // Full URL for the server
    console.log(`Server will be listening at ${url}`);
    updateApiUrl(url); // Update the API URL in the client configuration

    // Start the HTTPS server

    server.listen(443, "0.0.0.0", () => {
        console.log("Server started");

        // Generate the initial host access code
        access_code = generateHostAccessCode();
        console.log(`Your access code is: "${access_code}"`);

        // Renew the access code every 60 seconds
        access_code_renewer = setInterval(() => {
            access_code = generateHostAccessCode();
            console.log(`Renewed access code: "${access_code}"`);
        }, 60000);

        // Open the server URL in the default browser
        if (process.platform === "win32") {
            exec(`start ${url}`); // Windows
        } else if (process.platform === "darwin") {
            exec(`open ${url}`); // macOS
        } else {
            exec(`xdg-open ${url}`); // Linux
        }
    });

    // Start the HTTP server to redirect to HTTPS
    http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
        res.writeHead(301, {
            Location: `https://${req.headers.host}${req.url}`,
        });
        res.end();
    }).listen(80, () => {
        console.log("Redirecting HTTP to HTTPS");
    });
});
