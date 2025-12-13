// Copyright 2025 chamster24   -   Licensed under the MIT License, see LICENSE file for details.

const incognitoBtn = document.getElementById("incognitoBtn");
const loginBtn = document.getElementById("loginBtn");
const loginPage = document.getElementById("loginPage");
const chatPage = document.getElementById("chatPage");
const chatPageInfo = document.getElementById("chatPageInfo");
const username = document.getElementById("username");
const roomCode = document.getElementById("roomCode");
const savedUsername = localStorage.getItem("username");
const savedRoomCode = localStorage.getItem("roomCode");
const chatInput = document.getElementById("chatInput");
const messageBox = document.getElementById("messageBox");
const charCount = document.getElementById("charCount");
let usernameConfirmed;
let roomCodeConfirmed;
let incognitoMode = 0;
let socket;
let loginStatus = 0;

//setup
if (savedUsername){ //fills field in with saved username
  username.value = savedUsername;
}
if (savedRoomCode){ //fills field in with saved room code
  roomCode.value = savedRoomCode;
}
else {
  roomCode.value = "general";
}

//Incognito check
incognitoBtn.addEventListener("click", () => { //maybe add icognito mode toggle localstorage?
  if (incognitoMode === 0){
    incognitoMode = 1;
    document.title = "Untitled Document"
    incognitoBtn.textContent = "✅ Incognito Mode"

    const rand = Math.floor(Math.random() * 4) + 1; //Change favicon to a random logo
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = `assets/favicon-i${rand}.png`;
    
  } else {
    incognitoMode = 0;
    document.title = "IntrAChat"
    incognitoBtn.textContent = "❌ Incognito Mode"
    let link = document.querySelector("link[rel~='icon']");
    link.href = `assets/favicon.png`;
  }
});

//save info for username and room code fields
username.addEventListener("input", () => {
  localStorage.setItem("username", username.value);
});
roomCode.addEventListener("input", () => {
  localStorage.setItem("roomCode", roomCode.value);
});

//Login script
loginBtn.addEventListener("click", () => {
  const usernameCheck = /^[a-zA-Z0-9_-]+$/;
  const roomCodeCheck = /^[a-zA-Z0-9]+$/;
  const over13Chb = document.getElementById("over13Chb");
  const touChb = document.getElementById("PPandTOUchb");
  if (username.value === "" || roomCode.value === ""){
    alert("Please fill in both fields to login!");
  } else if (username.value.length > 16 || roomCode.value.length > 10){
    alert("Username must be 16 characters or fewer and Room Code must be 10 characters or fewer!");
  } else if (!usernameCheck.test(username.value)) {
    alert("Username can only contain letters, numbers, underscores (_) and hyphens (-). No spaces!");
  } else if (!roomCodeCheck.test(roomCode.value)) {
    alert("Room Code can only contain letters and numbers. No spaces!");
  } else if (!over13Chb.checked) {
    alert("You must agree that you are over 13 to use this service.");
  } else if (!touChb.checked) {
    alert("You must agree to the Terms of Use and Privacy Policy to use this service.")
  } else { //all ok
    loginPage.style.display = "none";
    chatPage.style.display = "block";
    loginStatus = 1;
    usernameConfirmed = username.value.trim();
    roomCodeConfirmed = roomCode.value.toLowerCase();
    if (incognitoMode != 1){
      document.title = "IntrAChat - " + roomCodeConfirmed;
    }
    socket = new WebSocket(`wss://intra-chat.onrender.com/ws/${roomCodeConfirmed}`); //connect to websocket
    socket.addEventListener("open", () => {
      console.log("Connected to server!");
      // Tell the server which room & username
      socket.send(JSON.stringify({
      type: "join",
      username: usernameConfirmed,
      room: roomCodeConfirmed
    }));
    });
    socket.addEventListener("message", (JSONmsg) => {
      const msg = JSON.parse(JSONmsg.data);
      if (msg.type === "message") {
        displayMessage(msg.username, msg.message, msg.timestamp);
      }
    });

    chatPageInfo.innerHTML = "IntrAChat - <i>" + usernameConfirmed + "</i> - Room " + roomCodeConfirmed; //TOEDIT - this needs to be changed to a signal sent from server confirming entered chatroom

  }  
});

//send msg fct
function sendMsg() {
  if (chatInput.value.trim() === "") { //Handles empty lines
    return;
  }
  let msgObj = {}
  msgObj["type"] = "message"
  msgObj["message"] = chatInput.value.trim();
  socket.send(JSON.stringify(msgObj));
  console.log(JSON.stringify(msgObj));
  chatInput.value = ""

  charCount.textContent = `0 / 500`; // reset charcount
  charCount.style.color = "inherit";
}

//chatbox fct
chatInput.addEventListener("keydown", (keyPressed) => {
  if (keyPressed.key === "Enter") { // disabled newlines
    //if (keyPressed.shiftKey) {
      // shift + enter for newline
      //const start = chatInput.selectionStart;
      //const end = chatInput.selectionEnd;
      //chatInput.value = chatInput.value.substring(0, start) + "\n" + chatInput.value.substring(end);
      //chatInput.selectionStart = chatInput.selectionEnd = start + 1;
      //keyPressed.preventDefault();
    //} else {
      // enter to send msg
      keyPressed.preventDefault();
      
      sendMsg()
    //}
  }
});

function displayMessage(user, content, time) {
  const msgDiv = document.createElement("div");
  const timestamp = new Date(time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  const infoSpan = document.createElement("span"); //trusted header
  infoSpan.innerHTML = `<b>[${timestamp}] ${user}:</b> `;
  const contentSpan = document.createElement("span"); //untrusted content
  contentSpan.textContent = content;
  msgDiv.appendChild(infoSpan); //assemble msg
  msgDiv.appendChild(contentSpan);
  
  messageBox.appendChild(msgDiv); // put it in to the message box
  messageBox.scrollTop = messageBox.scrollHeight; // auto-scroll to bottom
}

// Character Limit Counter
const MAX_CHARS = 500;
chatInput.addEventListener("input", () => {
  const currentLength = chatInput.value.length;
  charCount.textContent = `${currentLength} / ${MAX_CHARS}`;

//Change color if near the limit
if (currentLength >= MAX_CHARS) {
    charCount.style.color = "red";
} else if (currentLength >= MAX_CHARS * 0.9) {
    charCount.style.color = "orange";
} else {
  charCount.style.color = "inherit";
}
});

document.addEventListener('DOMContentLoaded', () => { //Version Management
const versionElement = document.getElementById('version');
try {
  if (versionElement) {
    versionElement.textContent = "Loading...";
      // Fetch the version.txt file from the static asset path
      fetch('/version.txt')
          .then(response => {
              // Check if the HTTP request was successful (status 200)
              if (!response.ok) {
                  // If file not found (404), throw a controlled error
                  throw new Error(`HTTP Error! Status: ${response.status}`);
              }
              return response.text();
          })
          .then(version => {
              versionElement.textContent = version.trim();
          })
          .catch(error => {
            // Catch network errors, file not found errors, etc.
            console.error("Failed to load application version:", error.message);
            versionElement.textContent = "N/A"; // Display 'N/A' when it fails
          });
    }
    } catch (globalError) {
        // Catch any unexpected synchronous errors during script execution
        console.error("A critical error occurred during version script execution:", globalError);
        if (versionElement) {
            versionElement.textContent = "Error";
        }
}
});
