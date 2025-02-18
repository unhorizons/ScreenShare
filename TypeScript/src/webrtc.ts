import {
    RTCPeerConnection,
    RTCSessionDescription,
    RTCIceCandidate,
} from "wrtc"; // WebRTC library
import { Session } from "./database"; // Session model
import { WebSocket, RawData } from "ws";

/**
 * Interface for WebRTC connection options.
 */
interface WebRTCConnectionOptions {
    sdp?: RTCSessionDescriptionInit; // Session Description Protocol (SDP) information
    type: string; // Type of connection ('broadcaster' or 'viewer')
    ws: WebSocket;
}

/**
 * Represents a WebRTC connection.
 * This class handles the creation, management, and teardown of WebRTC connections.
 */
export class WebRTCConnection {
    /**
     * The RTCPeerConnection instance.
     */
    peer: RTCPeerConnection | undefined;

    /**
     * The MediaStream associated with the connection.
     */
    stream: MediaStream | undefined;

    /**
     * The session description protocol (SDP) information.
     */
    sdp: RTCSessionDescriptionInit | undefined;

    /**
     * The type of the connection, either 'broadcaster' or 'viewer'.
     */
    type: string;

    ws: WebSocket;

    /**
     * Creates an instance of WebRTCConnection.
     * @param {WebRTCConnectionOptions} options - The options for the connection.
     */
    constructor({ sdp, type, ws }: WebRTCConnectionOptions) {
        this.sdp = sdp; // Set the SDP
        this.type = type; // Set the connection type
        this.ws = ws;
    }

    async _open_broadcaster(session: Session) {
        if (!this.sdp) {
            throw Error("No SDP received");
        }
        if (!this.peer) throw new Error("Peer connection not yet created");
        session.broadcaster = this; // Set this connection as the broadcaster for the session
        session.active = true;
        // Set up the ontrack event handler to capture the MediaStream
        this.peer.ontrack = (e) => {
            this.stream = e.streams[0]; // Store the incoming MediaStream
        };

        // Set the remote description using the provided SDP
        const desc = new RTCSessionDescription(this.sdp);
        await this.peer.setRemoteDescription(desc);

        // Create an answer and set it as the local description
        const answer = await this.peer.createAnswer();
        await this.peer.setLocalDescription(answer);

        this.ws.send(
            JSON.stringify({
                type: "answer",
                answer: this.peer.localDescription,
            })
        );
    }
    async _open_viewer(session: Session) {
        if (!this.peer) throw new Error("Peer connection not yet created");
        if (session.broadcaster?.stream) {
            // Add tracks from the broadcaster's stream to the viewer's connection
            session.broadcaster.stream
                .getTracks()
                .forEach((track: MediaStreamTrack) => {
                    if (session.broadcaster?.stream) {
                        console.log(track);
                        this.peer?.addTrack(track, session.broadcaster.stream);
                    }
                });
        }
        const offer = await this.peer.createOffer();
        await this.peer.setLocalDescription(offer);

        // Answer will be handled by the handleMessage callback when received by the socket

        this.ws.send(
            JSON.stringify({
                type: "offer",
                offer: this.peer.localDescription,
            })
        );
    }

    /**
     * Opens the WebRTC connection.
     * @param {Session} session - The session associated with the connection.
     * @throws Will throw an error if the peer connection is not created.
     */
    async open(session: Session): Promise<void> {
        // Initialize the RTCPeerConnection with a STUN server
        this.peer = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.stunprotocol.org" }], // STUN server for NAT traversal
        });
        this.peer.onicecandidate = (event) => {
            this.handleonicecandidate(event.candidate);
        };

        if (!this.peer) throw new Error("Peer connection not yet created");
        this.ws.on("message", async (msg: RawData) => {
            this.handleMessage(msg);
        });

        // Handle broadcaster-specific logic
        if (this.type === "broadcaster") {
            await this._open_broadcaster(session);
        }

        // Handle viewer-specific logic
        if (this.type === "viewer") {
            await this._open_viewer(session);
        }
    }

    /**
     * Closes the WebRTC connection.
     * @throws Will throw an error if the peer connection is not created.
     */
    close() {
        if (!this.peer) throw new Error("Peer connection not yet created");

        // Remove all tracks from the connection
        this.peer.getSenders().forEach((sender) => {
            this.peer?.removeTrack(sender);
        });

        // Stop all transceivers
        this.peer
            .getTransceivers()
            .forEach((transceiver) => transceiver.stop());

        // Close the peer connection
        this.peer.close();
        this.peer = undefined; // Reset the peer connection
    }

    async handleMessage(rawdata: RawData) {
        const data = JSON.parse(rawdata.toString());
        if (data.type === "candidate") {
            await this.peer?.addIceCandidate(
                new RTCIceCandidate(data.candidate)
            );
        }
        if (data.type === "answer") {
            if (this.type === "viewer") {
                // Set the remote description using the provided SDP
                const desc = new RTCSessionDescription(data.answer);
                await this.peer?.setRemoteDescription(desc);
            }
        }
    }

    handleonicecandidate(candidate: RTCIceCandidate | null) {
        if (candidate) {
            this.ws.send(
                JSON.stringify({ type: "candidate", candidate: candidate })
            );
        }
    }

    static async incomingOffer({ session, ws, offer }: OfferOptions) {
        if (!offer) {
            ws.send(
                JSON.stringify({
                    error: "Not sdp received",
                })
            );
            return;
        }

        const connection = new WebRTCConnection({
            sdp: offer,
            type: "broadcaster",
            ws,
        });
        await connection.open(session);
    }

    static async outgoingOffer({ session, ws }: OfferOptions) {
        const connection = new WebRTCConnection({
            type: "viewer",
            ws,
        });
        await connection.open(session);
    }
}

export interface OfferOptions {
    session: Session;
    ws: WebSocket;
    offer?: RTCSessionDescriptionInit;
}
