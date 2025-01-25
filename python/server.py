
import os
import asyncio

from contextlib import asynccontextmanager
import traceback
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request, Depends, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from typing import Set
from pydantic import BaseModel

from db import database, users, sessions
from ffmpeg_wrapper import ffmpeg
from pipe import Pipe



scale = (864, 486,)

pipe = Pipe('ffmpeg_pipe')
capture = ffmpeg(scale)
active_connections: Set[WebSocket] = set()



async def connect(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)

def disconnect(websocket: WebSocket):
    active_connections.discard(websocket)

async def broadcast_frame(frame: bytes):
    to_remove = []
    for connection in active_connections:
        try:
            asyncio.create_task(connection.send_bytes(frame)) # Schedule this
        except Exception:
            to_remove.append(connection)
    
    # Remove failed connections
    for connection in to_remove:
        disconnect(connection)


# async def generate_frames():
#     FRAME_SIZE = int(scale[0] * scale[1] * 3)
#     while True:
#         await asyncio.sleep(1 / 30)  # 30 FPS
#         if not pipe.opened:
#             continue
#         frame = pipe.read(FRAME_SIZE)
#         if not frame:
#             continue
#         asyncio.create_task(broadcast_frame(frame))

async def generate_frames():
    buffer = bytearray()
    FRAME_SIZE = int(scale[0] * scale[1] * 3)
    while True:
        await asyncio.sleep(1 / 30)  # 30 FPS
        if not pipe.opened:
            continue
        # frame = pipe.read(FRAME_SIZE)
        buffer.extend(pipe.read(165536))
        while True:
            frame_start = buffer.find(b'\xff\xd8')  # JPEG start marker
            frame_end = buffer.find(b'\xff\xd9')   # JPEG end marker

            if frame_start != -1 and frame_end != -1 and frame_end > frame_start:
                frame_end += 2  # Include the end marker
                frame = buffer[frame_start:frame_end]  # Extract the frame
                del buffer[:frame_end]  # Remove processed frame from the buffer
                
                asyncio.create_task(
                    broadcast_frame(
                        frame
                    )
                )
                
            else:
                # Incomplete frame, return control
                break

        # if not frame:
        #     continue
        # asyncio.create_task(broadcast_frame(frame))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await database.connect()

    asyncio.create_task(generate_frames())

    yield
    
    # Shutdow
    await database.disconnect()
    pipe.close()
    # Remove connections
    for connection in active_connections:
        disconnect(connection)
    

    
app = FastAPI(lifespan=lifespan)
app.mount("/ui/", StaticFiles(directory=os.path.abspath("ui"), html=True), name="ui")





# Web socket for frame update
@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await connect(websocket)
    try:
        while True:
            await websocket.receive_text()  # Keep connection alive
    except WebSocketDisconnect:
        disconnect(websocket)





# Define Pydantic models for request validation
class SessionCreate(BaseModel):
    workshop: str | None = None
    lead: str | None = None
    active: bool | None = None

class User(BaseModel):
    username : str


@app.api_route("/sessions", methods=["GET", "POST"])
@app.api_route("/sessions/{session_id}", methods=["GET", "PUT"])
async def manage_sessions(
    request: Request, 
    session_id: int = None, 
    session: SessionCreate = None
):
    """
    Handles multiple session operations:
    - GET /sessions          → List all active sessions
    - GET /sessions/{id}     → Get details of a specific session
    - POST /sessions         → Create a new session
    - PUT /sessions/{id}     → Start a session
    """


    if request.method == "GET":
        if session_id is None:  
            # Fetch all active sessions
            query = sessions.select().where(sessions.c.active == True)
            return await database.fetch_all(query)
        else:  
            # Fetch a specific session
            query = sessions.select().where(sessions.c.id == session_id)
            session = await database.fetch_one(query)
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")

            # Fetch users in the session
            query = users.select().where(users.c.session_id == session_id)
            session = dict(session)
            session["users"] = await database.fetch_all(query)
            return session

    elif request.method == "POST":  
        # Create a new session
        query = sessions.insert().values(
            workshop=session.workshop,
            lead=session.lead
        )
        
        try:
            session_id = await database.execute(query)
            return {
                "session_id": session_id,
                "workshop": session.workshop,
                "lead": session.lead
            }
        except Exception:
            traceback.print_exc()
            raise HTTPException(status_code=500, detail="Failed to create a session")

    elif request.method == "PUT": 
        if session_id is None:
            raise HTTPException(status_code=400, detail="Session ID required")

        if session.active == True: # Start a session
            try:
                
                capture.start()
                pipe.open()  # Start the frame piping process
                print("Opened")

            except Exception:
                traceback.print_exc()
                raise HTTPException(status_code=500, detail="Unable to start frame piping")

            query = sessions.update().where(sessions.c.id == session_id).values(active=True)

            try:
                result = await database.execute(query)
                if result == 0:
                    
                    pipe.close()
                    
                    raise HTTPException(status_code=404, detail="Session not found")
                return {"message": "Session started successfully"}
            except Exception:
                pipe.close()
                traceback.print_exc()
                raise HTTPException(status_code=500, detail="Failed to start a session")
        elif session.active == False: # End session
            
            query = sessions.update().where(sessions.c.id == session_id).values(active=False)
            try:
                result = await database.execute(query)
            except Exception:
                traceback.print_exc()
                raise HTTPException(status_code=500, detail="Unable to end session")
            pipe.close()
            return {"message": "Session ended successfully"}


# Join a session
@app.post("/join_session/{session_id}")
async def join_session(session_id: int, user : User):

    # Get the session or raise an exception
    query = sessions.select().where(sessions.c.id == session_id)
    session = await database.fetch_one(query)

    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    # Add user to the session
    query = users.insert().values(
        username = user.username,
        session_id = session_id
    )
    try:
        user_id = await database.execute(query)
        return {
            "id" : user_id,
            "username" : user.username,
            "workshop" : session['workshop'],
            "lead" : session['lead']
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to create a session")
