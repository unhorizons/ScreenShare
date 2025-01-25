window.onload = () => {
    document.getElementById('my-button').onclick = () => {
        init()
    }
}

async function init(){
    const stream = await navigator.mediaDevices.getDisplayMedia({
         video: { 
            cursor: "always",
            frameRate : { ideal : 15, max : 30 },
            width: { ideal : 1280, max : 1920 },
            height: { ideal : 720, max : 1080 },
            resizeMode: 'crop-and-scale'
        } 
    })

    document.getElementById('video').srcObject = stream
    const peer = createPeer()

    stream.getTracks().forEach(track => peer.addTrack(track, stream))
}

function createPeer(){
    const peer = new RTCPeerConnection({
        iceServers : [
            {
                urls: "stun:stun.stunprotocol.org"
            }
        ]
    })
    peer.onnegotiationneeded = () => handleNegotiationNeededEvent(peer)

    return peer
}

async function handleNegotiationNeededEvent(peer) {
    const offer = await peer.createOffer()
    await peer.setLocalDescription(offer)
    const payload = {
        sdp: peer.localDescription
    }

    const { data } = await axios.post('/broadcast', payload)
    const desc = new RTCSessionDescription(data.sdp)
    peer.setRemoteDescription(desc).catch(e => console.log(e))
}