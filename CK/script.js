import {
    GestureRecognizer,
    FilesetResolver,
    DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";


import {
    initVar,
    enableCam
} from './app.js'

const DEFAULT_ROBOT_PROFILE = "RPI_BW_001";

const deviceNamePrefixMap = {
    ESP_CW_001: "CoPlay",
    RPI_BW_001: "BBC",
};
/**
 * Bluetooth UUID
 */
const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_RX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
const UART_TX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";

const PI_READY = "Raspberry pi ready"
const Wifi_SS_MSG = "Wifi connected";
const Wifi_PWD_MSG = "Wifi connect failed";
const Wifi_SSID_MSG = "Wifi connect failed";
const Wifi_PARSING_MSG = "Parsing failed";
const BLT_SUCCESS_MSG = "Bluetooth connected";
const BLT_FAIL_MSG = "Bluetooth connection failed";
const WS_FAIL_MSG = "Server connect failed"
const WS_SS_MASG = "Server connected"
// /*Prototype*/

// /*Initializing variable */
// function initializeDOMElements();
// function initializeVariables();
// /*Bluetooth func */
// async function bluetoothPairing();
// async function connectToBluetoothDevice(deviceNamePrefix);
// function disconnectFromBluetoothDevice(device);
// async function sendMessageToDeviceOverBluetooth(message, device);
// function sendMediaServerInfo();
// /*Websocket function */
// async function openWebSocket();
// function keepWebSocketAlive(webSocket, interval);
// function stop();
// /*Entry point*/
// async function main();
// /*Webcam function */
// function hasGetUserMedia();
// function enableCam(event);

// let controlCommandMap = {
//     Closed_Fist: "N",
//     Open_Palm: "W",
//     Pointing_Up: "S",
//     Thumb_Up: "E",
//     Victory: "STOP",
//   };

const {
    pairButton,
    sendMediaServerInfoButton,
    openWebSocketButton,
    stopButton,
    video,
    pairTab,
    gestureTab,
    loader,
} = initializeDOMElements();
let {
    device,
    websocket,
    networkConfig,
    gestureRecognizer,
    runningMode,
    controlCommandMap,
    lastDirection,
    lastVideoTime,
    resultsDetect,
    videoHeight,
    videoWidth,
    // cameraId,
} = initializeVariables();

function initializeDOMElements() {
    const pairButton = document.getElementById("pairButton");
    const sendMediaServerInfoButton = document.getElementById(
        "sendMediaServerInfoButton"
    );
    const openWebSocketButton = document.getElementById("openWebSocketButton");
    const stopButton = document.getElementById("stopButton");
    const video = document.getElementById("videoElement");
    const pairTab = document.getElementById("pairTab");
    const gestureTab = document.getElementById("gestureTab");
    const loader = document.getElementById("loader");
    return {
        pairButton,
        sendMediaServerInfoButton,
        openWebSocketButton,
        stopButton,
        video,
        pairTab,
        gestureTab,
        loader,
    };
}
function initializeVariables() {
    let device;
    let websocket;
    let networkConfig = {};
    let gestureRecognizer;
    let runningMode = "VIDEO";
    let controlCommandMap = {
        0: "N",
        1: "FCC",
        2: "FCW",
        3: "CCW",
        4: "CW",
        5: "S",
        6: "STOP",
        7: "STOP"
    };
    let lastDirection;
    let lastVideoTime = -1;
    let resultsDetect = undefined;
    const videoHeight = "360px";
    const videoWidth = "480px";
    // let cameraId;
    return {
        device,
        websocket,
        networkConfig,
        gestureRecognizer,
        runningMode,
        controlCommandMap,
        lastDirection,
        lastVideoTime,
        resultsDetect,
        videoHeight,
        videoWidth,
        // cameraId,
    };
}

async function bluetoothPairing() {
    const robotSelect = document.getElementById("robotSelect");
    const robotNameInput = document.getElementById("robotNameInput");
    loadding();
    device = await connectToBluetoothDevice(
        deviceNamePrefixMap[robotSelect.value] ?? undefined
    );
    loaded();
    popUp("BLT_SUCCESS");
    robotNameInput.value = device.name;
}

function sendMediaServerInfo() {
    const ssidInput = document.getElementById("ssidInput");
    const passwordInput = document.getElementById("passwordInput");
    const hostInput = document.getElementById("hostInput");
    const portInput = document.getElementById("portInput");
    const channelInput = document.getElementById("channelInput");
    const robotSelect = document.getElementById("robotSelect");

    networkConfig = {
        ssid: ssidInput.value,
        password: passwordInput.value,
        host: hostInput.value,
        port: portInput.value,
        channel: "instant",
        channel_name: channelInput.value,
    };

    const devicePort =
        window.location.protocol.replace(/:$/, "") === "http"
            ? networkConfig.port
            : networkConfig.port - 1;

    if (device) {
        const metricData = {
            type: "metric",
            data: {
                server: {
                    ssid: networkConfig.ssid,
                    password: networkConfig.password,
                    host: networkConfig.host,
                    port: devicePort,
                    path: `pang/ws/pub?channel=instant&name=${networkConfig.channel_name}&track=video&mode=bundle`,
                },
                profile: robotSelect.value,
            },
        };
        loadding();
        sendMessageToDeviceOverBluetooth(JSON.stringify(metricData), device);
        onReadMessagefromDeviceOverBluetooth(device)
    }
}

function executeMotion(digits) {
    // if (Object.keys(controlCommandMap).includes(digits)) {
    //     const direction = co
    // }
    const direction = controlCommandMap[digits]
    console.log("Direction ", direction)
    displayMessage(`Send '${direction}' command`);
    if (direction !== lastDirection) {
        lastDirection = direction;
        console.log("Sending")
        const controlCommand = {
            type: "control",
            direction: direction,
        };
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify(controlCommand));
            console.log(`Send '${JSON.stringify(controlCommand)}' command`)
            displayMessage(`Send '${JSON.stringify(controlCommand)}' command`);
        }
    }
}

