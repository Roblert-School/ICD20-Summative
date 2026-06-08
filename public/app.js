// ===== WORDLE BATTLE - COMPETITIVE WORDLE GAME =====
// Multiplayer competition with server sync via Socket.IO

// Socket.IO Connection
const socket = io();

// Game State
let currentRoom = null;
let currentUser = null;
let currentUserId = null;
let isInGame = false;
let lobbyUpdateInterval = null;
let gameUpdateInterval = null;
let gameData = null;

// Game variables
let currentWord = '';
let currentGuess = '';
let guessCount = 0;
let wordIndex = 0;
let currentRowIndex = 0;
const TOTAL_WORDS = 5;
const MAX_GUESSES = 6;
let gameComplete = false;
let usedLetters = new Set();
let playerStats = {
    wordsCompleted: 0,
    totalGuesses: 0,
    guessesPerWord: []
};

// Socket Event Listeners
socket.on('gameCreated', (data) => {
    currentRoom = data.code;
    currentUserId = socket.id;
    gameData = data.game;
    goToLobby();
});

socket.on('gameJoined', (data) => {
    currentRoom = data.code;
    currentUserId = socket.id;
    gameData = data.game;
    goToLobby();
});

socket.on('playersUpdated', (game) => {
    if (game) {
        gameData = game;
        // Only update UI if not in active gameplay
        if (!isInGame) {
            updateLobbyUI();
            refreshLeaderboard();
        }
    }
});

socket.on('gameStarted', () => {
    goToGameScreen();
    startGameUpdates();
});

socket.on('error', (message) => {
    showMainError(message);
});

// Room Manager Class (using Socket.IO)
class RoomManager {
    createGame(ownerName) {
        socket.emit('createGame', { userName: ownerName });
    }

    joinGame(code, userName) {
        socket.emit('joinGame', { code, userName });
    }

    leaveGame(code) {
        socket.emit('leaveGame', code);
    }

    startGame(code) {
        socket.emit('startGame', code);
    }

    updatePlayerStats(stats) {
        socket.emit('updateStats', { code: currentRoom, stats });
    }

    getGameData() {
        return gameData;
    }
}

const roomManager = new RoomManager();

// Game Logic Functions
function getRandomWordleWord() {
    return WORDLE_WORDS[Math.floor(Math.random() * WORDLE_WORDS.length)];
}

function clearBoardState() {
    const board = document.getElementById('wordleBoard');
    const tiles = board.querySelectorAll('.tile');
    tiles.forEach(tile => {
        tile.textContent = '';
        tile.classList.remove('filled', 'correct', 'present', 'absent');
    });
}

function initializeWord() {
    currentWord = getRandomWordleWord().toUpperCase();
    currentGuess = '';
    guessCount = 0;
    clearBoardState();
    renderBoard();
    generateKeyboard();
}

function renderBoard() {
    const board = document.getElementById('wordleBoard');
    
    // Only create tiles if board is empty (first time)
    if (board.children.length === 0) {
        // Create 6 rows, 5 columns
        for (let row = 0; row < MAX_GUESSES; row++) {
            for (let col = 0; col < 5; col++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.setAttribute('data-row', row);
                tile.setAttribute('data-col', col);
                board.appendChild(tile);
            }
        }
    }
    
    // Update current row with current guess
    const tiles = board.querySelectorAll(`[data-row="${currentRowIndex}"]`);
    tiles.forEach((tile, idx) => {
        const letter = currentGuess[idx] || '';
        tile.textContent = letter;
        if (letter) {
            tile.classList.add('filled');
        } else {
            tile.classList.remove('filled');
        }
    });
}

function generateKeyboard() {
    const keyboard = document.getElementById('keyboard');
    keyboard.innerHTML = '';
    keyboard.className = 'keyboard';
    
    const rows = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
    ];
    
    rows.forEach((row, rowIdx) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        
        // Add left spacer for rows 1 and 2
        if (rowIdx === 1) {
            const spacer = document.createElement('div');
            spacer.style.flex = '0.5';
            rowDiv.appendChild(spacer);
        } else if (rowIdx === 2) {
            const spacer = document.createElement('div');
            spacer.style.flex = '1.5';
            rowDiv.appendChild(spacer);
            
            const enterBtn = document.createElement('button');
            enterBtn.className = 'key enter';
            enterBtn.textContent = 'Enter';
            enterBtn.onclick = handleSubmit;
            rowDiv.insertBefore(enterBtn, rowDiv.children[0]);
        }
        
        row.forEach(letter => {
            const btn = document.createElement('button');
            btn.className = 'key';
            btn.id = 'key-' + letter;
            btn.textContent = letter;
            btn.onclick = () => handleKeyPress(letter);
            if (usedLetters.has(letter)) {
                btn.classList.add('used');
            }
            rowDiv.appendChild(btn);
        });
        
        // Add backspace to first row
        if (rowIdx === 0) {
            const backBtn = document.createElement('button');
            backBtn.className = 'key backspace';
            backBtn.textContent = '← Back';
            backBtn.onclick = handleBackspace;
            rowDiv.appendChild(backBtn);
        }
        
        // Add right spacer for row 2
        if (rowIdx === 2) {
            const spacer = document.createElement('div');
            spacer.style.flex = '1.5';
            rowDiv.appendChild(spacer);
        }
        
        keyboard.appendChild(rowDiv);
    });
}

