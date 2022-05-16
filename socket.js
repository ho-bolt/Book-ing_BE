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


    socket.on('join_room', (roomName) => {

        let isRoomExits = true;
        let targetRoomObj = {};

        for (let i = 0; i < roomObjArr.length; i++) {
            if (roomObjArr[i].roomName === roomName) {
                isRoomExits = true;
                targetRoomObj = roomObjArr[i]
                break
            }
        }
        if (!isRoomExits) {

            targetRoomObj = {
                roomName,
                currentNum: 0,
                users: [],
            }
            roomObjArr.push(targetRoomObj)
        }
        console.log('타겟 룸', targetRoomObj)

        console.log('방 배열', roomObjArr)

        targetRoomObj.users.push({
            socketId: socket.id
        })
        targetRoomObj.currentNum++;
        console.log("룸에 들어간 이후 ", targetRoomObj)
        socket.join(roomName);
        console.log("방이름?", roomName)
        console.log(`${roomName}에 들어간다`)
        socket.to(roomName).emit('welcome', targetRoomObj.users, socket.id);
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