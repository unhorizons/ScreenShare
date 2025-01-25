from flask import Flask, request, jsonify
from aiortc import RTCPeerConnection, RTCSessionDescription
import asyncio

app = Flask(__name__)
sender_stream = None

async def handle_track_event(track):
    global sender_stream
    sender_stream = track

@app.route('/consumer', methods=['POST'])
def consumer():
    global sender_stream
    peer = RTCPeerConnection()
    peer.add_ice_candidate({'urls': 'stun:stun.stunprotocol.org'})

    body = request.get_json()
    desc = RTCSessionDescription(body['sdp'], type='offer')

    async def process():
        await peer.setRemoteDescription(desc)
        if sender_stream:
            for track in sender_stream:
                peer.addTrack(track)
        answer = await peer.createAnswer()
        await peer.setLocalDescription(answer)
        return jsonify({'sdp': peer.localDescription.sdp})
    
    return asyncio.run(process())

@app.route('/broadcast', methods=['POST'])
def broadcast():
    peer = RTCPeerConnection()
    peer.add_ice_candidate({'urls': 'stun:stun.stunprotocol.org'})
    
    body = request.get_json()
    desc = RTCSessionDescription(body['sdp'], type='offer')
    
    async def process():
        peer.ontrack = lambda track: asyncio.create_task(handle_track_event(track))
        await peer.setRemoteDescription(desc)
        answer = await peer.createAnswer()
        await peer.setLocalDescription(answer)
        return jsonify({'sdp': peer.localDescription.sdp})
    
    return asyncio.run(process())

if __name__ == '__main__':
    app.run(port=5000)