function handleKeyPress(letter) {
    if (!isInGame || gameComplete || currentGuess.length >= 5) return;
    currentGuess += letter;
    renderBoard();
}

function handleBackspace() {
    if (!isInGame || gameComplete) return;
    currentGuess = currentGuess.slice(0, -1);
    renderBoard();
}

function handleSubmit() {
    if (gameComplete || currentGuess.length !== 5) {
        showGameMessage('Need 5 letters', 'error');
        return;
    }
    
    if (!WORDLE_WORDS.includes(currentGuess)) {
        showGameMessage('Word not in list', 'error');
        return;
    }
    
    guessCount++;
    updateBoard();
    
    if (currentGuess === currentWord) {
        completeWord();
    } else if (guessCount >= MAX_GUESSES) {
        failWord();
    } else {
        // Prepare for next guess on same word
        currentGuess = '';
        currentRowIndex++;
        renderBoard();
    }
}

function updateBoard() {
    const board = document.getElementById('wordleBoard');
    const tiles = board.querySelectorAll('.tile');
    
    let tileIndex = currentRowIndex * 5;
    for (let i = 0; i < 5; i++) {
        const tile = tiles[tileIndex + i];
        const letter = currentGuess[i];
        tile.textContent = letter;
        tile.classList.add('filled');
        
        if (letter === currentWord[i]) {
            tile.classList.add('correct');
        } else if (currentWord.includes(letter)) {
            tile.classList.add('present');
        } else {
            tile.classList.add('absent');
        }
        
        // Mark letter as used
        usedLetters.add(letter);
        const keyBtn = document.getElementById('key-' + letter);
        if (keyBtn) {
            keyBtn.classList.add('used');
        }
    }
}

function completeWord() {
    playerStats.wordsCompleted++;
    playerStats.totalGuesses += guessCount;
    playerStats.guessesPerWord.push(guessCount);
    
    nextWord();
}

function failWord() {
    playerStats.totalGuesses += MAX_GUESSES + 1;
    playerStats.guessesPerWord.push(MAX_GUESSES + 1);
    
    nextWord();
}

function nextWord() {
    wordIndex++;
    if (wordIndex >= TOTAL_WORDS) {
        endGame();
    } else {
        usedLetters.clear();
        currentGuess = '';
        guessCount = 0;
        currentRowIndex = 0;
        initializeWord();
        updateGameStatus();
        refreshLeaderboard();
        savePlayerStats();
        showGameMessage('', 'info');
    }
}

function endGame() {
    gameComplete = true;
    savePlayerStats();
    displayGameOverScreen();
    stopGameUpdates();
}

function showGameMessage(message, type = 'info') {
    const msgEl = document.getElementById('gameMessage');
    msgEl.textContent = message;
    msgEl.className = 'game-message';
    if (type !== 'info') msgEl.classList.add(type);
}

