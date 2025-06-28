/**
 * Author: Illya Gavlovskyi
 * Date: 29 June 2025
 * CS491 – Exercise 3
 */

/**
 * @typedef {Object} GameState
 * @property {string[]} board
 * @property {string} currentPlayer
 * @property {boolean} gameActive
 * @property {Object|null} winner
 * @property {number} moveCount
 */

const WIN_CONDITIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

/**
 * Creates a fresh game state.
 * @returns {GameState}
 */
function createNewGameState() {
    return{
        board: Array(9).fill(""),
        currentPlayer: "O",
        gameActive: true,
        winner: null,
        moveCount: 0
    };
}

/**
 * Checks if a move is valid.
 * @param {GameState} gameState 
 * @param {number} position 
 * @returns {boolean}
 */
function isValidMove(gameState, position) {
    return gameState.gameActive && position >= 0 && position < 9 && gameState.board[position] === "";
}

/**
 * Makes a move and returns new game state.
 * @param {GameState} gameState 
 * @param {number} position 
 * @returns {GameState}
 */
function makeMove(gameState, position) {
    if(!isValidMove(gameState, position)){
        return gameState;
    } 

    const boardCopy = [];
    for(let i = 0; i < gameState.board.length; i++){
        boardCopy[i] = gameState.board[i];
    }

    const newState = {
        board: boardCopy,
        currentPlayer: gameState.currentPlayer,
        gameActive: gameState.gameActive,
        winner: gameState.winner,
        moveCount: gameState.moveCount + 1
    };

    newState.board[position] = gameState.currentPlayer;
    const result = checkGameResult(newState);

    if(result.gameOver){
        newState.gameActive = false;
        newState.winner = result;
    }
    else{
        newState.currentPlayer = gameState.currentPlayer === "O" ? "X" : "O";
    }
    return newState;
}

/**
 * Checks game result.
 * @param {GameState} gameState 
 * @returns {{gameOver: boolean, winner: string|null, winningPositions: number[]}}
 */
function checkGameResult(gameState) {
    for (const [a, b, c] of WIN_CONDITIONS) {
        if (gameState.board[a] && gameState.board[a] === gameState.board[b] && gameState.board[a] === gameState.board[c]) {
            return { gameOver: true, winner: gameState.board[a], winningPositions: [a, b, c] };
        }
    }
    if (gameState.moveCount >= 9) {
        return { gameOver: true, winner: null, winningPositions: [] };
    }
    return { gameOver: false, winner: null, winningPositions: [] };
}

// ================================
// GAME STATE + GUI
// ================================

let fileHandle = null;
let gameState = createNewGameState();
let pollInterval = null;

const cells = [];
for (let i = 1; i <= 9; i++) {
    cells.push(document.getElementById(`box_${i}`));
}
const statusText = document.getElementById("statusText");
const controller = document.getElementById("controller");
const errorMessage = document.getElementById("errorMessage");

function updateDisplay() {
    cells.forEach((cell, index) => {
        cell.textContent = gameState.board[index];
        cell.style.color = "black";
    });
    if (!gameState.gameActive && gameState.winner?.winningPositions) {
        gameState.winner.winningPositions.forEach(pos => {
            cells[pos].style.color = "red";
        });
    }
    if (!gameState.gameActive) {
        statusText.textContent = gameState.winner?.winner ? `Player ${gameState.winner.winner} wins!` : "It's a draw!";
    } else {
        statusText.textContent = `Player ${gameState.currentPlayer}'s turn`;
    }
}

async function saveGameState() {
    if (!fileHandle) return;
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(gameState, null, 2));
    await writable.close();
}

async function loadGameState() {
    if (!fileHandle) return;
    try {
        const file = await fileHandle.getFile();
        const text = await file.text();
        const loadedState = JSON.parse(text);
        if (isValidGameState(loadedState)) {
            gameState = loadedState;
            updateDisplay();
        }
    } catch (e) {
        console.warn("Could not load game state:", e.message);
    }
}

function isValidGameState(state) {
    return state && Array.isArray(state.board) && state.board.length === 9 && typeof state.currentPlayer === 'string' && typeof state.gameActive === 'boolean';
}

function startPolling() {
    stopPolling();
    pollInterval = setInterval(loadGameState, 500);
}

function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}

function showError(msg) {
    errorMessage.textContent = msg;
}

function clearError() {
    errorMessage.textContent = "";
}

async function handleControllerClick() {
    if (controller.textContent === "Start") {
        try {
            if (!fileHandle) {
                fileHandle = await window.showSaveFilePicker({
                    suggestedName: 'tictactoe-game.json',
                    types: [{ description: 'JSON files', accept: { 'application/json': ['.json'] } }]
                });
            }
            gameState = createNewGameState();
            await saveGameState();
            updateDisplay();
            startPolling();
            clearError();
            controller.textContent = "Clear";
        } catch (err) {
            showError("Failed to start game: " + err.message);
        }
    } else {
        stopPolling();
        gameState = createNewGameState();
        await saveGameState();
        updateDisplay();
        controller.textContent = "Start";
    }
}

async function handleCellClick(index) {
    if (!gameState.gameActive) return;
    const updatedState = makeMove(gameState, index);
    if (updatedState !== gameState) {
        gameState = updatedState;
        await saveGameState();
        updateDisplay();
    }
}

controller.addEventListener("click", handleControllerClick);
cells.forEach((cell, index) => cell.addEventListener("click", () => handleCellClick(index)));

if (!('showSaveFilePicker' in window)) {
    errorMessage.textContent = 'This browser does not support the File System Access API.';
}
