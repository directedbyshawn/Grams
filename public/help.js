const isAlphanumeric = (str) => {
    return /^[a-zA-Z0-9]+$/.test(str)
}

const shuffle = (list) => {

    let currentIndex = list.length,  randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex > 0) {

        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [list[currentIndex], list[randomIndex]] = [
        list[randomIndex], list[currentIndex]];
    }

}

module.exports = { isAlphanumeric, shuffle }