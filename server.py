from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.websockets import WebSocketDisconnect
import json
from datetime import datetime, timezone

app = FastAPI()

# Basic Room Hosting
connections = [] #temp connections list
rooms = {}
@app.websocket("/ws/{room}")

async def websocket_endpoint(websocket: WebSocket, room: str):
    await websocket.accept()
    connections.append(websocket)
    try:
        while True: #manage messages 
            jsonMsg = await websocket.receive_text()
            msg = json.loads(jsonMsg)
            
            if msg["type"] == "join": #actual join message

                if msg["room"] in rooms: #checks for dupe username SCRIPT
                    existing_usernames_lower = {name.lower() for name in rooms[msg["room"]].keys()}
                    if msg["username"].lower() in existing_usernames_lower: #checks for username in a EXISTING room
                        try:
                            await websocket.send_text(json.dumps({
                                "type": "message", 
                                "username": "*system", 
                                "message": "It seems like someone with the same username as you is in this room as well. As such, we are disconnecting you from this room to avoid identification errors.", 
                                "room": str(msg["room"]),
                                "timestamp": datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
                            }))   
                        except:
                            pass
                        if websocket in connections:
                            connections.remove(websocket)
                        try:
                            await websocket.close()
                        except Exception:
                            pass
                            
                    else:
                        pass #room dosnt contain user
                if not msg["room"] in rooms: #create a new room
                    rooms[msg["room"]] = {}
                rooms[msg["room"]][msg["username"]] = websocket
                if websocket in connections:
                    connections.remove(websocket)
                for sock in rooms.get(msg["room"], {}).values(): #broadcasts join msg
                    try:
                        await sock.send_text(json.dumps({
                            "type": "message",
                            "username": "*system",
                            "message": f"{msg["username"]} joined the room.",
                            "room": msg["room"],
                            "timestamp": datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
                            }))
                    except Exception:
                        pass
                    
            elif msg["type"] == "message":
                if not str(msg["message"]).startswith("/"): #handles messages
                    for sock in rooms.get(msg["room"], {}).values():
                        await sock.send_text(json.dumps(msg))
                        
                else: #handles commands
                    for username, sock in rooms.get(msg["room"], {}).items():
                        if username == msg["username"]:
                            await sock.send_text(json.dumps({
                                "type": "message",
                                "username": "*system",
                                "message": "Sorry, but we currently do NOT handle commands.",
                                "room": msg["room"],
                                "timestamp": datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
                            }))

            else: #handles other messages
                pass
                
    except (Exception, WebSocketDisconnect):
        try:
            await websocket.send_text(json.dumps({
                "type": "message", 
                "username": "*system", 
                "message": "An error occured. We're trying to disconnect you from the server...", 
                "room": msg["room"],
                "timestamp": datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
            }))
        except:
            pass

        # remove from temp list
        if websocket in connections:
            connections.remove(websocket)

        user_disconnected = None
        socket_disconnected = None
        for room, users in rooms.items():
            for username, sock in users.items():
                if sock == websocket:
                    user_disconnected = username
                    room_disconnected = room
                    del rooms[room_disconnected][username]
                    break
            if user_disconnected:
                break
                
        if user_disconnected and room_disconnected:
            exit_message = {
                "type": "message",
                "username": "*system",
                "message": f"{user_disconnected} has left the room.",
                "room": room_disconnected,
                "timestamp": datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
            }

            if room_disconnected in rooms:
                for sock in rooms[room_disconnected].values():
                    try:
                        await sock.send_text(json.dumps(exit_message))
                    except Exception:
                        pass
            if not rooms[room_disconnected]:
                del rooms[room_disconnected]

    finally:
        try:
            await websocket.close()
        except Exception:
            pass


app.mount("/", StaticFiles(directory="static", html=True), name="static") #LAST PART FOR SERVING STATIC FILES
