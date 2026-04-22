const express = require("express");
const axios = require("axios");

const app = express();

app.use(express.static("public"));

// Middleware to verify token
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    if (!token) throw new Error("No token");

    const response = await axios.get(
      "http://localhost:5000/check-auth",
      {
        headers: {
          Authorization: token
        }
      }
    );

    req.user = response.data;
    next();

  } catch {
    const host = req.hostname;
    const origin = req.protocol + "://" + req.get("host");
    return res.redirect(
      `http://${host}:5000/login.html?redirect=${origin}`
    );
  }
};

// Protected route
app.get("/dashboard", auth, (req, res) => {
  res.send(`Welcome ${req.user.username} to App2`);
});

// ⚠️ Different port
app.listen(4000, () => console.log("App2 running on 4000"));