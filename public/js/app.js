
const socket = io();


//html 가져오는 부분
const myFace = document.getElementById('myFace');
const muteBtn = document.getElementById('mute');
let cameraBtn = document.getElementById('camera');
const screenBtn = document.getElementById('screen')
const camersSelect = document.getElementById('cameras');
const microphoneSelect = document.getElementById('microphone');
let senders = [];
let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let pcObj = {};

//내 오디어 비디오 가져옴
async function getMedia(deviceId) {
    const initialConstraints = {
        audio: true,
        video: { facingMode: 'user' },
    };
    const camerConstraints = {
        audio: true,
        video: { deviceId: { exact: deviceId } },
    };
    try {
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId ? camerConstraints : initialConstraints
        );
        myFace.volume = 0
        myFace.srcObject = myStream;
        if (!deviceId) {
            await getCamers();
        }
        console.log('오디오 가져올때 에러나나?')
        await getAudios()
    } catch (err) {
        console.log(err);
    }
}

function handleMuteBtn() {
    // 내 오디오 장치 가져옴
    console.log('내 오디오 장치', myStream.getAudioTracks());
    myStream
        .getAudioTracks()
        .forEach((track) => (track.enabled = !track.enabled));

    if (!muted) {
        muteBtn.innerText = '음소거 해제';
        muted = true;
    } else {
        muteBtn.innerText = '음소거';
        muted = false;
    }
}

function handleCamerBtn() {
    //내 비디오 장치 가져옴
    console.log('내 비디오', myStream.getVideoTracks());
    myStream
        .getVideoTracks()
        .forEach((track) => (track.enabled = !track.enabled));

    if (!cameraOff) {
        cameraBtn.innerText = ' 카메라 켜기';
        cameraOff = true;
    } else {
        cameraBtn.innerText = '카메라 끄기';
        cameraOff = false;
    }
}
async function getAudios() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audios = devices.filter((device) => device.kind === 'audioinput')
        const currentMic = myStream.getAudioTracks();
        console.log("오디오 가져온달", myStream.getAudioTracks());
        audios.forEach((audio) => {
            const option = document.createElement('option');
            option.value = audio.deviceId;
            option.innerText = audio.label;
            if (currentMic.label == audios.label) {
                option.selected = true;
            }
            microphoneSelect.appendChild(option)
        })
        console.log("오디오", audios)
    } catch (err) {
        console.log(err)
    }
}

//내 카메라 정보를 모두 가져옴 (카메라를 바꿀 때 필요함 )
async function getCamers() {
    try {
        //모든 장치를 가지고 온다.
        const devices = await navigator.mediaDevices.enumerateDevices();
        //내 비디오 찾기
        const camers = devices.filter((device) => device.kind === 'videoinput');
        console.log("카메라만", camers)
        const currentCamera = myStream.getVideoTracks()[0];
        camers.forEach((camera) => {
            const option = document.createElement('option');
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if (currentCamera.label == camera.label) {
                option.selected = true;
            }
            camersSelect.appendChild(option);
        });
        console.log(camers);
    } catch (e) {
        console.log(e);
    }
}

//카메라를 선택할 수 있음
async function handleCameraChange() {
    await getMedia(camersSelect.value);
    if (myPeerConnection) {
        const vidoeTrack = myStream.getVideoTracks()[0];
        const videoSender = myPeerConnection
            .getSenders()
            .find((sender) => sender.track.kind === 'video');
        videoSender.replaceTrack(vidoeTrack);
    }
}

async function handleMicroChange() {
    await getMedia(microphoneSelect.value);

}

// const displayMediaStreamConstraints = {
//     video: true // or pass HINTS
// };

// if (navigator.mediaDevices.getDisplayMedia) {
//     navigator.mediaDevices.getDisplayMedia(displayMediaStreamConstraints).then(success).catch(error);
// } else {
//     navigator.getDisplayMedia(displayMediaStreamConstraints).then(success).catch(error);
// }





//음소거, 카메라 버튼
muteBtn.addEventListener('click', handleMuteBtn);
cameraBtn.addEventListener('click', handleCamerBtn);
screenBtn.addEventListener('click', shareScreen);
camersSelect.addEventListener('input', handleCameraChange);
microphoneSelect.addEventListener('input', handleMicroChange);

