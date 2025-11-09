from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

app = FastAPI()

# Serve your HTML
app.mount("/", StaticFiles(directory="static", html=True), name="static")

# WebSocket connections
connections = {}

@app.websocket("/ws/{room}")
async def websocket_endpoint(websocket: WebSocket, room: str):
    await websocket.accept()
    if room not in connections:
        connections[room] = []
    connections[room].append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Broadcast to everyone in room
            for conn in connections[room]:
                if conn != websocket:
                    await conn.send_text(data)
    except Exception:
        connections[room].remove(websocket)