async function openWebSocket() {
    // enableCam();
    sendMessageToDeviceOverBluetooth("RESET$", device)
    enableCam(executeMotion)
    const path = `pang/ws/sub?channel=instant&name=${networkConfig.channel_name}&track=video&mode=bundle`;
    const serverURL = `${window.location.protocol.replace(/:$/, "") === "https" ? "wss" : "ws"
        }://${networkConfig.host}:${networkConfig.port}/${path}`;

    websocket = new WebSocket(serverURL);
    websocket.binaryType = "arraybuffer";
    websocket.onopen = async () => {

        displayMessage(`Connected to ${serverURL}`);

        const videoDecoder = new VideoDecoder({
            output: handleChunk,
            error: (error) => console.error(error),
        });
        const videoDecoderConfig = {
            codec: "avc1.42E03C",
        };
        if (!(await VideoDecoder.isConfigSupported(videoDecoderConfig))) {
            throw new Error("VideoDecoder configuration is not supported.");
        }
        videoDecoder.configure(videoDecoderConfig);
        websocket.onmessage = (e) => {
            try {
                // console.log("WS message")
                if (videoDecoder.state === "configured") {
                    const encodedChunk = new EncodedVideoChunk({
                        type: "key",
                        data: e.data,
                        timestamp: e.timeStamp,
                        duration: 0,
                    });

                    videoDecoder.decode(encodedChunk);
                }
            } catch (error) {
                console.error(error);
            }
        };
    }
    keepWebSocketAlive(websocket);
}
function handleChunk(frame) {
    const canvasElement = document.getElementById("canvasElement");

    drawVideoFrameOnCanvas(canvasElement, frame);
    frame.close();
}
function drawVideoFrameOnCanvas(canvas, frame) {
    // console.log("drawing video frame on canvas");

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
}
function stop() {
    websocket.close();
    disconnectFromBluetoothDevice(device);
}
const createGestureRecognizer = async () => {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU"
        },
        runningMode: runningMode
    });
};

