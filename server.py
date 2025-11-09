from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# Serve your HTML/JS/CSS
app.mount("/", StaticFiles(directory="static", html=True), name="static")

### ABOVE WAS TO HOST SERVER

connections = []  # store connections temporarily

@app.websocket("/ws/{room}")
async def websocket_endpoint(websocket: WebSocket, room: str):
    await websocket.accept()
    connections.append(websocket)
    try:
        while True:
            # just receive messages without doing anything
            await websocket.receive_text()
    except Exception:
        connections.remove(websocket)
