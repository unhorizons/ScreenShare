
import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } from 'wrtc'
import { Session } from './database'

interface WebRTCConnectionOptions{
    sdp : RTCSessionDescriptionInit,
    type : string
}

export class WebRTCConnection{
    peer : RTCPeerConnection | null
    stream : MediaStream | undefined
    sdp : RTCSessionDescriptionInit
    type : string

    constructor({sdp, type} : WebRTCConnectionOptions){
        this.peer = new RTCPeerConnection({
            iceServers: [{urls: "stun:stun.stunprotocol.org"}]
        })
        this.sdp = sdp
        this.type = type
    }

    async open(session : Session){
        if(!this.peer) throw Error("Peer connection not yet created")
        
            if (this.type === 'broadcaster'){
            session.broadcaster = this
            this.peer.ontrack = (e) => {
                this.stream = e.streams[0]
            }
        }
        
        const desc = new RTCSessionDescription(this.sdp)
        await this.peer.setRemoteDescription(desc)
    
        if (this.type === 'viewer'){
            if(session.broadcaster?.stream){
                session.broadcaster.stream.getTracks().forEach(
                    (track: MediaStreamTrack) => {
                        if(session.broadcaster?.stream)
                            this.peer?.addTrack(track, session.broadcaster.stream)
                    }
                )
            }
        }
    
        const answer = await this.peer.createAnswer()
        await this.peer.setLocalDescription(answer)
    
    }

    close(){
        if(!this.peer) throw Error("Peer connection not yet created")
        this.peer.getSenders().forEach((sender) => {this.peer?.removeTrack(sender)});
        this.peer.getTransceivers().forEach(transceiver => transceiver.stop());
        this.peer.close();
        this.peer = null;
    }
}