// async function detectHandGestureFromVideo(gestureRecognizer, stream) {
//     if (!gestureRecognizer) return;
//     const video = document.getElementById("videoElement");
//     const videoTrack = stream.getVideoTracks()[0];
//     const capturedImage = new ImageCapture(videoTrack);
//     while (true) {
//         await capturedImage.grabFrame().then((imageBitmap) => {
//             const detectedGestures = gestureRecognizer.recognize(imageBitmap);

//             const {
//                 landmarks,
//                 worldLandmarks,
//                 handednesses,
//                 gestures,
//             } = detectedGestures;

//             if (gestures[0]) {
//                 const gesture = gestures[0][0].categoryName;

//                 if (Object.keys(controlCommandMap).includes(gesture)) {
//                     const direction = controlCommandMap[gesture];
//                     if (direction !== lastDirection) {
//                         lastDirection = direction;

//                         const controlCommand = {
//                             type: "control",
//                             direction,
//                         };
//                         // if (websocket && websocket.readyState === WebSocket.OPEN) {
//                         if (1) {
//                             websocket.send(JSON.stringify(controlCommand));
//                             displayMessage(`Send '${direction}' command`);
//                         }
//                     }
//                 }
//             }
//         });
//     }
// }

async function connectToBluetoothDevice(deviceNamePrefix) {
    const options = {
        filters: [
            { namePrefix: deviceNamePrefix },
            { services: [UART_SERVICE_UUID] },
        ].filter(Boolean),
    };

    try {
        device = await navigator.bluetooth.requestDevice(options);
        console.log("Found Bluetooth device: ", device);

        await device.gatt?.connect();
        console.log("Connected to GATT server");

        return device;
    } catch (error) {
        console.error(error);
    }
}

function disconnectFromBluetoothDevice(device) {
    if (device.gatt?.connected) {
        device.gatt.disconnect();
    } else {
        console.log("Bluetooth Device is already disconnected");
    }
}

async function sendMessageToDeviceOverBluetooth(message, device) {
    const MAX_MESSAGE_LENGTH = 15;
    const messageArray = [];

    // Split message into smaller chunks
    while (message.length > 0) {
        const chunk = message.slice(0, MAX_MESSAGE_LENGTH);
        message = message.slice(MAX_MESSAGE_LENGTH);
        messageArray.push(chunk);
    }

    if (messageArray.length > 1) {
        messageArray[0] = `${messageArray[0]}#${messageArray.length}$`;
        for (let i = 1; i < messageArray.length; i++) {
            messageArray[i] = `${messageArray[i]}$`;
        }
    }

    console.log("Connecting to GATT Server...");
    const server = await device.gatt?.connect();

    console.log("Getting UART Service...");
    const service = await server?.getPrimaryService(UART_SERVICE_UUID);

    console.log("Getting UART RX Characteristic...");
    const rxCharacteristic = await service?.getCharacteristic(
        UART_RX_CHARACTERISTIC_UUID
    );

    // Check GATT operations is ready to write
    if (rxCharacteristic?.properties.write) {
        // Send each chunk to the device
        for (const chunk of messageArray) {
            try {
                await rxCharacteristic?.writeValue(new TextEncoder().encode(chunk));
                console.log(`Message sent: ${chunk}`);
            } catch (error) {
                console.error(`Error sending message: ${error}`);
            }
        }
    }
}

let lastNoti

