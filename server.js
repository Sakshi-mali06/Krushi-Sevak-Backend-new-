// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import http from "http";
import { Server } from "socket.io";

const { Pool } = pkg;
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP + Socket server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(() => console.log("✅ PostgreSQL Connected"))
  .catch(err => console.error("❌ PostgreSQL Connection Error:", err));

// --------- Create messages table for chat ---------
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_type TEXT,
        sender_id TEXT,
        receiver_id TEXT,
        message TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✅ Messages table ready");
  } catch (err) {
    console.error("❌ Error creating messages table:", err);
  }
})();

// --------- Root route ---------
app.get("/", (req, res) => {
  res.send("✅ Krushi Sevak backend running successfully!");
});

// --------- Form routes ---------
app.post("/register-distributor", async (req, res) => {
  const { name, mobile, location, product_type, password } = req.body;
  try {
    await pool.query(
      "CREATE TABLE IF NOT EXISTS distributors (id SERIAL PRIMARY KEY, name TEXT, mobile TEXT, location TEXT, product_type TEXT, password TEXT)"
    );
    await pool.query(
      "INSERT INTO distributors (name, mobile, location, product_type, password) VALUES ($1, $2, $3, $4, $5)",
      [name, mobile, location, product_type, password]
    );
    res.send("✅ Distributor registered successfully!");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error registering distributor");
  }
});

app.post("/register-farmer", async (req, res) => {
  const { name, mobile, location, password } = req.body;
  try {
    await pool.query(
      "CREATE TABLE IF NOT EXISTS farmers (id SERIAL PRIMARY KEY, name TEXT, mobile TEXT, location TEXT, password TEXT)"
    );
    await pool.query(
      "INSERT INTO farmers (name, mobile, location, password) VALUES ($1, $2, $3, $4)",
      [name, mobile, location, password]
    );
    res.send("✅ Farmer registered successfully!");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error registering farmer");
  }
});

// --------- Chat routes ---------

// Fetch chat history for a user
app.get("/chat-history/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM messages WHERE sender_id=$1 OR receiver_id=$1 ORDER BY timestamp ASC",
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error fetching chat history");
  }
});

// --------- Socket.IO chat ---------
io.on("connection", (socket) => {
  console.log("🟢 A user connected:", socket.id);

  // User sends message
  socket.on("userMessage", async (text) => {
    console.log("💬 User:", text);

    try {
      await pool.query(
        "INSERT INTO messages (sender_type, sender_id, receiver_id, message) VALUES ($1, $2, $3, $4)",
        ["user", socket.id, "admin", text]
      );
      io.emit("newUserMessage", { id: socket.id, text });
    } catch (err) {
      console.error("❌ Error saving user message:", err);
    }
  });

  // Admin joins
  socket.on("joinAdmin", () => {
    console.log("🟣 Admin joined:", socket.id);
  });

  // Admin reply
  socket.on("adminReply", async (data) => {
    const { userId, text } = data;

    try {
      await pool.query(
        "INSERT INTO messages (sender_type, sender_id, receiver_id, message) VALUES ($1, $2, $3, $4)",
        ["admin", "admin", userId, text]
      );
      io.to(userId).emit("newAdminMessage", text);
      socket.emit("replySent", { userId, text });
    } catch (err) {
      console.error("❌ Error saving admin message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

