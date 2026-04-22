const BASE = `http://${window.location.hostname}:5000`;

// -------- AUTO LOGIN IF REMEMBERED --------
window.onload = async () => {
  const params = new URLSearchParams(window.location.search);
  
  if (params.get("action") === "logout") {
    localStorage.removeItem("token");
    window.history.replaceState({}, document.title, window.location.pathname);
    return; // Don't auto-login, actually log them out!
  }

  const token = localStorage.getItem("token");
  if (!token) return;

  const redirect = params.get("redirect");

  if (redirect && window.location.pathname.includes("/login.html")) {
    try {
      const res = await fetch(BASE + "/check-auth", {
        headers: { "Authorization": "Bearer " + token }
      });
      if (res.ok) {
        let finalRedirect = redirect;
        if (finalRedirect.includes("?")) {
          finalRedirect += "&token=" + token;
        } else {
          finalRedirect += "?token=" + token;
        }
        window.location.href = finalRedirect;
      } else {
        localStorage.removeItem("token");
      }
    } catch {
      localStorage.removeItem("token");
    }
  }
};

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
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.error);
    return;
  }

  localStorage.setItem("token", data.token);

  const params = new URLSearchParams(window.location.search);
  let redirect = params.get("redirect") || window.location.origin;

  if (redirect.includes("?")) {
    redirect += "&token=" + data.token;
  } else {
    redirect += "?token=" + data.token;
  }

  window.location.href = redirect;
}
// -------- CHECK SESSION (SSO MAGIC) --------
async function checkAuthAndLoad() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(BASE + "/check-auth", {
      headers: { "Authorization": token ? "Bearer " + token : "" }
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
  localStorage.removeItem("token");
  await fetch(BASE + "/logout", {
    method: "POST"
  });

  window.location.href =
    BASE + "/login.html?redirect=" + window.location.origin;
}