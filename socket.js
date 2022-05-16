const app = require('./app');
const http = require('http');
const https = require('https');
const credentials = require('./config/httpsConfig');

let roomObjArr = [];
let mediaStatus = {}
let server = '';
if (process.env.PORT) {
    server = https.createServer(credentials, app);
} else {
    server = http.createServer(app);
}

const io = require('socket.io')(server, {
    cors: {
        origin: '*',
        credentials: true,
    },
});
console.log('소켓 서버도 실행!');

io.on('connection', (socket) => {
    let myRoomName = null;

    socket.on('join_room', (roomName) => {
        myRoomName = roomName;

        let isRoomExits = true;
        let targetRoomObj = null;

        if (!isRoomExits) {
            targetRoomObj = {
                roomName,
                currentNum: 0,
                users: [],
            }
            roomObjArr.push(targetRoomObj)
        }
        targetRoomObj.users.push({
            socketId: socket.id
        })
        targetRoomObj.currentNum++;

        socket.join(roomName);
        console.log("방이름?", roomName)
        console.log(`${roomName}에 들어간다`)
        socket.emit('welcome', targetRoomObj.users, socket.id);
    });

    socket.on('offer', (offer, remoteSocketId) => {
        socket.to(remoteSocketId).emit('offer', offer, socket.id);
    });

    socket.on('answer', (answer, remoteSocketId) => {
        socket.to(remoteSocketId).emit('answer', answer, socket.id);
    });
    socket.on('ice', (ice, remoteSocketId) => {
        socket.to(remoteSocketId).emit('ice', ice, socket.id);
    });
});

module.exports = { server };