function displayGameOverScreen() {
    if (!gameData) return;
    
    // Sort players: by wordsCompleted DESC, then by totalGuesses ASC
    const sorted = [...gameData.players].sort((a, b) => {
        if (b.wordsCompleted !== a.wordsCompleted) {
            return b.wordsCompleted - a.wordsCompleted;
        }
        return a.totalGuesses - b.totalGuesses;
    });
    
    const statsHtml = sorted.map((p, idx) => {
        const medals = ['🥇', '🥈', '🥉'];
        const medal = medals[idx] || '';
        return `<div class="stat-row">
                    <span class="stat-name">${medal} ${p.name}</span>
                    <span class="stat-value">${p.wordsCompleted} words | ${p.totalGuesses}g</span>
                </div>`;
    }).join('');
    
    document.getElementById('finalStats').innerHTML = statsHtml;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

function refreshLeaderboard() {
    if (!gameData) return;
    
    const sorted = [...gameData.players].sort((a, b) => {
        if (b.wordsCompleted !== a.wordsCompleted) {
            return b.wordsCompleted - a.wordsCompleted;
        }
        return a.totalGuesses - b.totalGuesses;
    });
    
    const leaderboard = document.getElementById('leaderboard');
    leaderboard.innerHTML = sorted.map(p => {
        const isCurrentPlayer = p.id === currentUserId;
        return `<div class="leaderboard-item${isCurrentPlayer ? ' current' : ''}">
                    <span>${p.name}</span>
                    <span>${p.wordsCompleted} | ${p.totalGuesses}g</span>
                </div>`;
    }).join('');
}

function updateGameStatus() {
    document.getElementById('gameStatus').textContent = `Word ${wordIndex + 1} of ${TOTAL_WORDS}`;
    document.getElementById('guessCount').textContent = `Guesses: ${guessCount}/${MAX_GUESSES}`;
    document.getElementById('wordNumber').textContent = `Word ${wordIndex + 1}/${TOTAL_WORDS}`;
}

function savePlayerStats() {
    if (currentRoom) {
        roomManager.updatePlayerStats(playerStats);
    }
}

function startGameUpdates() {
    // Socket.IO handles live updates via 'playersUpdated' event
    // No polling needed with real-time websockets
}

function stopGameUpdates() {
    if (gameUpdateInterval) {
        clearInterval(gameUpdateInterval);
        gameUpdateInterval = null;
    }
}

// ===== UI FUNCTIONS =====
function createRoom() {
    const name = document.getElementById('userName').value.trim();
    if (!name) {
        showMainError('Please enter your name');
        return;
    }
    
    currentUser = name;
    playerStats = { wordsCompleted: 0, totalGuesses: 0, guessesPerWord: [] };
    roomManager.createGame(name);
}

function openJoinDialog() {
    document.getElementById('joinDialog').classList.add('active');
}

function closeJoinDialog() {
    document.getElementById('joinDialog').classList.remove('active');
    document.getElementById('joinCode').value = '';
    document.getElementById('joinError').textContent = '';
}

function joinGame() {
    const name = document.getElementById('userName').value.trim();
    const code = document.getElementById('joinCode').value.trim().toUpperCase();
    
    if (!name) {
        showMainError('Please enter your name');
        return;
    }
    
    if (!code || code.length !== 6) {
        showJoinError('Invalid room code');
        return;
    }
    
    currentUser = name;
    playerStats = { wordsCompleted: 0, totalGuesses: 0, guessesPerWord: [] };
    roomManager.joinGame(code, name);
    closeJoinDialog();
}

function leaveGame() {
    roomManager.leaveGame(currentRoom);
    isInGame = false;
    gameComplete = false;
    currentRoom = null;
    currentUser = null;
    document.getElementById('mainScreen').classList.add('active');
    document.getElementById('lobbyScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('userName').value = '';
    stopGameUpdates();
    stopLobbyUpdates();
}

function goToLobby() {
    document.getElementById('mainScreen').classList.remove('active');
    document.getElementById('lobbyScreen').classList.add('active');
    document.getElementById('gameScreen').classList.remove('active');
    
    // Show lobby content
    updateLobbyDisplay();
    startLobbyUpdates();
}

function updateLobbyUI() {
    if (!gameData) return;
    
    // Update room code
    document.getElementById('lobbyRoomCode').textContent = currentRoom;
    
    // Update player count
    document.getElementById('playerCount').textContent = gameData.players.length;
    
    // Update players list
    const playersList = document.getElementById('lobbyPlayersList');
    playersList.innerHTML = gameData.players.map(player => {
        const isOwner = player.id === gameData.owner;
        const isCurrentPlayer = player.id === currentUserId;
        let classList = 'player-item';
        if (isOwner) classList += ' owner';
        if (isCurrentPlayer) classList += ' current';
        
        return `<div class="${classList}">
                    <span class="player-name">${player.name}</span>
                    ${isOwner ? '<span class="player-badge">👑 Host</span>' : ''}
                </div>`;
    }).join('');
    
    // Check if current user is owner
    const isOwner = currentUserId === gameData.owner;
    const startBtn = document.getElementById('startGameBtn');
    const ownerMsg = document.getElementById('ownerOnlyMsg');
    
    if (isOwner) {
        startBtn.disabled = false;
        ownerMsg.classList.remove('show');
    } else {
        startBtn.disabled = true;
        ownerMsg.classList.add('show');
        ownerMsg.textContent = 'Waiting for host to start the game...';
    }
}

function updateLobbyDisplay() {
    if (!gameData) return;
    
    // Check if game has started - if so, auto-transition
    if (gameData.gameStarted && !isInGame) {
        stopLobbyUpdates();
        goToGameScreen();
        return;
    }
    
    updateLobbyUI();
}

function startLobbyUpdates() {
    // Update lobby display every second to show new players joining and detect game start
    lobbyUpdateInterval = setInterval(() => {
        updateLobbyDisplay();
    }, 1000);
}

function stopLobbyUpdates() {
    if (lobbyUpdateInterval) {
        clearInterval(lobbyUpdateInterval);
        lobbyUpdateInterval = null;
    }
}

function goToGameScreen() {
    isInGame = true;
    gameComplete = false;
    playerStats = { wordsCompleted: 0, totalGuesses: 0, guessesPerWord: [] };
    wordIndex = 0;
    currentRowIndex = 0;
    
    // Stop lobby updates and transition to game
    stopLobbyUpdates();
    
    // Tell server to start the game if this is the host
    if (currentUserId === gameData.owner && !gameData.gameStarted) {
        roomManager.startGame(currentRoom);
    }
    
    document.getElementById('lobbyScreen').classList.remove('active');
    document.getElementById('roomCode').textContent = currentRoom;
    document.getElementById('mainScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');
    document.getElementById('gameOverScreen').classList.add('hidden');
    
    initializeWord();
    updateGameStatus();
    refreshLeaderboard();
    startGameUpdates();
}

function goToRoom() {
    goToGameScreen();
}

function copyRoomCode() {
    const code = document.getElementById('codeDisplay').textContent;
    navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('copyCodeBtn');
        const original = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => { btn.textContent = original; }, 2000);
    });
}

