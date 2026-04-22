const express = require("express");
const axios = require("axios");

const app = express();

app.use(express.static("public"));

// Middleware to verify token
const auth = async (req, res, next) => {
  try {
    const response = await axios.get(
      "http://localhost:5000/check-auth",
      {
        headers: {
          cookie: req.headers.cookie   // 🔥 CRITICAL FIX
        }
      }
    );

    req.user = response.data;
    next();

  } catch {
    return res.redirect(
      "http://localhost:5000/login.html?redirect=http://localhost:3000"
    );
  }
};

// Protected route
app.get("/dashboard", auth, (req, res) => {
  res.send(`Welcome ${req.user.username} to App1`);
});

app.listen(3000, () => console.log("App1 running on 3000"));