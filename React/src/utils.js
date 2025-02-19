import axios from "axios";

const apiurl = window.APP_CONFIG.apiurl;
// const apiurl = "https://www.screenshare.net"

export const api = axios.create({
    baseURL: apiurl, // Replace with your API URL
});

export class WebRTCConnectionSocket {
    peer;
    stream;
    session;
    ws;
    client_id;

    constructor({ session, type, stream }) {
        this.session = session;
        this.type = type;
        this.stream = stream;
    }

    close() {
        return new Promise((resolve, reject) => {
            this.ws.on("message", (event) => {
                const msg = JSON.parse(event.data);
                if (msg.type === "closed") {
                    this.peer
                        .getSenders()
                        .forEach((sender) => this.peer.removeTrack(sender));
                    this.peer
                        .getTransceivers()
                        .forEach((transceiver) => transceiver.stop());
                    this.peer.close();
                    this.peer = null;

                    resolve({
                        msg: "Session ended successfully",
                        type: "success",
                    });
                }
                if (msg.type === "not-closed") {
                    reject({
                        msg: "Something went wrong : Unable to end the session",
                        type: "error",
                    });
                }
            });
            this.ws.send(
                JSON.stringify({
                    client_id: this.client_id,
                    type: "close",
                    session_id: this.session,
                })
            );
        });
    }

    open(ws, client_id) {
        this.client_id = client_id;
        this.ws = ws;

        // Handle WebSocket messages
        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);

            if (message.type === "offer") {
                this.handleOffer(message.offer);
            } else if (message.type === "answer") {
                this.handleAnswer(message.answer);
            } else if (message.type === "candidate") {
                this.handleCandidate(message.candidate);
            } else if (message.type === "reverseoffer") {
                this.handleReverseOffer();
            }
        };
    }
    async startBroadcast() {
        await this.createPeerConnection();

        this.stream
            .getTracks()
            .forEach((track) => this.peer.addTrack(track, this.stream));

        const offer = await this.peer.createOffer();
        await this.peer.setLocalDescription(offer);

        this.ws.send(
            JSON.stringify({
                client_id: this.client_id,
                type: "offer",
                session_id: this.session,
                offer: this.peer.localDescription,
            })
        );
    }
    async handleReverseOffer() {
        await this.createPeerConnection();

        this.stream
            .getTracks()
            .forEach((track) => this.peer.addTrack(track, this.stream));

        const offer = await this.peer.createOffer();
        await this.peer.setLocalDescription(offer);

        this.ws.send(
            JSON.stringify({
                client_id: this.client_id,
                type: "direct-offer",
                session_id: this.session,
                offer: this.peer.localDescription,
            })
        );
    }
    async joinBroadcast() {
        await this.createPeerConnection();

        this.ws.send(
            JSON.stringify({
                client_id: this.client_id,
                type: "reverseoffer",
                session_id: this.session,
            })
        );
    }

    // Create a peer connection
    async createPeerConnection() {
        this.peer = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.stunprotocol.org" }],
        });

        // Handle ICE candidates
        this.peer.onicecandidate = (event) => {
            if (event.candidate) {
                this.ws.send(
                    JSON.stringify({
                        client_id: this.client_id,
                        type: "candidate",
                        candidate: event.candidate,
                    })
                );
            }
        };

        // Monitor connection state
        this.peer.onconnectionstatechange = () => {
            console.log("Connection state:", this.peer.connectionState);
            if (this.peer.connectionState === "connected") {
                console.log("WebRTC connection is working!");
            }
        };

        // Monitor ICE connection state
        this.peer.oniceconnectionstatechange = () => {
            console.log("ICE connection state:", this.peer.iceConnectionState);
            if (this.peer.iceConnectionState === "connected") {
                console.log("ICE connection is working!");
            }
        };
    }

    // Handle incoming answer
    async handleAnswer(answer) {
        console.log(answer);
        await this.peer.setRemoteDescription(new RTCSessionDescription(answer));
    }
    // Handle incoming ICE candidate
    async handleCandidate(candidate) {
        console.log(candidate);
        if (candidate) {
            try {
                await this.peer.addIceCandidate(new RTCIceCandidate(candidate));
            } catch {
                console.log("A candidate failed to be set");
            }
        }
    }

    // Handle incoming offer
    async handleOffer(offer) {
        await this.createPeerConnection();

        // Handle remote stream
        this.peer.ontrack = (event) => {
            const video = document.getElementById("video");
            video.srcObject = event.streams[0];
        };

        await this.peer.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await this.peer.createAnswer();
        await this.peer.setLocalDescription(answer);

        this.ws.send(
            JSON.stringify({
                client_id: this.client_id,
                type: "answer",
                answer: this.peer.localDescription,
            })
        );
    }
}

export const utils = {
    api,
    WebRTCConnectionSocket,
    // createWebSocket,

    get sessionID() {
        return localStorage.getItem("session_id");
    },
    set sessionID(session_id) {
        localStorage.setItem("session_id", session_id);
    },
    get token() {
        return localStorage.getItem("jwt");
    },
    set token(token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        localStorage.setItem("jwt", token);
    },
    get apiurl() {
        return apiurl;
    },
};

utils.token = localStorage.getItem("jwt");

export const createWebSocket = async () => {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(
            `${apiurl.replace("https", "wss")}?token=${utils.token}`
        );

        // TODO: Remove single time event handlers

        // Handle WebSocket messages
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);

            if (message.type === "id") {
                console.log("My ID:", message.id);
                resolve({ ws, id: message.id }); // Resolve the promise with the WebSocket instance
            }

            if (message.type === "authentication-error") {
                console.log();
                reject(message.error);
            }
        };

        ws.onopen = () => {
            console.log("WebSocket connection established");
        };

        ws.onerror = (error) => {
            console.error("WebSocket connection error:", error);
            reject(error); // Reject the promise if there's an error
        };

        ws.onclose = () => {
            console.log("WebSocket connection closed");
        };
    });
};
