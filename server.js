// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";

const { Pool } = pkg;
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(() => console.log("✅ PostgreSQL Connected"))
  .catch(err => console.error("❌ PostgreSQL Connection Error:", err));

// Default route
app.get("/", (req, res) => {
  res.send("✅ Krushi Sevak backend running successfully!");
});

// --------- FORM 1 (Distributor) ------------
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

// --------- FORM 2 (Farmer) ------------
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

// --------- CHAT MESSAGES ------------
app.post("/chat", async (req, res) => {
  const { sender, message } = req.body;
  try {
    await pool.query(
      "CREATE TABLE IF NOT EXISTS chats (id SERIAL PRIMARY KEY, sender TEXT, message TEXT)"
    );
    await pool.query(
      "INSERT INTO chats (sender, message) VALUES ($1, $2)",
      [sender, message]
    );
    res.send("💬 Message saved successfully!");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error saving chat message");
  }
});

// --------- FETCH MESSAGES ------------
app.get("/chats", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM chats ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).send("❌ Error fetching messages");
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
