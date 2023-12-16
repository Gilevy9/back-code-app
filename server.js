const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const userRoles = {};
const app = express();
const server = http.createServer(app);
const fs = require('fs');
const path = require('path');
// Configure CORS for Express
app.use(cors({
    origin: 'http://localhost:3001', // Allow your client's origin
    methods: ['GET', 'POST'] // Allowable methods
}));

// Configure CORS for Socket.io
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3001", // Allow your client's origin
        methods: ["GET", "POST"] // Allowable methods
    }
});

const codeDirectory = './codeBlocks'; // Directory to store code files

// Ensure the directory exists
if (!fs.existsSync(codeDirectory)){
    fs.mkdirSync(codeDirectory);
}

function getCodeFilePath(title) {
    return path.join(codeDirectory, `${title.replace(/\s+/g, '_')}.txt`);
}

function readCode(title, callback) {
    fs.readFile(getCodeFilePath(title), 'utf8', callback);
}

function writeCode(title, code) {
    fs.writeFile(getCodeFilePath(title), code, err => {
        if (err) console.error('Error writing file:', err);
    });
}

const codeBlocks = [
  { title: 'Async Case', code: '' },
  { title: 'Promise Example', code: ''},
  {title:'Event Loop', code: ''},
  {title:'Closure Example', code: ''}
];

// Route for root path
app.get('/', (req, res) => {
  res.send('Welcome to the Online Coding App');
});

app.get('/codeblocks', (req, res) => {
  res.json(codeBlocks);
});

io.on('connection', (socket) => {
    socket.on('checkRole', (title) => {
        if (!userRoles[title]) {
            userRoles[title] = 'mentor';
        } else {
            userRoles[title] = 'student';
        }
        socket.emit('roleAssigned', userRoles[title]);
    });
    socket.on('requestCode', (title) => {
        readCode(title, (err, code) => {
            if (err) {
                if (err.code === 'ENOENT') { // File does not exist
                    code = ''; // Default to empty string if no file
                } else {
                    console.error(err);
                    return;
                }
            }
            socket.emit('codeUpdate', { title, code });
        });
    });

    socket.on('codeUpdate', ({ title, code }) => {
        console.log(`Received code update for: ${title}`); 
        if (!title) {
            console.error('Title is undefined in codeUpdate event');
            return; // Exit if title is undefined
        }
        writeCode(title, code);
        io.emit('codeUpdate', { title, code });
    });;

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));