//read data from bluetooth
async function onReadMessagefromDeviceOverBluetooth(device) {
    console.log("Start reading")
    const server = await device.gatt?.connect();
    const service = await server?.getPrimaryService(UART_SERVICE_UUID);
    const txCharacteristic = await service?.getCharacteristic(
        UART_TX_CHARACTERISTIC_UUID
    );
    const Characteristic = await txCharacteristic.startNotifications()
    Characteristic.addEventListener('characteristicvaluechanged', (e) => {
        let noti = new TextDecoder("utf-8").decode(e.target.value);
        console.log("Wifi", new TextDecoder("utf-8").decode(e.target.value))
        if (noti == lastNoti) return
        lastNoti = noti
        if (noti == "PUB_WIFI_SUCCESS") {
            popUp("Wifi_SS");
        } else if (noti == "PUB_PARSING_FAILED") {
            popUp("Wifi_PARSING");
        } else if (noti == "PUB_WIFI_PWD_FAILED") {
            popUp("Wifi_PWD");
        } else if (noti == "PUB_WIFI_SSID_FAILE") {
            popUp("Wifi_SSID");
        } else if (noti == "PUB_WS_CONNECTED") {
            popUp("WS_SUCCESS")
        } else if (noti == "PUB_WS_FAILED") {
            popUp("WS_FAIL_MSG")
        }
    })
    loaded();
}

// async function getVideoStream({
//     deviceId,
//     idealWidth,
//     idealHeight,
//     idealFrameRate,
// }) {
//     return navigator.mediaDevices.getUserMedia({
//         video: deviceId
//             ? {
//                 deviceId,
//                 width: { min: 640, ideal: idealWidth },
//                 height: { min: 400, ideal: idealHeight },
//                 frameRate: { ideal: idealFrameRate, max: 120 },
//             }
//             : true,
//     });
// }
function displayMessage(messageContent) {
    const messageView = document.getElementById("messageView");

    if (typeof messageContent == "object") {
        messageContent = JSON.stringify(messageContent);
    }
    messageView.innerHTML += `${messageContent}\n`;
    messageView.scrollTop = messageView.scrollHeight;
}

function keepWebSocketAlive(webSocket, interval) {
    const pingInterval = interval ?? 10000;
    let pingTimer;

    function sendPing() {
        if (webSocket.readyState === WebSocket.OPEN) {
            webSocket.send("ping");
        }
    }

    function schedulePing() {
        pingTimer = setInterval(sendPing, pingInterval);
    }

    function handlePong() { }

    function handleWebSocketClose() {
        clearInterval(pingTimer);
    }

    webSocket.addEventListener("open", () => {
        schedulePing();
    });

    webSocket.addEventListener("message", (event) => {
        if (event.data === "pong") {
            handlePong();
        }
    });

    webSocket.addEventListener("close", () => {
        handleWebSocketClose();
    });
}
function pairSwitch() {
    console.log("pairSwitch");
    document.getElementById("gesturePage").style.display = "none";
    document.getElementById("pairPage").style.display = "block";
    document.getElementsByClassName("tab-slider")[0].style.left = "0%";
}
function gestureSwitch() {
    console.log("gestureSwitch");
    document.getElementById("pairPage").style.display = "none";
    document.getElementById("gesturePage").style.display = "block";
    document.getElementsByClassName("tab-slider")[0].style.left = "50%";
}

async function main() {
    initVar(video, displayMessage)
    // document.addEventListener("DOMContentLoaded", () => {
    pairButton.addEventListener("click", bluetoothPairing);
    sendMediaServerInfoButton.addEventListener("click", sendMediaServerInfo);
    openWebSocketButton.addEventListener("click", openWebSocket);
    stopButton.addEventListener("click", stop);
    pairTab.addEventListener("click", pairSwitch);
    gestureTab.addEventListener("click", gestureSwitch);
    // });

    await createGestureRecognizer();
    if (hasGetUserMedia()) {
        console.log("hasGetUserMedia");
    } else {
        console.warn("getUserMedia() is not supported by your browser");
    }
}
main();


// const canvasElement = document.getElementById("output_canvas");
// const canvasCtx = canvasElement.getContext("2d");
// const gestureOutput = document.getElementById("gesture_output");

