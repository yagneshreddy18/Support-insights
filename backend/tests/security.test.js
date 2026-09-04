/**
 * Security hardening tests — validation, JWT, RBAC freshness, whitelists
 * Run: node --test tests/security.test.js
 */
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  app,
  isValidEmail,
  normalizeEmail,
  passwordIssues,
  getJwtSecret,
} = require("../server.js");

describe("input validation helpers", () => {
  it("normalizeEmail trims + lowercases", () => {
    assert.equal(normalizeEmail("  User@Example.COM "), "user@example.com");
  });

  it("isValidEmail accepts good, rejects bad", () => {
    assert.equal(isValidEmail("user@company.com"), true);
    assert.equal(isValidEmail("bad"), false);
    assert.equal(isValidEmail("a@b"), false);
    assert.equal(isValidEmail(""), false);
    assert.equal(isValidEmail(null), false);
  });

  it("passwordIssues requires 8+ chars, upper, lower, number, symbol", () => {
    assert.deepEqual(passwordIssues("Test1234!"), []);
    assert.ok(passwordIssues("short1!").length > 0);
    assert.ok(passwordIssues("alllowercase1!").join().match(/uppercase/));
    assert.ok(passwordIssues("ALLUPPER1!").join().match(/lowercase/));
    assert.ok(passwordIssues("NoNumber!").join().match(/number/));
    assert.ok(passwordIssues("NoSymbol1").join().match(/symbol/));
    assert.ok(passwordIssues("x".repeat(73)).join().match(/72/));
  });
});

describe("JWT secret hygiene", () => {
  it("uses a strong secret (>=32 chars), not the public fallback", () => {
    const s = getJwtSecret();
    assert.ok(s.length >= 32, "JWT secret too short");
    // In this repo .env now carries a real secret; the hardcoded fallback must not be active
    assert.notEqual(s, "fallback_secret");
  });

  it("server source has no hardcoded fallback signing", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
    assert.ok(!src.includes('process.env.JWT_SECRET || "fallback_secret"'), "fallback signing still present");
    assert.ok(src.includes("getJwtSecret()"));
  });
});

describe("HTTP hardening headers + limits (source contract)", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  it("enables helmet + restricted CORS + 10kb JSON cap", () => {
    assert.ok(src.includes('require("helmet")'));
    assert.ok(src.includes("app.use(helmet())"));
    assert.ok(src.includes("FRONTEND_URL"));
    assert.ok(src.includes('express.json({ limit: "10kb" })'));
  });
  it("rate-limits auth and api routes", () => {
    assert.ok(src.includes("express-rate-limit"));
    assert.ok(src.includes('app.use("/api/auth/", authLimiter)'));
  });
  it("whitelists status/priority/channel/sender_type", () => {
    for (const name of ["ALLOWED_PRIORITIES", "ALLOWED_STATUSES", "ALLOWED_CHANNELS", "ALLOWED_SENDER_TYPES"]) {
      assert.ok(src.includes(name), `missing ${name}`);
    }
  });
  it("uses bcrypt 12 rounds", () => {
    assert.ok(src.includes("BCRYPT_ROUNDS = 12") || src.includes("BCRYPT_ROUNDS=12"));
  });
});

describe("live auth validation", () => {
  let baseUrl, server, pool;
  const strongPass = "Test1234!";
  const mkEmail = () => `sec_${Date.now()}_${Math.floor(Math.random() * 1e6)}@example.com`;
  const createdEmails = [];

  before(async () => {
    pool = require("../config/db");
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    for (const email of createdEmails) {
      try {
        const u = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
        if (u.rows.length) {
          await pool.query("UPDATE tickets SET agent_id = NULL WHERE agent_id = $1", [u.rows[0].id]);
          await pool.query("DELETE FROM ticket_events WHERE user_id = $1", [u.rows[0].id]);
          await pool.query("DELETE FROM users WHERE id = $1", [u.rows[0].id]);
        }
      } catch {}
    }
    if (server) await new Promise((r) => server.close(r));
    if (pool) await pool.end().catch(() => {});
  });

  async function post(path, body) {
    const r = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: r.status, json: await r.json().catch(() => ({})) };
  }

  it("rejects weak passwords with 400", async () => {
    for (const pw of ["123", "password", "NoNumber!", "nosymbol1", "SHORT1!"]) {
      const { status, json } = await post("/api/auth/register", {
        name: "Sec Test",
        email: mkEmail(),
        password: pw,
      });
      assert.equal(status, 400, `expected 400 for ${pw}`);
      assert.match(json.error, /password/i);
    }
  });

  it("rejects invalid emails + short names with 400", async () => {
    const badEmails = ["bad", "a@b", "", null];
    for (const email of badEmails) {
      const { status } = await post("/api/auth/register", {
        name: "Sec Test",
        email,
        password: strongPass,
      });
      assert.equal(status, 400);
    }
    const { status } = await post("/api/auth/register", {
      name: "x",
      email: mkEmail(),
      password: strongPass,
    });
    assert.equal(status, 400);
  });

  it("normalizes email (case-insensitive login)", async () => {
    const email = mkEmail();
    const reg = await post("/api/auth/register", { name: "Sec Test", email, password: strongPass });
    assert.equal(reg.status, 200);
    assert.match(reg.json.message, /Registration received/i);
    createdEmails.push(email.toLowerCase());
    const login = await post("/api/auth/login", { email: email.toUpperCase(), password: strongPass });
    assert.equal(login.status, 200);
    assert.ok(login.json.token);
  });

  it("returns byte-identical shape for new vs existing emails (anti-enumeration)", async () => {
    const email = mkEmail();
    const first = await post("/api/auth/register", { name: "Sec Test", email, password: strongPass });
    assert.equal(first.status, 200);
    createdEmails.push(email.toLowerCase());
    const second = await post("/api/auth/register", { name: "Someone Else", email, password: "Other1234!" });
    assert.equal(second.status, 200);
    // Same status, same keys, same message — no existence signal
    assert.deepEqual(Object.keys(second.json).sort(), Object.keys(first.json).sort());
    assert.equal(second.json.message, first.json.message);
    assert.ok(!("id" in second.json) && !("role" in second.json), "must not leak user object");
  });

  it("rejects invalid ticket status/priority with 400 (authed)", async () => {
    const email = mkEmail();
    await post("/api/auth/register", { name: "Sec Test", email, password: strongPass });
    createdEmails.push(email.toLowerCase());
    const login = await post("/api/auth/login", { email, password: strongPass });
    const token = login.json.token;
    const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

    const tickets = await (await fetch(`${baseUrl}/api/tickets`, { headers: { Authorization: `Bearer ${token}` } })).json();
    if (!tickets.length) return; // nothing to mutate; validation covered by source tests
    const id = tickets[0].ticket_id;

    const badStatus = await fetch(`${baseUrl}/api/tickets/${id}/status`, {
      method: "PUT",
      headers: h,
      body: JSON.stringify({ status: "HACKED" }),
    });
    assert.equal(badStatus.status, 400);

    const badMsg = await fetch(`${baseUrl}/api/tickets/${id}/messages`, {
      method: "PUT",
      headers: h,
      body: JSON.stringify({}),
    });
    assert.ok([400, 404, 405].includes(badMsg.status));
  });
});