//================여기까지 장치 관련된 코드

//---------------------------- 방에 들어가는 것 관련된 코드 (WELCOME FORM )
const welcome = document.getElementById('welcome');
const call = document.getElementById('call');
welcomeForm = welcome.querySelector('form');
// const form = welcome.querySelector('form')

call.hidden = true;

//양쪽 브라우저에서 다 실행됨
async function initMedia() {
    welcome.hidden = true;
    call.hidden = false;
    // 내 장치(카메라 오디오)를 가져옴
    await getMedia();
    makeConnection(socket.id);
}

//방 이름 넣고 방에 들어가기
async function handleWelcomeSubmit(event) {
    event.preventDefault();
    const input = welcomeForm.querySelector('input');
    //백엔드로 join_room 이벤트로 보내면 같은 이름의 이벤트로 받는다.
    //방에 들어가기 전에 내 장치 가져옴
    await initMedia();
    console.log('방에 들어간다');
    socket.emit('join_room', input.value);
    roomName = input.value;
    input.value = '';
}

welcomeForm.addEventListener('submit', handleWelcomeSubmit);

//--------------SOCKET 관련된 코드

//먼저 들어온 사람(서호진)
socket.on('welcome', async (userObjArr, socketIdformserver) => {
    console.log("누구야?", userObjArr)
    const len = userObjArr.length;
    console.log("들어있는 사람들 수", len)
    // console.log("새로 들어온 사람 id", socketIdformserver)

    //누군가 들어왔을 때 실행
    // if (len === 1) {
    //     return;
    // }
    for (let i = 0; i < len - 1; i++) {
        console.log('누군가 들어왔어요!');
        //가장 최근에 들어온 브라우저 제외

        try {
            //RTCPerrconnection생성
            console.log("번호", i)
            if (len > 2) {
                if (i === 0) {
                    continue;
                }
            }
            if (len > 3) {
                if (i === 1) {
                    continue;
                }
            }
            if (len > 4) {
                if (i === 2) {
                    continue;
                }
            }
            if (len > 5) {
                if (i === 3) {
                    continue;
                }
            }
            if (len > 6) {
                if (i === 4) {
                    continue;
                }
            }
            if (len > 7) {
                if (i === 5) {
                    continue;
                }
            }
            if (len > 8) {
                if (i === 6) {
                    continue;
                }
            }
            const newPc = makeConnection(
                userObjArr[i + 1].socketId,
            );
            //첨 있던 애가 offer 만들고
            const offer = await myPeerConnection.createOffer();
            //새로 들어온 애가 그 offer set
            await newPc.setLocalDescription(offer)

            socket.emit('offer', offer, userObjArr[i + 1].socketId);
        } catch (err) {
            console.log(err)
        }
    }

    // myPeerConnection.setLocalDescription(offer);
});

//나중에 들어온 사람 
socket.on('offer', async (offer, remoteSocketId) => {
    try {

        // console.log("내 offer랑 socketId", remoteSocketId)
        //이건 서호진 offer
        //이거 아직 없음 왜냐하면 존나 빨라서
        const newPc = makeConnection(remoteSocketId)
        await newPc.setRemoteDescription(offer);
        //학선님 answer
        const answer = await newPc.createAnswer();
        await newPc.setLocalDescription(answer);
        socket.emit('answer', answer, remoteSocketId);
    } catch (err) {
        console.log(err)
    }
});

//먼저 들어와있던 사람(서호진)
socket.on('answer', async (answer, remoteSocketId) => {
    // myPeerConnection.setRemoteDescription(answer);
    // console.log("컴퓨터 객체", pcObj)
    await pcObj[remoteSocketId].setRemoteDescription(answer)
});
//서로 정보(offer)교환 끝 그럼 이제 icecandidate server교환만 남음
socket.on('ice', async (ice, remoteSocketId) => {
    // console.log('candidate 받았어');
    await pcObj[remoteSocketId].addIceCandidate(ice)
    // myPeerConnection.addIceCandidate(ice, roomName);
});

socket.on('full', () => {
    alert('정원 초과입니다!');
    history.replace('/');
})

socket.on('leave_room', (leaveSocketId) => {
    deleteVideo(leaveSocketId);

})


//---------------------WEB RTC  코드
// 이 함수로 기존에 있던 사람과 들어온 사람의 stream을 연결해준다.
//즉 peer to peer 연결을 수행한다.


