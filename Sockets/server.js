/*
  This a Socket.io node server
  Run with node server.js in a console
  
  This version November 2025 - M.Vanstone
  Use and abuse as you see fit.

*/
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(express.static('Rogue/Sockets/dist')); // relative location to the game files

let players = []; // Store player states { "id": socketId }

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Example: Broadcast a "player joined" event
  socket.broadcast.emit('playerJoined', { id: socket.id });

  players.push({"id":socket.id});

  // Listen for custom events from clients (e.g., player movement)
  socket.on('playerMove', (data) => {
    socket.broadcast.emit('playerMoved', { id: socket.id, ...data });
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerLeft', socket.id);
    console.log('User disconnected:', socket.id);
  });

  socket.on('playerReady', () => {
    io.emit('playerReady', socket.id);
  });

  socket.on('playerMenu', () => {
    io.emit('playerMenu', socket.id);
  });


});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
