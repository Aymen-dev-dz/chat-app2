const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 📂 Vérifier si dossier uploads existe
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// ⚙️ Config multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// 📌 Route pour uploader fichier
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });
  res.json({ url: "/uploads/" + req.file.filename, name: req.file.originalname });
});

let users = {};

io.on("connection", (socket) => {
  console.log("✅ Un utilisateur est connecté");

  socket.on("set username", (username) => {
    users[socket.id] = username || "Anonyme";
    io.emit("user list", Object.values(users));
    io.emit("chat message", { user: "System", text: `${users[socket.id]} a rejoint` });
  });

  socket.on("chat message", (msg) => {
    if (!msg.trim()) return;
    io.emit("chat message", { user: users[socket.id] || "Anonyme", text: msg });
  });

  socket.on("chat file", (data) => {
    io.emit("chat file", data);
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];
    delete users[socket.id];
    io.emit("user list", Object.values(users));
    if (user) {
      io.emit("chat message", { user: "System", text: `${user} a quitté` });
    }
  });
});

server.listen(3000, () => console.log("🚀 Serveur lancé sur http://localhost:3000"));
