

class WebRTCConnection{
    peer
    stream
    session

    constructor({session, type, stream}){
        this.session = session
        this.type = type
        this.stream = stream
    }

    static async handleNegotiationNeededEvent({peer, session_id, type}){
        const offer = await peer.createOffer()
        await peer.setLocalDescription(offer)
        const payload = {
            sdp: peer.localDescription
        }
        
        let action
        if(type === 'broadcaster'){
            action = 'start-broadcast'
        }else if(type === 'viewer'){
            action = 'join-broadcast'
        }

        const { data } = await axios.post(`/sessions/${action}/${session_id}`, payload)

        const desc = new RTCSessionDescription(data.sdp)
        peer.setRemoteDescription(desc).catch(e => console.log(e))
    }


    async open(){
        this.peer = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.stunprotocol.org"
                }
            ]
        })
        
        this.peer.onnegotiationneeded = () => WebRTCConnection.handleNegotiationNeededEvent({peer : this.peer, session_id : this.session, type : this.type})

        if(this.type === 'broadcaster'){
            this.stream.getTracks().forEach(track => this.peer.addTrack(track, this.stream))
        }
        else if(this.type === 'viewer'){
            this.peer.ontrack = (e) => {
                document.getElementById('video').srcObject = e.streams[0]
                this.stream = e.streams[0]
            }
            this.peer.addTransceiver('video', { direction: "recvonly"})
        }
    }

    close(){
        this.peer.getSenders().forEach(sender => this.peer.removeTrack(sender));
        this.peer.getTransceivers().forEach(transceiver => transceiver.stop());
        this.peer.close();
        this.peer = null;
    }
}

module.exports = {
    WebRTCConnection
}