let collectiSoketId = []
function makeConnection(remoteSocketId) {
    //RTCPeerConnection == 암호화 및 대역폭 관리 오디오 또는 비디오 연결, peer 들 간의 데이터를
    // 안정적이고 효율적으로 통신하게 처리하는 webRTC 컴포넌트 
    console.log('makeConnection안에 있는 리모트 소켓 아이디', remoteSocketId)
    myPeerConnection = new RTCPeerConnection(
        {
            iceServers: [
                {
                    urls: "stun:stunserver.example.org"
                },
                {
                    urls: "turn:52.79.93.143",
                    username: "booking",
                    credential: "booking1234"
                }
            ]
        }
    );
    //2명 이상일 때만 실행

    for (let i = 0; i < collectiSoketId.length; i++) {
        if (collectiSoketId[i] === collectiSoketId[i + 1]) {
            collectiSoketId.splice(i + 1, 1)
        }
    }
    //answer와 offer 서로 교환 끝나면 이거 필요
    // console.log('첨 들어온 사람 피어', myPeerConnection);
    myPeerConnection.addEventListener('icecandidate', (event) => {
        handleIce(event, remoteSocketId)
    });
    // myPeerConnection.addEventListener('addstream', handleAddStream(data, remoteSocketId));

    myPeerConnection.addEventListener('track', (data) => {
        // console.log('애드 스트림', data)
        handleAddStream(data, remoteSocketId)


    });
    // console.log(myStream.getTracks())
    //내 장치들을 offer에 넣어준다.
    myStream
        .getTracks()
        .forEach((track) => myPeerConnection.addTrack(track, myStream));
    pcObj[remoteSocketId] = myPeerConnection;
    return myPeerConnection
}

function handleIce(data, remoteSocketId) {
    // console.log('candidate 보냄 ');
    // candidate===data
    socket.emit('ice', data.candidate, remoteSocketId);
    // console.log("아이스", data.candidate)
}

function handleAddStream(data, remoteSocketId) {
    const peerStream = data.streams[0]

    if (data.track.kind === 'video') {
        paintPeerFace(peerStream, remoteSocketId)
    }
    // const peersFace = document.getElementById('peersFace');
    // peersFace.srcObject = data.stream;
}

async function paintPeerFace(peerStream, id) {
    try {

        const videoGrid = document.querySelector('#video-grid')
        const video = document.createElement('video')
        const div = document.createElement('div')
        div.id = id;
        video.autoplay = true;
        video.playsInline = true;
        video.srcObject = peerStream;
        div.appendChild(video);
        videoGrid.appendChild(div);
    } catch (err) {
        console.log(err)
    }
}

//나가면 해당 유저의 비디오 삭제
function deleteVideo(leavedSocketId) {
    const streams = document.querySelector('#video-grid');
    const streamArr = document.querySelectorAll('div')

    streamArr.forEach((element) => {
        if (element.id === leavedSocketId) {
            streams.removeChild(element);
        }
    })
}


async function shareScreen() {
    console.log("AAa", myPeerConnection)
    navigator.mediaDevices.getDisplayMedia({ cursor: true }).then(stream => {
        const screenTrack = stream.getTracks()[0];
        console.log("컴퓨터 객체", pcObj)
        console.log("피어들타입", typeof (pcObj))
        console.log("피어들", Object.keys(pcObj))

        Object.keys(pcObj).find(sender => sender.track.kind === 'video').replaceTrack(screenTrack);
        const a = Object.keys(pcObj).map(sender => { })
        console.log("@@@", a)

        screenTrack.onended = function () {
            pcObj.find(sender => sender.track.kind === 'video').replaceTrack(userStream.current.getTracks()[1]);
        }
    })
}


// document.getElementById('screen').addEventListener('click', async () => {

//     let displayMediaStream = await navigator.mediaDevices.getDisplayMedia();

//     console.log("@@@", pcObj[remoteSocketId])
//     pcObj[remoteSocketId].find(sender => sender.track.kind === 'video').replaceTrack(displayMediaStream.getTracks()[0]);

//     //show what you are showing in your "self-view" video.
//     document.getElementById('screenShare').srcObject = displayMediaStream;

//     //hide the share button and display the "stop-sharing" one
// });
