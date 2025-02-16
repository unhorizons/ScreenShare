import { RTCPeerConnection, RTCSessionDescription } from 'wrtc'; // WebRTC library
import { Session } from './database'; // Session model

/**
 * Interface for WebRTC connection options.
 */
interface WebRTCConnectionOptions {
    sdp: RTCSessionDescriptionInit; // Session Description Protocol (SDP) information
    type: string; // Type of connection ('broadcaster' or 'viewer')
}

/**
 * Represents a WebRTC connection.
 * This class handles the creation, management, and teardown of WebRTC connections.
 */
export class WebRTCConnection {
    /**
     * The RTCPeerConnection instance.
     */
    peer: RTCPeerConnection | null;

    /**
     * The MediaStream associated with the connection.
     */
    stream: MediaStream | undefined;

    /**
     * The session description protocol (SDP) information.
     */
    sdp: RTCSessionDescriptionInit;

    /**
     * The type of the connection, either 'broadcaster' or 'viewer'.
     */
    type: string;

    /**
     * Creates an instance of WebRTCConnection.
     * @param {WebRTCConnectionOptions} options - The options for the connection.
     */
    constructor({ sdp, type }: WebRTCConnectionOptions) {
        // Initialize the RTCPeerConnection with a STUN server
        this.peer = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.stunprotocol.org' }], // STUN server for NAT traversal
        });
        this.sdp = sdp; // Set the SDP
        this.type = type; // Set the connection type
    }

    /**
     * Opens the WebRTC connection.
     * @param {Session} session - The session associated with the connection.
     * @throws Will throw an error if the peer connection is not created.
     */
    async open(session: Session): Promise<void> {
        if (!this.peer) throw new Error('Peer connection not yet created');

        // Handle broadcaster-specific logic
        if (this.type === 'broadcaster') {
            session.broadcaster = this; // Set this connection as the broadcaster for the session

            // Set up the ontrack event handler to capture the MediaStream
            this.peer.ontrack = (e) => {
                this.stream = e.streams[0]; // Store the incoming MediaStream
            };
        }

        // Set the remote description using the provided SDP
        const desc = new RTCSessionDescription(this.sdp);
        await this.peer.setRemoteDescription(desc);

        // Handle viewer-specific logic
        if (this.type === 'viewer') {
            if (session.broadcaster?.stream) {
                // Add tracks from the broadcaster's stream to the viewer's connection
                session.broadcaster.stream.getTracks().forEach((track: MediaStreamTrack) => {
                    if (session.broadcaster?.stream) {
                        this.peer?.addTrack(track, session.broadcaster.stream);
                    }
                });
            }
        }

        // Create an answer and set it as the local description
        const answer = await this.peer.createAnswer();
        await this.peer.setLocalDescription(answer);
    }

    /**
     * Closes the WebRTC connection.
     * @throws Will throw an error if the peer connection is not created.
     */
    close() {
        if (!this.peer) throw new Error('Peer connection not yet created');

        // Remove all tracks from the connection
        this.peer.getSenders().forEach((sender) => {
            this.peer?.removeTrack(sender);
        });

        // Stop all transceivers
        this.peer.getTransceivers().forEach((transceiver) => transceiver.stop());

        // Close the peer connection
        this.peer.close();
        this.peer = null; // Reset the peer connection
    }
}