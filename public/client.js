const join = document.getElementById("join")
const leave = document.getElementById("leave")
const nameField = document.getElementById("name-input")
const playerList = document.getElementById("player-list-wrapper")
const chatInput = document.getElementById("chat-input")
const sendChat = document.getElementById("send-chat")
const chat = document.getElementById("chat")
const chatWrapper = document.getElementById("chat-wrapper")

let socket = io("http://localhost:5000")
//let socket = io("http://grams.ddns.net")

let inGame = false
let messageCount = 0

let isAlphanumeric = (str) => {
    return /^[a-zA-Z0-9]+$/.test(str)
}

const joinGame = () => {
    const name = nameField.value
    if (name.length > 0 && isAlphanumeric(name) && !inGame) {
        socket.emit("requestJoin", {
            name: nameField.value
        })
    }
}

join.addEventListener("click", () => {
    joinGame()
})

leave.addEventListener("click", () => {
    socket.emit("leave", {
        name: nameField.value
    })
    join.disabled = false
    leave.disabled = true
    nameField.disabled = false
    inGame = false
})

document.addEventListener("keydown", (evt) => {
    if (evt.keyCode == 13) {
        if (chatInput == document.activeElement) {
            sendMessage()
        }
        else if (nameField == document.activeElement) {
            joinGame()
        }
    }
})

const sendMessage = () => {
    const name = nameField.value
    const message = chatInput.value
    messageCount += 1
    if (message.length > 0) {
        socket.emit("chatSent", {
            sender: name,
            message: message
        })
        chat.innerHTML += `
            <p id="message-${messageCount}">
                <span class="my-message">${name}: </span>
                <span class="chat-message">${message}</span>
            </p>
        `
        chatInput.value = ""
        document.getElementById(`message-${messageCount}`).scrollIntoView()
    } 
}

sendChat.addEventListener("click", sendMessage)

socket.on("newMessage", (data) => {
    const sender = data.sender
    const message = data.message
    messageCount += 1
    if (sender == "Server") {
        chat.innerHTML += `
            <p id="message-${messageCount}">
                <span class="server-message ${data.type}">${message}</span>
            </p>
        `
    }
    else {
        chat.innerHTML += `
            <p id="message-${messageCount}">
                <span class="chat">${sender}: </span>
                <span class="chat-message">${message}</span>
            </p>
        `
    }
    document.getElementById(`message-${messageCount}`).scrollIntoView()
})

socket.on("joinAccepted", () => {
    console.log("successfully joined the game")
    inGame = true
    join.disabled = true
    leave.disabled = false
    nameField.disabled = true
})

socket.on ("joinDeclined", (data) => {
    const message = data.message
    alert(message)
})

socket.on("connect", () => {
    console.log(`connected with id: ${socket.id}`)
    socket.emit("requestPlayers")
})

socket.on("updatePlayers", (data) => {
    const players = data.game.players
    playerList.innerHTML = ""
    players.forEach((player) => {
        playerList.innerHTML += `
        <div id="player-${player.name}" class="player">
            <div class="player-pfp">
                pfp
            </div>
            <div class="player-name">
                ${player.name}
            </div>
            <div class="player-score">
                ${player.score}
            </div>
        </div>
        `
    })
})