const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

const rootDir = path.join(__dirname, '..');
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));
app.use(express.static(rootDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

['/adm', '/cozinha', '/painel'].forEach((route) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(rootDir, 'cozinha.html'));
  });
});

io.on('connection', (socket) => {
  socket.on('pedido:novo', (pedido) => {
    socket.broadcast.emit('pedido:novo', pedido);
  });

  socket.on('pedido:atualizado', (pedido) => {
    socket.broadcast.emit('pedido:atualizado', pedido);
  });
});

server.listen(port, () => {
  console.log(`Servidor MK rodando em http://localhost:${port}`);
});
