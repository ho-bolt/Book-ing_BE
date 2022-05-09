const socket = io();

//html 가져오는 부분 


const myFace = document.getElementById("myFace")
const muteBtn = document.getElementById("mute")
let cameraBtn = document.getElementById("camera")
const camersSelect = document.getElementById("cameras")
let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;



//내 오디어 비디오 가져옴 
async function getMedia(deviceId) {
    const initialConstraints = {
        audio: true, video: { facingMode: "user" }
    };
    const camerConstraints = {
        audio: true,
        video: { deviceId: { exact: deviceId } }
    }
    try {
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId ? camerConstraints : initialConstraints
        );
        myFace.srcObject = myStream;
        if (!deviceId) {
            await getCamers();
        }
    } catch (err) {
        console.log(err)
    }
}



function handleMuteBtn() {
    // 내 오디오 장치 가져옴
    console.log("내 오디오 장치", myStream.getAudioTracks())
    myStream.getAudioTracks().forEach((track) => track.enabled = !track.enabled);

    if (!muted) {
        muteBtn.innerText = "음소거 해제"
        muted = true
    } else {
        muteBtn.innerText = '음소거'
        muted = false
    }
}
function handleCamerBtn() {
    //내 비디오 장치 가져옴 
    console.log('내 비디오', myStream.getVideoTracks())
    myStream.getVideoTracks().forEach((track) => track.enabled = !track.enabled);

    if (!cameraOff) {
        cameraBtn.innerText = " 카메라 켜기"
        cameraOff = true
    } else {
        cameraBtn.innerText = "카메라 끄기"
        cameraOff = false
    }
}


//내 카메라 정보를 모두 가져옴 (카메라를 바꿀 때 필요함 )
async function getCamers() {
    try {
        //모든 장치를 가지고 온다. 
        const devices = await navigator.mediaDevices.enumerateDevices();
        //내 비디오 찾기 
        const camers = devices.filter((device) => device.kind === "videoinput")
        const currentCamera = myStream.getVideoTracks()[0];
        camers.forEach(camera => {
            const option = document.createElement("option")
            option.value = camera.deviceId
            option.innerText = camera.label;
            if (currentCamera.label == camera.label) {
                option.selected = true;
            }
            camersSelect.appendChild(option)
        })
        console.log(camers)
    } catch (e) {
        console.log(e)
    }
}


//카메라를 선택할 수 있음 
async function handleCameraChange() {

    await getMedia(camersSelect.value)
    if (myPeerConnection) {
        console.log(myPeerConnection.getSenders)
    }
}

//음소거, 카메라 버튼 
muteBtn.addEventListener('click', handleMuteBtn)
cameraBtn.addEventListener('click', handleCamerBtn)
camersSelect.addEventListener('input', handleCameraChange)


//================여기까지 장치 관련된 코드 



//---------------------------- 방에 들어가는 것 관련된 코드 (WELCOME FORM )
const welcome = document.getElementById("welcome")
const call = document.getElementById('call')
welcomeForm = welcome.querySelector("form")
// const form = welcome.querySelector('form')

call.hidden = true;

//양쪽 브라우저에서 다 실행됨
async function initMedia() {
    welcome.hidden = true;
    call.hidden = false;
    // 내 장치(카메라 오디오)를 가져옴
    await getMedia();
    makeConnection();

}
//방 이름 넣고 방에 들어가기
async function handleWelcomeSubmit(event) {
    event.preventDefault();
    const input = welcomeForm.querySelector("input")
    //백엔드로 join_room 이벤트로 보내면 같은 이름의 이벤트로 받는다.
    //방에 들어가서 내 장치 가져옴
    await initMedia();
    console.log("방에 들어간다")
    socket.emit('join_room', input.value);
    roomName = input.value;
    input.value = '';
}



welcomeForm.addEventListener('submit', handleWelcomeSubmit)




//--------------SOCKET 관련된 코드 

//먼저 들어온 사람(서호진)
socket.on('welcome', async () => {
    console.log('누군가 들어왔어요!')
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    console.log('offer 보냄!')
    socket.emit('offer', offer, roomName)

})

//나중에 들어온 사람 (학선님)
socket.on('offer', async (offer) => {
    console.log('너 (먼저 들어와있던 사람)offer 받았으')
    //이건 서호진 offer
    //이거 아직 없음 왜냐하면 존나 빨라서
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();

    myPeerConnection.setLocalDescription(answer);
    socket.emit('answer', answer, roomName);
})

//먼저 들어와있던 사람
socket.on('answer', answer => {
    console.log('너(나중에 들어온 사람) 답 받았다')
    myPeerConnection.setRemoteDescription(answer);
})
//서로 정보(offer)교환 끝 그럼 이제 icecandidate server교환만 남음 

socket.on('ice', ice => {
    console.log('candidate 받았어')
    myPeerConnection.addIceCandidate(ice)
})




//---------------------WEB RTC  코드
// 이 함수로 기존에 있던 사람과 들어온 사람의 stream을 연결해준다. 
//즉 peer to peer 연결을 수행한다. 
function makeConnection() {
    myPeerConnection = new RTCPeerConnection({
        //네트워크가 달라도 서로 연결해준다. 
        iceServers: [
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                    "stun:stun3.l.google.com:19302",
                    "stun:stun4.l.google.com:19302",
                ],
            },
        ],
    });
    //answer와 offer 서로 교환 끝나면 이거 필요 
    console.log('내 피어', myPeerConnection)
    myPeerConnection.addEventListener("icecandidate", handleIce)
    myPeerConnection.addEventListener("addstream", handleAddStream);

    // console.log(myStream.getTracks())
    //내 장치들을 offer에 넣어준다.
    myStream.getTracks().forEach(track => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data) {
    console.log('candidate 보냄 ')
    socket.emit('ice', data, candidate, roomName)
    console.log('데이터', data)
}

function handleAddStream(data) {
    console.log("내 피어로부터 이벤트 받았어");
    console.log(data)
}
