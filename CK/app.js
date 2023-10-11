// Copyright 2023 The MediaPipe Authors.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//      http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.4";
// const demosSection = document.getElementById("demos");
let handLandmarker = undefined;
let runningMode = "IMAGE";
let enableWebcamButton;
let webcamRunning = false;
function argMax(array) {
  const indexMax = array.map((x, i) => [x, i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1];
  return indexMax;
}

// Before we can use HandLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.

async function createHandLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.4/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU"
    },
    runningMode: runningMode,
    numHands: 1
  });
  // demosSection.classList.remove("invisible");
};
let video
let display
// const canvasElement = document.getElementById(
//   "output_canvas"
// );
// const canvasCtx = canvasElement.getContext("2d");

// Check if webcam access is supported.


// If webcam supported, add event listener to button for when user
// wants to activate it.
// if (hasGetUserMedia()) {
//   enableWebcamButton = document.getElementById("webcamButton");
//   enableWebcamButton.addEventListener("click", enableCam);
// } else {
//   console.warn("getUserMedia() is not supported by your browser");
// }

// Enable the live webcam view and start detection.
let executeFunction
function enableCam(executeMotion) {
  if (!handLandmarker) {
    console.log("Wait! objectDetector not loaded yet.");
    return;
  }
  webcamRunning = !webcamRunning
  executeFunction = (digits) => {
    executeMotion(digits)
  }
  // if (webcamRunning === true) {
  //   webcamRunning = false;
  //   enableWebcamButton.innerText = "ENABLE PREDICTIONS";
  // } else {
  //   webcamRunning = true;
  //   enableWebcamButton.innerText = "DISABLE PREDICTIONS";
  // }

  // getUsermedia parameters.
  const constraints = {
    video: true
  };

  // Activate the webcam stream.
  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    // console.log("Stream", stream)
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
  });
}

let lastVideoTime = -1;
let results = undefined;
console.log(video);
//onnx setup
const session = new onnx.InferenceSession();
const outputData = await session.loadModel("./ck_1.onnx");

let output_digits = 8;
// classes_check = ["peace_inverted", "rock", "three", "three2", "two_up_inverted", "two_up", "call", "dislike", "fist", "four", "like", "mute", "ok", "one", "palm", "peace", "stop", "stop_inverted", "no_gesture"]
async function predictWebcam() {
  // canvasElement.style.width = video.videoWidth;;
  // canvasElement.style.height = video.videoHeight;
  // canvasElement.width = video.videoWidth;
  // canvasElement.height = video.videoHeight;

  // Now let's start detecting the stream.
  // console.log("Cam get")
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await handLandmarker.setOptions({ runningMode: "VIDEO" });
  }
  let startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    results = handLandmarker.detectForVideo(video, startTimeMs);
  }
  // canvasCtx.save();
  // canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  // if (results.landmarks) {
  //     for (const landmarks of results.landmarks) {
  //         drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
  //             color: "#00FF00",
  //             lineWidth: 5
  //         });
  //         drawLandmarks(canvasCtx, landmarks, { color: "#FF0000", lineWidth: 1 });
  //     }
  // }
  // const flatArray = [].concat(...results.landmarks);
  // const arrayOfObjectsWithoutZ = flatArray.map(obj => {
  //   const { z, ...rest } = obj; // Destructure the object, omitting 'z'
  //   return rest; // Return the object without 'z'
  // });
  // const transformedArray = arrayOfObjectsWithoutZ.map(obj => [obj.x, obj.y]);
  // const flattenedArray = transformedArray.flat();
  const flatArray = [].concat(...results.landmarks);
  // console.log("results" ,results)
  let flattenedArray = []
  flatArray.forEach(obj => {
    flattenedArray.push(obj.x)
    flattenedArray.push(obj.y)
  })
  // console.log('flattened',flattenedArray)
  if (flattenedArray.length===42) {
    const inferenceInputs = [new Tensor(flattenedArray, 'float32', [1, 42,1])];
    const output_raw = await session.run(inferenceInputs);
    const outputTensor = output_raw.values().next().value;
    const output_array = Array.from(outputTensor.data);
    output_digits = argMax(output_array);
    console.log(output_array[output_digits])
  } else {
    output_digits = 7;
  }
  // console.log(output_digits);
  // display(output_digits)
  // canvasCtx.restore();
  executeFunction(output_digits)
  // Call this function again to keep predicting when the browser is ready.
  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}

function initVar(vid,displayMessage) {
  video = vid
  display = displayMessage
  createHandLandmarker()
}

export {
  initVar,
  enableCam
}