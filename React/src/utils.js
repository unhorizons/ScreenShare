import axios from "axios";

const apiurl = "https://192.168.1.100"

export const api = axios.create({
    baseURL: apiurl, // Replace with your API URL
});


export class WebRTCConnection{
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

        const { data } = await api.post(`/sessions/${action}/${session_id}`, payload)

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

    async close(){

        const {data} = await api.post(`/sessions/end-broadcast/${this.session}`, {})
        
        if (!data) {
            throw ({msg : 'Something went wrong', type : 'error'})
        }

        this.peer.getSenders().forEach(sender => this.peer.removeTrack(sender));
        this.peer.getTransceivers().forEach(transceiver => transceiver.stop());
        this.peer.close();
        this.peer = null;

        return  {msg : data.detail, type : 'success'}
    }
}



export const utils = {
    api : api,
    WebRTCConnection : WebRTCConnection,

    get sessionID(){
        return localStorage.getItem('session_id')
    },
    set sessionID(session_id){
        localStorage.setItem('session_id', session_id)
    },
    get token(){
        return localStorage.getItem('jwt')
    },
    set token(token){
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        localStorage.setItem('jwt', token)
    },
    get apiurl(){
        return apiurl
    }
}

utils.token = localStorage.getItem('jwt')