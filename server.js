const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Game State (stored on server)
const games = {};

// Helper to generate room code
function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Socket.IO Events
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Create a new game room
    socket.on('createGame', (data) => {
        const code = generateCode();
        const userId = socket.id;
        
        games[code] = {
            code,
            owner: userId,
            ownerName: data.userName,
            players: [{
                id: userId,
                name: data.userName,
                wordsCompleted: 0,
                totalGuesses: 0,
                guessesPerWord: []
            }],
            createdAt: Date.now(),
            gameStarted: false
        };
        
        socket.join(code);
        socket.emit('gameCreated', { code, game: games[code] });
        io.to(code).emit('playersUpdated', games[code]);
        console.log('Game created:', code);
    });

    // Join an existing game
    socket.on('joinGame', (data) => {
        const { code, userName } = data;
        
        if (!games[code]) {
            socket.emit('error', 'Room not found');
            return;
        }
        
        const game = games[code];
        const playerExists = game.players.some(p => p.id === socket.id);
        
        if (!playerExists) {
            game.players.push({
                id: socket.id,
                name: userName,
                wordsCompleted: 0,
                totalGuesses: 0,
                guessesPerWord: []
            });
        }
        
        socket.join(code);
        socket.emit('gameJoined', { code, game });
        io.to(code).emit('playersUpdated', game);
        console.log(`${userName} joined ${code}`);
    });

    // Start game
    socket.on('startGame', (code) => {
        if (games[code]) {
            games[code].gameStarted = true;
            io.to(code).emit('gameStarted');
            console.log('Game started:', code);
        }
    });

    // Update player stats
    socket.on('updateStats', (data) => {
        const { code, stats } = data;
        
        if (games[code]) {
            const player = games[code].players.find(p => p.id === socket.id);
            if (player) {
                player.wordsCompleted = stats.wordsCompleted;
                player.totalGuesses = stats.totalGuesses;
                player.guessesPerWord = stats.guessesPerWord;
                io.to(code).emit('playersUpdated', games[code]);
            }
        }
    });

    // Leave game
    socket.on('leaveGame', (code) => {
        if (games[code]) {
            games[code].players = games[code].players.filter(p => p.id !== socket.id);
            
            if (games[code].players.length === 0) {
                delete games[code];
                console.log('Game deleted:', code);
            } else {
                io.to(code).emit('playersUpdated', games[code].players);
            }
        }
        socket.leave(code);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Clean up any games where this user was the only player
        Object.keys(games).forEach(code => {
            games[code].players = games[code].players.filter(p => p.id !== socket.id);
            if (games[code].players.length === 0) {
                delete games[code];
            }
        });
    });
});

// REST API endpoints (optional fallback)
app.get('/api/game/:code', (req, res) => {
    const game = games[req.params.code];
    if (game) {
        res.json(game);
    } else {
        res.status(404).json({ error: 'Game not found' });
    }
});

// Port configuration for Railway
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🎮 Wordle Battle server running on port ${PORT}`);
});

