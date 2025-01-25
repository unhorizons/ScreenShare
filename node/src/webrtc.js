const webrtc = require('wrtc')

let broadcast
let broadcaster


async function createPeer(type, sdp){
    const peer = new webrtc.RTCPeerConnection({
        iceServers: [
            {
                urls: "stun:stun.stunprotocol.org"
            }
        ]
    })

    if (type === 'broadcaster'){
        peer.ontrack = (e, peer) => {
            broadcast = e.streams[0]
            broadcaster = peer
        }
    }
    
    const desc = new webrtc.RTCSessionDescription(sdp)
    await peer.setRemoteDescription(desc)

    if (type === 'viewer'){
        broadcast.getTracks().forEach(track => peer.addTrack(track, broadcast))
    }

    const answer = await peer.createAnswer()
    await peer.setLocalDescription(answer)

    return peer
}



module.exports = {
    broadcaster, createPeer
}