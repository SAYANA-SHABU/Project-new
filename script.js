const video = document.getElementById("video");

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceExpressionNet.loadFromUri("/models"),
  faceapi.nets.ageGenderNet.loadFromUri("/models"),
]).then(webCam);

function webCam() {
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: false,
    })
    .then((stream) => {
      video.srcObject = stream;
    })
    .catch((error) => {
      console.log(error);
    });
}

video.addEventListener("play", () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);

  faceapi.matchDimensions(canvas, { height: video.height, width: video.width });

  // Create an array to store the last few age predictions
  const ageHistory = [];

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions()
      .withAgeAndGender();

    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

    const resizedResults = faceapi.resizeResults(detections, {
      height: video.height,
      width: video.width,
    });

    faceapi.draw.drawDetections(canvas, resizedResults);
    faceapi.draw.drawFaceLandmarks(canvas, resizedResults);
    faceapi.draw.drawFaceExpressions(canvas, resizedResults);

    resizedResults.forEach(detection => {
      // Debugging: Print detected gender and age
      console.log(`Detected Gender: ${detection.gender}`);
      console.log(`Detected Age: ${detection.age}`);

      // Add the current age prediction to the history
      ageHistory.push(detection.age);

      // Keep only the last 10 predictions
      if (ageHistory.length > 10) ageHistory.shift();

      // Calculate the average age from the history
      const avgAge = ageHistory.reduce((sum, age) => sum + age, 0) / ageHistory.length;

      // Adjust the average age as needed
      const correctionFactor = 2; // Adjust based on observed discrepancies
      const adjustedAge = avgAge + correctionFactor;

      // Calculate age range
      const lowerBound = Math.floor(adjustedAge / 5) * 5;
      const upperBound = lowerBound + 5;
      const ageRange = `${lowerBound}-${upperBound}`;
      
      const box = detection.detection.box;
      const drawBox = new faceapi.draw.DrawBox(box, {
        label: `${ageRange} years old ${detection.gender}`,
      });

      drawBox.draw(canvas);
    });

  }, 100);
});
