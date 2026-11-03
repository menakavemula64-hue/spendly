/* Demo authentication for the portfolio version of Spendly.
 *
 * IMPORTANT: this runs only in the browser. Accounts are saved in localStorage,
 * so it is NOT real security. It exists to show the login / register /
 * forgot-password / reset-password user flow. The "email" is a demo inbox
 * shown on the page. */
const ACCOUNTS = "spendly_accounts";
const SESSION = "spendly_session";
const TOKENS = "spendly_reset_tokens";
const $ = (id) => document.getElementById(id);

// ---- tiny storage helpers (safe if storage is blocked) ----
const read = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (e) { return fallback; }
};
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} };

// ---- helpers ----
const randomId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

async function hashPassword(password, salt) {
  try {
    const bytes = new TextEncoder().encode(salt + password);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (e) {
    return salt + password; // very old browsers only
  }
}

function message(text, ok) {
  const box = $("msg");
  box.textContent = text || "";
  box.className = "msg " + (ok ? "ok" : "err");
  box.hidden = !text;
}

function login(email) {
  try { localStorage.setItem(SESSION, email); } catch (e) {}
  location.href = "index.html";
}

// ---- page setup ----
const form = $("auth-form");
const kind = form.dataset.kind;
const params = new URLSearchParams(location.search);

let loggedIn = null;
try { loggedIn = localStorage.getItem(SESSION); } catch (e) {}
if (loggedIn && (kind === "login" || kind === "register")) location.replace("index.html");

if (kind === "login" && params.get("reset")) {
  message("Password updated. Please log in with your new password.", true);
}

if (kind === "reset") {
  const tokens = read(TOKENS, {});
  const t = tokens[params.get("token")];
  if (!t || t.expires < Date.now()) {
    message("This reset link is invalid or has expired. Please request a new one.", false);
    form.querySelector("button").disabled = true;
  }
}

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  message("");
  const email = $("email") ? $("email").value.trim().toLowerCase() : "";
  const password = $("password") ? $("password").value : "";
  const accounts = read(ACCOUNTS, {});

  try {
    if (kind === "login") {
      const acc = accounts[email];
      if (!acc || (await hashPassword(password, acc.salt)) !== acc.hash) {
        return message("Invalid email or password.", false);
      }
      login(email);

    } else if (kind === "register") {
      if (password.length < 8) return message("Password must be at least 8 characters.", false);
      if (password !== $("confirm").value) return message("Passwords do not match.", false);
      if (accounts[email]) return message("An account with this email already exists.", false);
      const salt = randomId();
      accounts[email] = { salt, hash: await hashPassword(password, salt) };
      write(ACCOUNTS, accounts);
      login(email);

    } else if (kind === "forgot") {
      if (accounts[email]) {
        const token = randomId() + randomId();
        const tokens = read(TOKENS, {});
        tokens[token] = { email, expires: Date.now() + 60 * 60 * 1000 }; // valid 1 hour
        write(TOKENS, tokens);
        $("reset-link").href = "reset.html?token=" + token;
        $("inbox").hidden = false;
        message("Reset link created. In a real app it would be emailed to you.", true);
      } else {
        $("inbox").hidden = true;
        message("If an account exists for that email, a reset link has been sent. (Demo: the inbox below appears only for registered emails.)", true);
      }

    } else if (kind === "reset") {
      if (password.length < 8) return message("Password must be at least 8 characters.", false);
      if (password !== $("confirm").value) return message("Passwords do not match.", false);
      const tokens = read(TOKENS, {});
      const token = params.get("token");
      const t = tokens[token];
      if (!t || t.expires < Date.now() || !accounts[t.email]) {
        return message("This reset link is invalid or has expired. Please request a new one.", false);
      }
      const salt = randomId();
      accounts[t.email] = { salt, hash: await hashPassword(password, salt) };
      write(ACCOUNTS, accounts);
      delete tokens[token];            // a reset link works only once
      write(TOKENS, tokens);
      location.href = "login.html?reset=1";   // back to the login page
    }
  } catch (e) {
    message("Something went wrong. Please try again.", false);
  }
});
