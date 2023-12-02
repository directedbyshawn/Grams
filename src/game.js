const fs = require("fs")
const { shuffle } = require("./help")

class Game {

    constructor() {
        this.host = ""
        this.midGame = false
        this.wordSize = 6
        this.letters = []
        this.players = []
        this.maxPlayers = 8
        this.dict = {}
        this.wordScore = {
            1: 5,
            2: 10, 
            3: 50,
            4: 100,
            5: 300,
            6: 600,
            7: 1000,
            8: 2000
        }
    }

    init = (dict) => {
        this.loadDict(dict)
    }

    startGame = () => {
        this.midGame = true
        this.chooseLetters()
    }

    endGame = () => {
        this.midGame = false
        
    }

    resetGame = () => {
        this.letters = [],
        this.wordSize = 6
    }

    addPlayer = (name, id) => {
        this.players.push({
            name: name,
            id: id,
            score: 0,
            wins: 0,
            words: []
        })
    }

    removePlayer = (id) => {
        let name = ""
        let players = []
        this.players.forEach((player) => {
            if (player.id != id) {
                players.push(player)
            }
            else {
                name = player.name
            }
        })
        this.players = players
        if (this.players.length == 0) {
            this.resetGame()
        }
        return name
    }

    nameById = (id) => {
        let name = ""
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].id == id) {
                name = this.players[i].name
                break
            }
        }
        return name
    }

    getPlayerIndex = (id) => {
        let index = -1
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].id == id) {
                index = i
            }
        }
        if (index != -1) {
            return index
        }
        else {
            return -1
        }
    }

    full = () => {
        return this.players.length >= this.maxPlayers
    }

    nameTaken = (name) => {
        let found = false
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].name == name) {
                found = true
                break
            }
        }
        return found
    }

    socketInGame = (id) => {
        let found = false
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].id == id) {
                found = true
                break
            }
        }
        return found
    }

    loadDict = (fileName) => {
        fs.readFile(fileName, "utf-8", (err, data) => {
            if (err) {
                console.log(`ERROR: Could not read dictionary file: ${err}`)
            }
            this.dict = JSON.parse(data)
        })
    }

    inDict = (word) => {
        const l = word.charAt(0)
        const s = word.length
        const words = this.dict[s][l]
        return words.includes(word)
    }

    chooseLetters = () => {
        this.letters = []
        const size = this.wordSize.toString()
        // choose random letter a-z
        const letter = String.fromCharCode(97 + Math.floor(Math.random() * 26))
        // pick word from dictionary of length s starting with letter l
        if (Object.keys(this.dict).length === 0) {
            console.log("ERROR: Could not pick word, dictionary empty.")
        }
        else {
            const length = this.dict[size][letter].length
            const word = this.dict[size][letter][Math.floor(Math.random()*length)]
            for (let i = 0; i < word.length; i++) {
                this.letters.push(word.charAt(i))
            }
        }

        shuffle(this.letters)
    }

    playWord = (word, id) => {
        const playerIndex = this.getPlayerIndex(id)
        if (this.checkWord(word, playerIndex)) {
            this.players[playerIndex].words.push(word)
            this.players[playerIndex].score += this.wordScore[word.length]
            return true
        }
        else {
            return false
        }
    }

    checkWord = (word, playerIndex) => {
        const c1 = word.length <= this.wordSize && word.length >= 1
        const c2 = this.inDict(word)
        const c3 = !this.players[playerIndex].words.includes(word)
        if (c1 && c2 && c3) {
            return true
        }
        else {
            return false
        } 
    }

    startTimer = (s) => {
        let i = 0
        setInterval(() => {
            if (i >= s) {
                clearInterval(this.startTimer)
                this.endGame()
            }
            else {
                i += 1
            }
        }, 1000)
    }

    pickWinner = () => {
        for (let i = 1; i < this.players.length; i++) {
            let c = this.players[i]
            let j
            for (j = i-1, j >= 0 && this.players[j].score > this.players[i].score; j--;) {
                this.players[j+1] = this.players[j]
            }
            this.players[j+1] = c
        }
        this.players.reverse()
        this.players[0].wins += 1
    }

}

module.exports = Game