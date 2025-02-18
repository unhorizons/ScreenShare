import axios from "axios";

const apiurl = window.APP_CONFIG.apiurl;
// const apiurl = "https://www.screenshare.net"

export const api = axios.create({
    baseURL: apiurl, // Replace with your API URL
});

export class WebRTCConnection {
    peer;
    stream;
    session;

    constructor({ session, type, stream }) {
        this.session = session;
        this.type = type;
        this.stream = stream;
    }

    static async handleNegotiationNeededEvent({ peer, session_id, type }) {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        const payload = {
            sdp: peer.localDescription,
        };

        let action;
        if (type === "broadcaster") {
            action = "start-broadcast";
        } else if (type === "viewer") {
            action = "join-broadcast";
        }

        const { data } = await api.post(
            `/sessions/${action}/${session_id}`,
            payload
        );

        const desc = new RTCSessionDescription(data.sdp);
        peer.setRemoteDescription(desc).catch((e) => console.log(e));
    }

    async open() {
        this.peer = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.stunprotocol.org",
                },
            ],
        });

        this.peer.onnegotiationneeded = () =>
            WebRTCConnection.handleNegotiationNeededEvent({
                peer: this.peer,
                session_id: this.session,
                type: this.type,
            });

        if (this.type === "broadcaster") {
            this.stream
                .getTracks()
                .forEach((track) => this.peer.addTrack(track, this.stream));
        } else if (this.type === "viewer") {
            this.peer.ontrack = async (e) => {
                document.getElementById("video").srcObject = e.streams[0];
                this.stream = e.streams[0];
            };
            this.peer.addTransceiver("video", { direction: "recvonly" });
        }
    }

    async close() {
        const { data } = await api.post(
            `/sessions/end-broadcast/${this.session}`,
            {}
        );

        if (!data) {
            throw { msg: "Something went wrong", type: "error" };
        }

        this.peer
            .getSenders()
            .forEach((sender) => this.peer.removeTrack(sender));
        this.peer
            .getTransceivers()
            .forEach((transceiver) => transceiver.stop());
        this.peer.close();
        this.peer = null;

        return { msg: data.detail, type: "success" };
    }
}

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
        this.ws.send(
            JSON.stringify({
                type: "close",
                session_id: this.session,
            })
        );

        return Promise((resolve, reject) => {
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
        });
    }

    open() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(`${apiurl.replace("https", "wss")}`);
            this.client_id;

            // Handle WebSocket messages
            this.ws.onmessage = (event) => {
                const message = JSON.parse(event.data);

                if (message.type === "id") {
                    this.client_id = message.id;
                    console.log("My ID:", this.client_id);
                } else if (message.type === "offer") {
                    this.handleOffer(message.offer);
                } else if (message.type === "answer") {
                    this.handleAnswer(message.answer);
                } else if (message.type === "candidate") {
                    this.handleCandidate(message.candidate);
                }
            };

            this.ws.onopen = () => {
                console.log("WebSocket connection established");
                resolve(this); // Resolve the promise with the WebSocket instance
            };

            this.ws.onerror = (error) => {
                console.error("WebSocket connection error:", error);
                reject(error); // Reject the promise if there's an error
            };

            this.ws.onclose = () => {
                console.log("WebSocket connection closed");
            };
        });
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
                type: "offer",
                session_id: this.session,
                offer: this.peer.localDescription,
            })
        );
    }
    async joinBroadcast() {
        await this.createPeerConnection();

        this.ws.send(
            JSON.stringify({
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
                type: "answer",
                answer: this.peer.localDescription,
            })
        );
    }
}

export const utils = {
    api: api,
    WebRTCConnection: WebRTCConnection,
    WebRTCConnectionSocket: WebRTCConnectionSocket,

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
