const app = require('./app')
const http = require('http')
const https = require('https')
const credentials = require('./config/httpsConfig')


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
})
console.log("소켓 서버도 실행!")




io.on('connection', (socket) => {

    socket.on('join_room', (roomName) => {
        socket.join(roomName);
        socket.to(roomName).emit('welcome')
    })

    socket.on('offer', (offer, roomName) => {
        socket.to(roomName).emit('offer', offer);
    })

    socket.on('answer', (answer, roomName) => {
        socket.to(roomName).emit('answer', answer)
    })
    socket.on('ice', (ice, roomName) => {
        socket.to(roomName).emit('ice', ice)
    })
});

module.exports = { server }