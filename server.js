const http = require("http");
const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3000);
const CLIENT_ID = String(process.env.GITHUB_CLIENT_ID || "").trim();
const CLIENT_SECRET = String(process.env.GITHUB_CLIENT_SECRET || "").trim();
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const ROOT = __dirname;
const CALLBACK_PATH = "/api/auth/github/callback";
const REGISTERED_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || "https://stoping0.github.io/komok-translate/";

function publicOrigin(req) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0];
  const forwardedHost = String(req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000").split(",")[0];
  return `${forwardedProto}://${forwardedHost}`;
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "").split(";").filter(Boolean).map((part) => {
    const index = part.indexOf("=");
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }));
}

function cookie(name, value, maxAge = 900, extra = "") {
  return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax; Secure${extra ? `; ${extra}` : ""}`;
}

function sign(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

function encodeSession(user) {
  const payload = Buffer.from(JSON.stringify({ user, exp: Date.now() + 1000 * 60 * 60 * 24 * 14 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeSession(value) {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  const expected = sign(payload || "");
  if (!payload || !signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.exp > Date.now() ? data.user : null;
  } catch {
    return null;
  }
}

function json(res, status, data, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(JSON.stringify(data));
}

function requestJson(urlString, options = {}, body) {
  return new Promise((resolve, reject) => {
    const target = new URL(urlString);
    const req = https.request({ hostname: target.hostname, path: `${target.pathname}${target.search}`, method: options.method || "GET", headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) } }, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { text += chunk; });
      res.on("end", () => {
        let data;
        try { data = JSON.parse(text); } catch { data = { raw: text }; }
        if (res.statusCode >= 400) return reject(new Error(`GitHub returned ${res.statusCode}`));
        resolve(data);
      });
    });
    req.on("error", reject);
    req.setTimeout(15000, () => req.destroy(new Error("GitHub request timed out")));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function githubUser(accessToken) {
  const user = await requestJson("https://api.github.com/user", { headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "Komok-Translate" } });
  let email = user.email;
  if (!email) {
    const emails = await requestJson("https://api.github.com/user/emails", { headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "Komok-Translate" } });
    email = emails.find((item) => item.primary)?.email || emails[0]?.email || null;
  }
  return { id: String(user.id), login: user.login, name: user.name || user.login, avatar: user.avatar_url, email };
}

function serveStatic(req, res, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(ROOT, requested));
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return json(res, 404, { error: "Not found" });
  const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };
  res.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream", "Cache-Control": "no-cache" });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname === "/_app/health") return json(res, 200, { ok: true, service: "komok-translate" });
    if (url.pathname === "/api/me") return json(res, 200, { user: decodeSession(parseCookies(req).komok_session) });
    if (url.pathname === "/api/logout" && req.method === "POST") return json(res, 200, { ok: true }, { "Set-Cookie": cookie("komok_session", "", 0) });
    if (url.pathname === "/api/auth/github") {
      if (!CLIENT_ID || !CLIENT_SECRET) return json(res, 503, { error: "GitHub OAuth is not configured yet." });
      const state = crypto.randomBytes(24).toString("hex");
      const auth = new URL("https://github.com/login/oauth/authorize");
      auth.searchParams.set("client_id", CLIENT_ID);
      auth.searchParams.set("redirect_uri", REGISTERED_REDIRECT_URI);
      auth.searchParams.set("scope", "read:user user:email");
      auth.searchParams.set("state", state);
      res.writeHead(302, { Location: auth.toString(), "Set-Cookie": cookie("komok_oauth_state", state) });
      return res.end();
    }
    if (url.pathname === CALLBACK_PATH) {
      const cookies = parseCookies(req);
      if (!url.searchParams.get("code") || !cookies.komok_oauth_state || cookies.komok_oauth_state !== url.searchParams.get("state")) return json(res, 400, { error: "Invalid OAuth state." });
      const token = await requestJson("https://github.com/login/oauth/access_token", { method: "POST" }, { client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code: url.searchParams.get("code"), redirect_uri: REGISTERED_REDIRECT_URI });
      if (!token.access_token) return json(res, 401, { error: "GitHub token exchange failed." });
      const user = await githubUser(token.access_token);
      res.writeHead(302, { Location: "/", "Set-Cookie": [cookie("komok_session", encodeSession(user), 60 * 60 * 24 * 14), cookie("komok_oauth_state", "", 0)] });
      return res.end();
    }
    return serveStatic(req, res, url.pathname);
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Authentication service error." });
  }
});

server.listen(PORT, "0.0.0.0", () => console.log(`Komok Translate listening on ${PORT}`));
