const webrtc = require('wrtc')


async function createPeer({type, sdp, session}){
    const peer = new webrtc.RTCPeerConnection({
        iceServers: [
            {
                urls: "stun:stun.stunprotocol.org"
            }
        ]
    })

    session.broadcaster = peer
    
    if (type === 'broadcaster'){
        peer.ontrack = (e, peer) => {
            session.broadcast = e.streams[0]
        }
    }
    
    const desc = new webrtc.RTCSessionDescription(sdp)
    await peer.setRemoteDescription(desc)

    if (type === 'viewer'){
        session.broadcast.getTracks().forEach(track => peer.addTrack(track, session.broadcast))
    }

    const answer = await peer.createAnswer()
    await peer.setLocalDescription(answer)

    return peer
}



module.exports = {
    createPeer
}