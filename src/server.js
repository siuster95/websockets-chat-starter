const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// read the client html file into memory
// __dirname in node is the current directory
// (in this cas the same folder as the server js file)

const index = fs.readFileSync(`${__dirname}/../client/client.html`);

const onRequest = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.write(index);
  response.end();
};

const app = http.createServer(onRequest).listen(port);

console.log(`Listening on 127.0.0.1: ${port} `);

// pass in the http server into socketio and grab the websocket server as io
const io = socketio(app);

// object to hold all of our connected users
const users = {};

const onJoined = (sock) => {
  const socket = sock;

  socket.on('join', (data) => {
    // message back to new user
    const joinMsg = {
      name: 'server',
      msg: `There are/is ${Object.keys(users).length} other users online (${Object.keys(users).length + 1} users in total)`,
    };

    // message back to new users in using shortcuts
    const shortcutMsg = {
      name: 'server',
      msg: 'To roll a die, enter /r in the Message box and hit send. To get the current time and date, enter /d in the Message box and hit send. To change your username put /u in the message box, follow by a space, follow by your new username and then hit send',
    };

    // add user to list of users
    socket.name = data.name;
    users[socket.name] = socket.name;
    // tell new user how many other ppl are in room
    socket.emit('msg', joinMsg);
    socket.emit('msg', shortcutMsg);
    // tell socket to join room
    socket.join('room1');

    // announcement to everyone in the room
    const response = {
      name: 'server',
      msg: `${data.name} has just joined the room`,
    };
    // broadcast who joined the room
    socket.broadcast.to('room1').emit('msg', response);

    console.log(`${data.name} joined`);
    // success message back to new user
    socket.emit('msg', { name: 'server', msg: 'You joined the room' });
  });
};

const onMsg = (sock) => {
  const socket = sock;

  socket.on('msgToServer', (data) => {
    console.log(data.msg);
    io.sockets.in('room1').emit('msg', { name: socket.name, msg: data.msg });
  });
};


const onDisconnect = (sock) => {
  const socket = sock;

  socket.on('disconnect', () => {
    // send a msg back saying that you have left the room
    const messagebacktosender = { name: 'server', msg: 'You have left the server' };

    // send the msg back
    socket.emit('msg', messagebacktosender);

    // create message that someone has left
    const message = { name: 'server', msg: `${socket.name} has left the room` };

    // broadcast to everyone except to the one who left that person is leaving
    socket.broadcast.to('room1').emit('msg', message);

    // remove the socket from the room 
    socket.leave('room1');

    // get rid of the user from the list
    delete users[socket.name];
  });
};

const onExtras = (sock) => {
  const socket = sock;

  // rolling a dice
  socket.on('roll', () => {
    const randomroll = Math.floor(Math.random() * 6) + 1;

    const rollmsg = { name: 'server', msg: `${socket.name} has rolled a six-sided die and got a ${randomroll.toString()}` };

    io.in('room1').emit('msg', rollmsg);
  });

  // getting the date back
  socket.on('date', () => {
    const date = new Date().toLocaleString("en-US", {timeZone: "America/New_York"});
    socket.emit('msg', { name: 'server', msg: `The date and time currently is: ${date}` });
  });

  // change the username
  socket.on('changeUsername', (data) => {
    // get old name
    const oldname = socket.name;

    // switch the socket name to be something else
    socket.name = data;

    // delete the old value and add in this new one
    users[data] = data;
    delete users[oldname];

    const usernamemsg = { name: 'server', msg: `The user ${oldname} has changed their username to ${socket.name}` };

    // tell all users that a username has been changed
    io.in('room1').emit('msg', usernamemsg);
  });
};

io.sockets.on('connection', (socket) => {
  console.log('started');
  onJoined(socket);
  onMsg(socket);
  onDisconnect(socket);
  onExtras(socket);
});

console.log('Websocket server started');

