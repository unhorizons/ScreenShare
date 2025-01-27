const webrtc = require('wrtc')



// peerConnection.oniceconnectionstatechange = () => {
//     console.log("ICE Connection State:", peerConnection.iceConnectionState);

//     if (peerConnection.iceConnectionState === "disconnected" || 
//         peerConnection.iceConnectionState === "failed" || 
//         peerConnection.iceConnectionState === "closed") {
//         console.log("Remote connection lost!");
//     }
// };

// peerConnection.onsignalingstatechange = () => {
//     console.log("Signaling State:", peerConnection.signalingState);
// };


// let reconnectTimeout;

// peerConnection.oniceconnectionstatechange = () => {
//     console.log("ICE Connection State:", peerConnection.iceConnectionState);

//     if (peerConnection.iceConnectionState === "disconnected") {
//         console.warn("Connection lost! Waiting to see if it recovers...");
        
//         reconnectTimeout = setTimeout(() => {
//             if (peerConnection.iceConnectionState === "disconnected") {
//                 console.error("Connection permanently lost!");
//                 peerConnection.close();
//             }
//         }, 30000); // Wait 30 seconds before assuming loss
//     } else if (peerConnection.iceConnectionState === "connected") {
//         clearTimeout(reconnectTimeout); // Clear the timeout if reconnected
//     }
// };

// peerConnection.onsignalingstatechange = () => {
//     console.log("Signaling State:", peerConnection.signalingState);
    
//     if (peerConnection.signalingState === "closed") {
//         console.log("Remote peer has closed the connection.");
//     }
// };


class WebRTCConnection{
    peer
    stream
    session

    constructor({session, sdp, type}){
        this.session = session
        this.sdp = sdp
        this.type = type
    }

    async open(){
        this.peer = new webrtc.RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.stunprotocol.org"
                }
            ]
        })
        
        if (this.type === 'broadcaster'){
            this.session.broadcaster = this
            this.peer.ontrack = (e) => {
                this.stream = e.streams[0]
            }
        }
        
        const desc = new webrtc.RTCSessionDescription(this.sdp)
        await this.peer.setRemoteDescription(desc)
    
        if (this.type === 'viewer'){
            this.session.broadcaster.stream.getTracks().forEach(track => this.peer.addTrack(track, this.session.broadcaster.stream))
        }
    
        const answer = await this.peer.createAnswer()
        await this.peer.setLocalDescription(answer)
    
    }

    close(){
        this.peer.getSenders().forEach(sender => this.peer.removeTrack(sender));
        this.peer.getTransceivers().forEach(transceiver => transceiver.stop());
        this.peer.close();
        this.peer = null;
    }
}

module.exports = {
    createPeer, WebRTCConnection
}