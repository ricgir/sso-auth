require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(express.json());

app.use(express.static("public"));

const session = require("express-session");
const cookieParser = require("cookie-parser");

app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:4000"],
  credentials: true
}));

app.use(cookieParser());

app.use(session({
  name: "sso_session",   // 🔥 important (custom name)
  secret: "supersecret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,        // true only with HTTPS
    sameSite: "lax"       // 🔥 VERY IMPORTANT
  }
}));


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

      // ✅ STORE SESSION
      req.session.user = {
        id: user.id,
        username: user.username
      };

      res.json({ message: "Login successful" });
    }
  );
});


app.get("/check-auth", (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ error: "Not logged in" });
  }
});

// ---------- VERIFY ----------
app.get("/verify", (req, res) => {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ error: "No token" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid token" });
    res.json(decoded);
  });
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("sso_session"); // 🔥 MUST match session name
    res.json({ message: "Logged out" });
  });
});

app.get("/debug", (req, res) => {
  res.json({
    session: req.session,
    cookies: req.cookies
  });
});

app.listen(5000, () => console.log("Auth Server running on 5000"));