// Check if webcam access is supported.
function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/* */
function loadding() {
    loader.style.display = "flex";
}
function loaded() {
    loader.style.display = "none";
}
function popUp(noti) {
    createToast(noti);
}

const toasts = {
    PI_READY: {
        status: "success",
        msg: PI_READY
    },
    Wifi_SS: {
        status: "success",
        msg: Wifi_SS_MSG,
    },
    Wifi_PWD: {
        status: "error",
        msg: Wifi_PWD_MSG,
    },
    Wifi_SSID: {
        status: "error",
        msg: Wifi_SSID_MSG,
    },
    Wifi_PARSING: {
        status: "error",
        msg: Wifi_PARSING_MSG,
    },
    BLT_SUCCESS: {
        status: "success",
        msg: BLT_SUCCESS_MSG
    },
    BLT_FAIL: {
        status: "error",
        msg: BLT_FAIL_MSG,
    },
    WS_SUCCESS: {
        status: "success",
        msg: WS_SS_MASG
    },
    WS_FAIL_MSG: {
        status: "error",
        msg: WS_FAIL_MSG
    }
}

function createToast(noti) {
    console.log(toasts.BLT_SUCCESS.status);
    let toast = document.createElement('div');
    toast.className = ` toast ${toasts[noti].status}`;
    toast.innerHTML = ` <span class="msg">${toasts[noti].msg}</span><span class="countdown"></span>`;
    document.querySelector('#toasts').appendChild(toast)

    setTimeout(() => {
        toast.style.animation = 'hide_slide 1s ease forwards'
    }, 4000)
    setTimeout(() => {
        toast.remove()
    }, 6000)
}





// Enable the live webcam view and start detection.
// function enableCam(event) {
//     if (!gestureRecognizer) {
//         alert("Please wait for gestureRecognizer to load");
//         return;
//     }
//     // getUsermedia parameters.
//     const constraints = {
//         video: true
//     };

//     // Activate the webcam stream.
//     navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
//         video.srcObject = stream;
//         video.addEventListener("loadeddata", predictWebcam);
//     });
// }

// async function predictWebcam() {
//     let nowInMs = Date.now();
//     if (video.currentTime !== lastVideoTime) {
//         lastVideoTime = video.currentTime;
//         resultsDetect = gestureRecognizer.recognizeForVideo(video, nowInMs);
//     }
//     // canvasCtx.save();
//     // canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
//     // const drawingUtils = new DrawingUtils(canvasCtx);
//     // canvasElement.style.height = videoHeight;
//     // canvasElement.style.width = videoWidth;
//     // video.style.width = videoWidth;
//     // video.style.height = videoHeight;
//     // if (results.landmarks) {
//     //   for (const landmarks of results.landmarks) {
//     //     drawingUtils.drawConnectors(
//     //       landmarks,
//     //       GestureRecognizer.HAND_CONNECTIONS,
//     //       {
//     //         color: "#00FF00",
//     //         lineWidth: 5
//     //       }
//     //     );
//     //     drawingUtils.drawLandmarks(landmarks, {
//     //       color: "#FF0000",
//     //       lineWidth: 2
//     //     });
//     //   }
//     // }
//     // canvasCtx.restore();
//     if (resultsDetect.gestures.length > 0) {
//         // gestureOutput.style.display = "block";
//         // gestureOutput.style.width = videoWidth;
//         const categoryName = resultsDetect.gestures[0][0].categoryName;
//         const categoryScore = parseFloat(
//             resultsDetect.gestures[0][0].score * 100
//         ).toFixed(2);
//         const handedness = resultsDetect.handednesses[0][0].displayName;
//         displayMessage(`GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore} %\n Handedness: ${handedness}`);
//         // gestureOutput.innerText = `GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore} %\n Handedness: ${handedness}`;
//     } else {
//         // gestureOutput.style.display = "none";
//     }
//     window.requestAnimationFrame(predictWebcam);
// }

// popUp("WS_FAIL_MSG")