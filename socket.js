const app = require('./app');
const http = require('http');
const https = require('https');
const credentials = require('./config/httpsConfig');

const max = 5;
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
    let myRoom = null;

    socket.on('join_room', (roomName) => {
        myRoom = roomName;
        let isRoomExits = false;
        let targetRoomObj = {};

        for (let i = 0; i < roomObjArr.length; i++) {
            //같은 방 이름으로 들어오면 그 방에 참가

            if (roomObjArr[i].roomName === roomName) {

                if (roomObjArr[i].currentNum >= max) {
                    console.log(`${roomName}방은 정원 초과!`)
                    socket.emit('full')
                    return
                }

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

    socket.on('disconnecting', async () => {
        socket.to(myRoom).emit('leave_room', socket.id)

        for (let i = 0; i < roomObjArr.length; i++) {
            if (roomObjArr[i].roomName === myRoom) {
                const newUsers = roomObjArr[i].users.filter(
                    (user) => user.socketId !== socket.id
                )
                roomObjArr[i].users = newUsers
                roomObjArr[i].currentNum--;
                break;
            }
        }
        console.log("룸에 나간 이후", roomObjArr)
    })

    socket.on('ice', (ice, remoteSocketId) => {
        socket.to(remoteSocketId).emit('ice', ice, socket.id);
    });
});

module.exports = { server };