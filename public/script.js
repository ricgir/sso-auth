const BASE = "http://localhost:5000";

// -------- REGISTER --------
async function register() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await fetch(BASE + "/register", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  alert(data.message || data.error);

  if (data.message) {
    window.location.href = "/login.html";
  }
}

// -------- LOGIN --------
async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await fetch(BASE + "/login", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    credentials: "include",
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.error);
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect") || "http://localhost:3000";

  window.location.href = redirect;
}
// -------- CHECK SESSION (SSO MAGIC) --------
async function checkAuthAndLoad() {
  try {
    const res = await fetch(BASE + "/check-auth", {
      credentials: "include"
    });

    if (!res.ok) {
      throw new Error("Not logged in");
    }

    const user = await res.json();

    document.getElementById("welcome").innerText =
      "Welcome " + user.username;

  } catch {
    window.location.href =
      BASE + "/login.html?redirect=" + window.location.origin;
  }
}

// -------- LOGOUT --------
async function logout() {
  await fetch(BASE + "/logout", {
    method: "POST",
    credentials: "include"
  });

  window.location.href =
    BASE + "/login.html?redirect=" + window.location.origin;
}