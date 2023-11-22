const join = document.getElementById("join")
const leave = document.getElementById("leave")
const nameField = document.getElementById("name-input")
const playerList = document.getElementById("player-list-wrapper")
const chatInput = document.getElementById("chat-input")
const sendChat = document.getElementById("send-chat")
const chat = document.getElementById("chat")
const chatWrapper = document.getElementById("chat-wrapper")
const joinErrors = document.getElementById("join-errors")

let socket = io("http://localhost:5000")
//let socket = io("http://grams.ddns.net")

let inGame = false
let messageCount = 0

let isAlphanumeric = (str) => {
    return /^[a-zA-Z0-9]+$/.test(str)
}

socket.on("connect", () => {
    console.log(`connected with id: ${socket.id}`)
    socket.emit("requestPlayers")
})

join.addEventListener("click", () => {
    joinErrors.innerHTML = ""
    joinGame()
})

const joinGame = () => {
    const name = nameField.value
    if (name.length > 0 && isAlphanumeric(name) && !inGame) {
        socket.emit("requestJoin", {
            name: nameField.value
        })
    }
}

socket.on("joinAccepted", () => {
    console.log("successfully joined the game")
    inGame = true
    join.disabled = true
    leave.disabled = false
    nameField.disabled = true
    chatInput.disabled = false
    sendChat.disabled = false
})

socket.on("joinDeclined", (data) => {
    const message = data.message
    joinErrors.innerHTML += `
        <p class="bad">${message}</p>
    `
})

leave.addEventListener("click", () => {
    socket.emit("leave", {
        name: nameField.value
    })
    join.disabled = false
    leave.disabled = true
    nameField.disabled = false
    chatInput.disabled = true
    sendChat.disabled = true
    inGame = false
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

document.addEventListener("keydown", (evt) => {
    if (evt.keyCode == 13) {
        if (chatInput == document.activeElement) {
            sendMessage()
        }
        else if (nameField == document.activeElement) {
            joinErrors.innerHTML = ""
            joinGame()
        }
    }
})

const sendMessage = () => {
    const name = nameField.value
    const message = chatInput.value
    messageCount += 1
    let allowMessage = true
    /*

    This is good, but should be checked on character input 
    and then should toggle the send button on and off, with 
    an alert if a message is sent that doesnt meet the requirements

    let allowMessage = (message.length > 0 && message.length < 400 && message.split(" ").length < 100 && inGame)
    message.split(" ").forEach((word) => {
        if (word.length > 16) {
            allowMessage = false
        } 
    })

    */
    if (allowMessage) {
        socket.emit("chatSent", {
            sender: name,
            message: message
        })
        chatInput.value = ""
    } 
}

sendChat.addEventListener("click", sendMessage)

socket.on("newMessage", (data) => {
    const sender = data.sender
    const message = data.message
    const me = nameField.value
    messageCount += 1
    if (sender == "Server") {
        chat.innerHTML += `
            <p id="message-${messageCount}">
                <span class="server-message ${data.type}">${message}</span>
            </p>
        `
    }
    else if (sender == me) {
        chat.innerHTML += `
            <p id="message-${messageCount}">
                <span class="my-message">${me}: </span>
                <span class="chat-message">${message}</span>
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

