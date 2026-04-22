require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(express.json());

app.use(cors());

app.use(express.static("public"));


const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: process.env.DB_PASSWORD,
  database: "sso_auth",
});

// ---------- REGISTER ----------
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, hash],
    (err) => {
      if (err) {
        console.log(err);   // 🔥 IMPORTANT
        return res.status(500).json({ error: err.message });
        }
      res.json({ message: "Registered successfully" });
    }
  );
});

// ---------- LOGIN ----------
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, results) => {

      if (results.length === 0)
        return res.status(401).json({ error: "User not found" });

      const user = results[0];

      const valid = await bcrypt.compare(password, user.password);

      if (!valid)
        return res.status(401).json({ error: "Wrong password" });

      // ✅ CREATE TOKEN
      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET || "supersecret",
        { expiresIn: "1h" }
      );

      res.json({ message: "Login successful", token });
    }
  );
});


app.get("/check-auth", (req, res) => {
  let token = req.headers.authorization;
  if (token && token.startsWith("Bearer ")) {
    token = token.slice(7);
  }

  if (!token) return res.status(401).json({ error: "No token" });

  jwt.verify(token, process.env.JWT_SECRET || "supersecret", (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid token" });
    res.json(decoded);
  });
});

app.post("/logout", (req, res) => {
  // Tokens are stateless, but we can return success
  res.json({ message: "Logged out from SSO" });
});

app.listen(5000, () => console.log("Auth Server running on 5000"));