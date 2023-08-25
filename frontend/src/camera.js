import React, { useState, useEffect, useRef } from "react";
import socketIOClient from "socket.io-client";

const ENDPOINT = "http://15.206.35.202:4000";

const CameraComponent = () => {
  const [socket, setSocket] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [processedImage, setProcessedImage] = useState(null);
  const videoRef = useRef(null);

  const checkCameraAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop()); // Stop the stream after getting access
      return true; // Access granted
    } catch (error) {
      console.error("Camera access error:", error);
      return false; // Access denied
    }
  };

  useEffect(() => {
    const verifyCameraPermission = async () => {
      const hasAccess = await checkCameraAccess();
      if (!hasAccess) {
        alert(
          "Camera access is required for this application to function correctly."
        );
      }
    };

    verifyCameraPermission();

    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput"
        );
        setCameras(videoDevices);
      })
      .catch((error) => console.error("Error fetching devices: ", error));

    const newSocket = socketIOClient(ENDPOINT);
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on("processed_frame", (data) => {
        setProcessedImage(data.url);
        if (isSending) {
          setTimeout(sendFrame, 5000); // Wait a second after receiving the processed image before sending the next
        }
      });
    }
  }, [socket, isSending]);

  useEffect(() => {
    if (selectedCamera) {
      navigator.mediaDevices
        .getUserMedia({ video: { deviceId: selectedCamera } })
        .then((stream) => (videoRef.current.srcObject = stream));
    }
  }, [selectedCamera]);

  let lastSentTimestamp = 0;
  const sendFrame = () => {
    const now = Date.now();
    if (now - lastSentTimestamp < 5000) return;
    lastSentTimestamp = now;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    // Draw the current frame from the video onto the canvas
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    // Convert the canvas data directly to Blob to avoid unnecessary base64 encoding and decoding
    canvas.toBlob((blob) => {
      const reader = new FileReader();
      reader.onload = () => socket.emit("send_frame", { dataURL: reader.result });
      reader.readAsDataURL(blob);
    }, "image/png");
  };

  const startSendingFrames = () => {
    setIsSending(true);
    sendFrame(); // Send the first frame
  };

  const stopSendingFrames = () => {
    setIsSending(false);
  };

  return (
    <div className="main">
      <h2>Select Camera</h2>
      <select onChange={(e) => setSelectedCamera(e.target.value)}>
        <option value={null}>Select a camera</option>
        {cameras.map((camera, index) => (
          <option key={index} value={camera.deviceId}>
            {camera.label || `Camera ${index + 1}`}
          </option>
        ))}
      </select>

      <div className="camera-container">

        <div style={{ display: "flex", flexDirection: "column" }}>
          <h2>Live Camera Feed</h2>
        <video ref={videoRef} width="320" height="240" autoPlay />
        </div>

        {processedImage && (
          <div>
            <h2>Processed Frame</h2>
            <img
              src={processedImage}
              alt="Processed frame"
              width="320"
              height="240"
            />
          </div>
        )}
      </div>
      {!isSending ? (
        <button onClick={startSendingFrames}>Start Sending Frames</button>
      ) : (
        <button onClick={stopSendingFrames}>Stop Sending Frames</button>
      )}
      <style jsx>{`
        .main {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          background-color: darkgray;
          height: 100vh;
        }
        .camera-container {
          display: flex;
          gap: 50px;
          align-items: center;
          width: 100%;
          justify-content: center;
        }
        button {
          width: 200px;
          height: 50px;
          border-radius: 10px;
          background-color: #4caf50;
          color: white;
          font-size: 16px;
          box-shadow: 0 9px #999;
          border: none;
          cursor: pointer;
        }
        button:active {
          background-color: #3e8e41;
          box-shadow: 0 5px #666;
          transform: translateY(4px);
        }
        select {
          width: 200px;
          height: 50px;
          border-radius: 10px;
          background-color: #4caf50;
          color: white;
          font-size: 16px;
          box-shadow: 0 9px #999;
        }
      `}</style>
    </div>
  );
};

export default CameraComponent;
