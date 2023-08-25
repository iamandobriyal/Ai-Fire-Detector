const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path"); // Added for path resolution

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST"],
  },
});

let counter = 0;

io.on("connection", (socket) => {
  console.log("New client connected");
  socket.on("send_frame", (imageData) => {
    if (!imageData || typeof imageData.dataURL !== "string") {
      console.error("Received invalid imageData:", imageData);
      return;
    }

    console.log("Received frame" + counter++);

    const base64Data = imageData.dataURL.replace(
      /^data:image\/png;base64,/,
      ""
    );
    fs.writeFileSync("frames/current_frame.jpg", base64Data, "base64");

    exec(
      "python3 detect.py --source frames/current_frame.jpg --weights ../models/best.pt --conf 0.2",
      (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        }



        const processedImagePath = path.resolve(
          __dirname,
          "results/current_frame.jpg"
        );

        // Convert processed image to base64
        const processedImage = fs.readFileSync(processedImagePath);
        const base64Image = `data:image/jpeg;base64,${processedImage.toString(
          "base64"
        )}`;

        // Send processed image to frontend
        socket.emit("processed_frame", { url: base64Image });
        console.log("Sent processed frame");
      }
    );
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});


const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
