const express = require("express")
const { readFileSync } = require("fs")
const { createServer } = require("http")
const { Server } = require("socket.io")
const cfg = require("./cfg.json")

// server init
const app = express()
const httpServer = createServer(
    // {
    //     key: readFileSync("./src/ssl/private.key"),
    //     cert: readFileSync("./src/ssl/certificate.crt")
    // }, 
    app)
const io = new Server(httpServer)

// start server
app.use(express.static("public"))
httpServer.listen(cfg.PORT)

// game imports
const Game = require("./game")
const { validName } = require("./utils")

// game init
let game = new Game()
let timer = 0
game.init(cfg.CHOOSE, cfg.ALLOW)

try {

    // io.engine.on("connection", rawSocket => {
    //     rawSocket.peerCertificate = rawSocket.request.client.getPeerCertificate()
    // })

    io.on("connection", socket => {

        try {

            console.log(`user connected with id: ${socket.id}`)

            socket.on("requestJoin", (data) => {
                if (game.nameTaken(data.name)) {
                    socket.emit("joinDeclined", {
                        message: "Username taken."
                    })
                }
                // socket already in game
                else if (game.socketInGame(socket.id)) {
                    socket.emit("joinDeclined", {
                        message: "ERROR: Already connected to game, refresh page if error persists"
                    })
                }
                // max players reached
                else if (game.full()) {
                    socket.emit("joinDeclined", {
                        message: "Lobby is currently full"
                    })
                }
                // bad username
                else if (!validName(data.name)) {
                    socket.emit("joinDeclined", {
                        message: "Characters allowed: a-z, A-Z, 0-9, ., and _"
                    })
                }
                // username too long
                else if (data.name.length > 15) {
                    socket.emit("joinDeclined", {
                        message: "Username must not exceed 15 characters"
                    })
                }
                else if (game.midGame) {
                    socket.emit("joinDeclined", {
                        message: "Game currently in progress"
                    })
                }
                else {

                    game.addPlayer(data.name, socket.id)

                    socket.emit("joinAccepted")
                    if (game.players.length == 1) {
                        game.host = socket.id
                        io.sockets.emit("newHost", {
                            id: game.host
                        })
                    }
                    io.sockets.emit("updatePlayers", {
                        players: game.players
                    })
                    if (game.letters.length > 0) {
                        socket.emit("newLetters", {
                            letters: game.letters
                        })
                    }
                    io.sockets.emit("newMessage", {
                        sender: "Server",
                        type: "good",
                        message: `${data.name} has joined the game.`
                    })

                    pfpLoadAvailable()

                    console.log(`User ${data.name} (${socket.id}) has joined the game (${game.players.length}/${game.maxPlayers})`)

                }
            })

            socket.on("requestPlayers", () => {
                socket.emit("updatePlayers", {
                    players: game.players
                })
            })

            socket.on("chatSent", (data) => {
                const sender = data.sender
                const message = data.message
                const charLim = message.length <= 0 || message.length > 400
                const wordLim = message.split(" ").length > 100
                if (charLim) {
                    socket.emit("newMessage", {
                        sender: "Server",
                        type: "bad", 
                        message: "Message must be between 0 and 400 characters"
                    })
                }
                else if (wordLim) {
                    socket.emit("newMessage", {
                        sender: "Server",
                        type: "bad", 
                        message: "Message must be less than 100 words"
                    })
                }

                else {
                    io.sockets.emit("newMessage", {
                        sender: sender,
                        message: message
                    })
                }
            })

            const playerLeft = (message) => {
                const name = game.removePlayer(socket.id)
                console.log(`Player ${name} with id ${socket.id} has ${message} the game.`)
                if (game.host == socket.id) {
                    console.log("host left, choosing new host")
                    if (game.players.length > 0) {
                        game.host = game.players[0].id
                        io.sockets.emit("newHost", {
                            id: game.host
                        })
                        console.log(`setting ${game.players[0].name} (${game.host}) to be new host`)
                    }
                    else {
                        console.log("no players left, resetting game")
                        game.host = ""
                        game.endGame()
                        game.resetGame()
                        if (timer != 0) {
                            clearInterval(timer)
                        }
                    }
                }
                pfpLoadAvailable()
                io.sockets.emit("updatePlayers", {
                    players: game.players
                })
                io.sockets.emit("newMessage", {
                    sender: "Server",
                    type: "bad",
                    message: `${name} has ${message} the game.`
                })
            }

            socket.on("disconnect", () => {
                if (game.socketInGame(socket.id)) {
                    playerLeft("disconnected from")
                }   
            })

            socket.on("leave", () => {
                if (game.socketInGame(socket.id)) {
                    playerLeft("left")
                } 
            })

            socket.on("wordSubmit", (data) => {
                const word = data.word
                const playerIndex = game.getPlayerIndex(socket.id)
                const player = game.players[playerIndex]
                const points = game.wordScore[word.length]
                if (game.midGame && game.playWord(word, socket.id)) {
                    socket.emit("wordAccept", {
                        word: word,
                        points: points,
                        player: game.players[playerIndex]
                    })
                    io.sockets.emit("updatePlayerScore", {
                        id: socket.id,
                        score: player.score
                    })
                }
                else {
                    socket.emit("wordDecline")
                }
            })

            socket.on("requestStart", (data) => {
                if (game.host == socket.id && !game.midGame) {
                    console.log("host started game")
                    const size = data.size[0]
                    if (size >= 6 && size <= 8) {
                        game.wordSize = size
                    }
                    else {
                        game.wordSize = 6
                    }
                    game.startGame()
                    io.sockets.emit("updatePlayers", {
                        players: game.players
                    })
                    startTimer(64)
                    io.sockets.emit("startGame", {
                        letters: game.letters
                    })
                }
                else {
                    console.log("invalid request to start game")
                }
            })

            socket.on("pfpRequestChange", (data) => {
                const pfp = data.new
                const user = game.players[game.getPlayerIndex(socket.id)]
                console.log(`User ${user.name} requested pfp change from ${user.pfp} to ${pfp}`)
                if (game.pfpAvailable(pfp)) {
                    console.log(`PFP change request approved for user ${user.name}`)
                    game.pfpChange(pfp, socket.id)
                    io.sockets.emit("updatePlayerPfp", {
                        id: socket.id,
                        pfp: pfp
                    })
                    pfpLoadAvailable()
                }
                else {
                    console.log(`PFP change request denied for user ${user.name} `)
                }
            })

            socket.on("pfpLoadAvailable", () => {
                pfpLoadAvailable()
            })

            socket.on("emoteSent", (data) => {
                if (game.socketInGame(socket.id)) {
                    io.sockets.emit("emoteReceived", {
                        sender: game.nameById(socket.id),
                        id: socket.id,
                        emote: data.emote
                    })
                }
                else {
                    console.log("ERROR: emote sent by user not in game")
                }
            })

            const pfpLoadAvailable = () => {
                let ben = []
                let lukas = []
                for (const [key, value] of Object.entries(game.pfp)) {
                    if (value) {
                        if (key.charAt(0) == "b") {
                            ben.push(key)
                        }
                        else {
                            lukas.push(key)
                        }
                    }
                }
                io.sockets.emit("pfpAvailable", {
                    ben: ben,
                    lukas: lukas
                })
            }

            const startTimer = (s) => {
                let i = 0
                timer = setInterval(() => {
                    if (i >= s) {
                        clearInterval(timer)
                        endGame()
                    }
                    else {
                        i += 1
                    }
                }, 1000)
            }

            const endGame = () => {
                game.endGame()
                io.sockets.emit("gameOver", {
                    players: game.players,
                    word: game.word
                })
                if (game.players.length > 0) {
                    const highScore = game.players[0].score
                    game.players.forEach((player) => {
                        if (player.score == highScore) {
                            io.to(player.id).emit("youWon")
                            io.sockets.emit("newMessage", {
                                sender: "Server",
                                type: "good",
                                message: `${player.name} has won the game with ${player.score} points!`
                            })
                        }
                        else {
                            io.to(player.id).emit("youLost")
                        }
                    })
                }
            }
        }
        catch (error) {
            crash(error)
        }
    })
}
catch (error) {
    crash(error)
}

crash = (error) => {
    console.log("\n\nserver has crashed\n\n")
    console.log(error)
    const date = new Date()
    const file = `crash-log-${date.getDate()}-${date.getHours()}-${date.getMinutes()}-${date.getFullYear()}.txt`
    fstat.writeFile(`src/logs/${file}`, error, (err) => {
        if (err) throw err
        else {
            console.log(`wrote crash info to file ${file}`)
        }
    })
    io.sockets.emit("newMessage", {
        sender: "Server",
        type: "bad",
        message: "The server has crashed, restarting game..."
    })
    io.sockets.emit("serverCrash")
    console.log("restarting server...")
    game = new Game()
    game.init(cfg.CHOOSE, cfg.ALLOW)
}