function copyLobbyCode() {
    const code = document.getElementById('lobbyRoomCode').textContent;
    navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('copyLobbyCodeBtn');
        const original = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => { btn.textContent = original; }, 2000);
    });
}

function restartGame() {
    wordIndex = 0;
    currentRowIndex = 0;
    gameComplete = false;
    usedLetters.clear();
    playerStats = { wordsCompleted: 0, totalGuesses: 0, guessesPerWord: [] };
    currentGuess = '';
    guessCount = 0;
    
    document.getElementById('gameOverScreen').classList.add('hidden');
    initializeWord();
    updateGameStatus();
    savePlayerStats();
}

function showMainError(message) {
    const el = document.getElementById('mainError');
    el.textContent = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 5000);
}

function showJoinError(message) {
    const el = document.getElementById('joinError');
    el.textContent = message;
    el.classList.add('show');
}

// ===== EVENT LISTENERS =====

// DOM Elements
const userNameInput = document.getElementById('userName');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const leaveGameBtn = document.getElementById('leaveGameBtn');
const confirmJoinBtn = document.getElementById('confirmJoinBtn');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const goToRoomBtn = document.getElementById('goToRoomBtn');
const restartGameBtn = document.getElementById('restartGameBtn');
const joinCode = document.getElementById('joinCode');
const leaveLobbyBtn = document.getElementById('leaveLobbyBtn');
const copyLobbyCodeBtn = document.getElementById('copyLobbyCodeBtn');
const startGameBtn = document.getElementById('startGameBtn');

// Button listeners
createRoomBtn.addEventListener('click', createRoom);
joinRoomBtn.addEventListener('click', openJoinDialog);
confirmJoinBtn.addEventListener('click', joinGame);
leaveGameBtn.addEventListener('click', leaveGame);
copyCodeBtn.addEventListener('click', copyRoomCode);
goToRoomBtn.addEventListener('click', goToRoom);
restartGameBtn.addEventListener('click', restartGame);
leaveLobbyBtn.addEventListener('click', leaveGame);
copyLobbyCodeBtn.addEventListener('click', copyLobbyCode);
startGameBtn.addEventListener('click', goToRoom);

// Enter key listeners
userNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createRoom();
});

joinCode.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinGame();
});

// Keyboard listener for game
document.addEventListener('keydown', (e) => {
    if (!isInGame || gameComplete) return;
    
    const letter = e.key.toUpperCase();
    if (/^[A-Z]$/.test(letter)) {
        handleKeyPress(letter);
    } else if (e.key === 'Backspace') {
        handleBackspace();
    } else if (e.key === 'Enter') {
        handleSubmit();
    }
});

// Listen for game updates from other tabs
window.addEventListener('gameUpdated', () => {
    refreshLeaderboard();
});
