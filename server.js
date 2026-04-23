require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const app = express();

app.use(express.json());

app.use(cors());

app.use(express.static("public"));

app.get("/config", (req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID });
});

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "sso_auth",
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

// ---------- GOOGLE LOGIN ----------
app.post("/auth/google", async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: "No credential provided" });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, sub: google_id, name } = payload;

    // Check if user exists by email or google_id
    db.query(
      "SELECT * FROM users WHERE email = ? OR google_id = ?",
      [email, google_id],
      (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length > 0) {
          // User exists, generate SSO token
          const user = results[0];
          const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET || "supersecret",
            { expiresIn: "1h" }
          );
          return res.json({ message: "Login successful", token });
        } else {
          // New user -> register and login
          db.query(
            "INSERT INTO users (username, email, google_id) VALUES (?, ?, ?)",
            [email, email, google_id],
            (insertErr, insertResult) => {
              if (insertErr) {
                console.error(insertErr);
                return res.status(500).json({ error: insertErr.message });
              }
              const token = jwt.sign(
                { id: insertResult.insertId, username: email },
                process.env.JWT_SECRET || "supersecret",
                { expiresIn: "1h" }
              );
              return res.json({ message: "Registered and logged in successfully", token });
            }
          );
        }
      }
    );
  } catch (err) {
    console.error("Error verifying token:", err);
    res.status(401).json({ error: "Invalid Google token" });
  }
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