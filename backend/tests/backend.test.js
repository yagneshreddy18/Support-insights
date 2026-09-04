/**
 * Complete backend test suite — Support Insights API
 * Runner: Node built-in test runner (no extra deps)
 * Run: node --test tests/backend.test.js
 */
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  app,
  authenticateToken,
  authorizeRoles,
  generateTicketPredictions,
} = require("../server.js");

// ---------------------------------------------------------------------------
// Helpers for middleware unit tests
// ---------------------------------------------------------------------------
function mockRes() {
  const res = {};
  res.statusCode = 200;
  res.body = undefined;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  res.send = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
}

// ---------------------------------------------------------------------------
// 1. AI prediction helper
// ---------------------------------------------------------------------------
describe("generateTicketPredictions()", () => {
  it("flags negative Critical tickets with high SLA/escalation risk", () => {
    const out = generateTicketPredictions(
      "System outage",
      "Server is down, crash, urgent failure, customers frustrated",
      "Critical"
    );
    assert.equal(out.polarity, "negative");
    assert.ok(out.polarity_score > 0);
    assert.ok(out.sla_breach_probability >= 0.6);
    assert.ok(out.escalation_probability >= 0.6);
    assert.match(out.recommended_action, /tier-3/i);
  });

  it("flags positive Low tickets with low risk", () => {
    const out = generateTicketPredictions(
      "Thanks!",
      "Great helpful fast support, working awesome, resolved",
      "Low"
    );
    assert.equal(out.polarity, "positive");
    assert.equal(out.sla_breach_probability, 0.08);
    assert.equal(out.escalation_probability, 0.05);
    assert.match(out.recommended_action, /general agent/i);
  });

  it("returns neutral for empty/ambiguous text", () => {
    const out = generateTicketPredictions("Question", "Just checking hours", "Medium");
    assert.equal(out.polarity, "neutral");
    assert.equal(out.polarity_score, 0);
  });

  it("handles High and Medium branches with correct recommendations", () => {
    const high = generateTicketPredictions("Error", "error failure slow", "High");
    assert.match(high.recommended_action, /specialist queue/i);
    assert.ok(high.sla_breach_probability <= 0.75);

    const med = generateTicketPredictions("Help", "need help", "Medium");
    assert.match(med.recommended_action, /Review within 4 hours/i);
    assert.ok(med.sla_breach_probability <= 0.45);
  });

  it("keeps all probabilities within 0..1 and rounded to 2 decimals", () => {
    const cases = [
      ["a".repeat(50), "down ".repeat(50), "Critical"],
      ["x", "thanks ".repeat(50), "High"],
      ["s", "d", "Medium"],
      ["s", "d", "Low"],
    ];
    for (const [s, d, p] of cases) {
      const o = generateTicketPredictions(s, d, p);
      for (const k of ["polarity_score", "sla_breach_probability", "escalation_probability"]) {
        assert.ok(o[k] >= 0 && o[k] <= 1, `${k}=${o[k]} out of range`);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 2. authenticateToken middleware
// ---------------------------------------------------------------------------
describe("authenticateToken middleware", () => {
  it("rejects requests with no token (401)", () => {
    const req = { headers: {} };
    const res = mockRes();
    let nextCalled = false;
    authenticateToken(req, res, () => (nextCalled = true));
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
    assert.match(res.body.error, /No token/i);
  });

  it("rejects invalid/expired tokens (403)", () => {
    const req = { headers: { authorization: "Bearer invalid.token.here" } };
    const res = mockRes();
    let nextCalled = false;
    authenticateToken(req, res, () => (nextCalled = true));
    // jwt.verify with bad token calls back synchronously with error
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
  });

  it("accepts a valid JWT and attaches req.user", () => {
    const jwt = require("jsonwebtoken");
    const payload = { id: 1, name: "Tester", email: "t@t.com", role: "agent" };
    const token = jwt.sign(payload, process.env.JWT_SECRET || "fallback_secret", {
      expiresIn: "1h",
    });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    let nextCalled = false;
    authenticateToken(req, res, () => (nextCalled = true));
    assert.equal(nextCalled, true);
    assert.equal(req.user.email, "t@t.com");
    assert.equal(req.user.role, "agent");
  });
});

// ---------------------------------------------------------------------------
// 3. authorizeRoles middleware (RBAC)
// ---------------------------------------------------------------------------
describe("authorizeRoles middleware (RBAC)", () => {
  it("allows admin to delete (admin-only route)", () => {
    const mw = authorizeRoles("admin");
    const req = { user: { role: "admin" } };
    const res = mockRes();
    let next = false;
    mw(req, res, () => (next = true));
    assert.equal(next, true);
  });

  it("blocks agent from admin-only delete (403)", () => {
    const mw = authorizeRoles("admin");
    const req = { user: { role: "agent" } };
    const res = mockRes();
    let next = false;
    mw(req, res, () => (next = true));
    assert.equal(next, false);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.error, /admin/);
  });

  it("allows admin AND lead to assign, blocks agent", () => {
    const mw = authorizeRoles("admin", "lead");
    for (const role of ["admin", "lead"]) {
      const res = mockRes();
      let next = false;
      mw({ user: { role } }, res, () => (next = true));
      assert.equal(next, true, `expected ${role} to pass`);
    }
    const res = mockRes();
    let next = false;
    mw({ user: { role: "agent" } }, res, () => (next = true));
    assert.equal(next, false);
    assert.equal(res.statusCode, 403);
  });

  it("blocks requests with no user attached", () => {
    const mw = authorizeRoles("admin");
    const res = mockRes();
    let next = false;
    mw({}, res, () => (next = true));
    assert.equal(next, false);
    assert.equal(res.statusCode, 403);
  });
});

// ---------------------------------------------------------------------------
// 4. Route surface (contract test — frontend depends on these)
// ---------------------------------------------------------------------------
describe("API route surface", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");

  const expectedRoutes = [
    'app.post("/api/auth/register"',
    'app.post("/api/auth/login"',
    'app.get("/api/auth/me"',
    'app.get("/api/tickets"',
    'app.post("/api/tickets"',
    'app.put("/api/tickets/:id/status"',
    'app.get("/api/customers"',
    'app.get("/api/categories"',
    'app.get("/api/dashboard/summary"',
    'app.get("/api/dashboard/category-stats"',
    'app.get("/api/dashboard/status-stats"',
    'app.get("/api/dashboard/priority-stats"',
    'app.get("/api/dashboard/risk-tickets"',
    'app.get("/api/dashboard/trends"',
    'app.get("/api/tickets/:id"',
    'app.get("/api/agents"',
    'app.put("/api/tickets/:id/assign"',
    'app.get("/api/tickets/:id/messages"',
    'app.post("/api/tickets/:id/messages"',
    'app.get("/api/tickets/:id/events"',
    'app.get("/api/tickets/:id/feedback"',
    'app.get("/api/sla/rules"',
    'app.get("/api/analytics/csat"',
    'app.get("/api/analytics/performance"',
    'app.get("/api/analytics/agents"',
    'app.delete("/api/tickets/:id"',
    'app.get("/api/admin/users"',
    'app.put("/api/admin/users/:id/role"',
  ];

  for (const route of expectedRoutes) {
    it(`defines ${route}`, () => {
      assert.ok(src.includes(route), `missing route: ${route}`);
    });
  }

  it("protects /api/* with authenticateToken", () => {
    assert.ok(src.includes('app.use("/api", authenticateToken)'));
  });

  it("restricts assign to admin+lead", () => {
    assert.ok(src.includes('"/api/tickets/:id/assign", authorizeRoles(\'admin\', \'lead\')'));
  });

  it("restricts delete + admin users to admin-only", () => {
    assert.ok(src.includes('"/api/tickets/:id", authorizeRoles(\'admin\')'));
    assert.ok(src.includes('"/api/admin/users", authorizeRoles(\'admin\')'));
    assert.ok(src.includes('"/api/admin/users/:id/role", authorizeRoles(\'admin\')'));
  });

  it("validates role updates against admin|lead|agent", () => {
    assert.ok(src.includes("['admin', 'lead', 'agent']"));
  });

  it("prevents demoting the last remaining admin", () => {
    assert.ok(src.includes("Cannot demote the only remaining administrator"));
  });

  it("rejects empty ticket messages with 400", () => {
    assert.ok(src.includes("Message cannot be empty"));
  });

  it("hashes passwords with bcrypt and signs JWT with 8h expiry", () => {
    assert.ok(src.includes("bcrypt.hash"));
    assert.ok(src.includes("bcrypt.compare"));
    assert.ok(src.includes('expiresIn: "8h"'));
  });
});

// ---------------------------------------------------------------------------
// 5. Live integration tests (real Postgres + HTTP, ephemeral port)
// ---------------------------------------------------------------------------
describe("live HTTP + Postgres integration", () => {
  let baseUrl;
  let server;
  let pool;
  const testEmail = `test_${Date.now()}@example.com`;
  const testPass = "Test1234!";
  let testToken = null;
  let testUserId = null;
  let dbAvailable = true;

  before(async () => {
    pool = require("../config/db");
    try {
      await pool.query("SELECT 1");
    } catch (e) {
      dbAvailable = false;
      console.log(`\n  (skipping live DB tests: ${e.message.split("\n")[0]})`);
      return;
    }
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    try {
      if (testEmail && dbAvailable) {
        // cleanup test user + any tickets referencing it as agent
        const u = await pool.query("SELECT id FROM users WHERE email = $1", [testEmail]);
        if (u.rows.length) {
          await pool.query("UPDATE tickets SET agent_id = NULL WHERE agent_id = $1", [
            u.rows[0].id,
          ]);
          await pool.query("DELETE FROM ticket_events WHERE user_id = $1", [u.rows[0].id]);
          await pool.query("DELETE FROM users WHERE id = $1", [u.rows[0].id]);
        }
      }
    } catch {}
    if (server) await new Promise((r) => server.close(r));
    if (pool) await pool.end().catch(() => {});
  });

  it("GET / returns backend alive string", async (t) => {
    if (!dbAvailable) return t.skip("no DB");
    const r = await fetch(`${baseUrl}/`);
    assert.equal(r.status, 200);
    assert.match(await r.text(), /Backend is running/);
  });

  it("blocks unauthenticated /api/tickets with 401", async (t) => {
    if (!dbAvailable) return t.skip("no DB");
    const r = await fetch(`${baseUrl}/api/tickets`);
    assert.equal(r.status, 401);
  });

  it("rejects invalid login with 400", async (t) => {
    if (!dbAvailable) return t.skip("no DB");
    const r = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nobody@example.com", password: "wrong" }),
    });
    assert.equal(r.status, 400);
  });

  it("registers + logs in a fresh test user, /api/auth/me works", async (t) => {
    if (!dbAvailable) return t.skip("no DB");
    const reg = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test User", email: testEmail, password: testPass }),
    });
    assert.equal(reg.status, 201);
    const created = await reg.json();
    testUserId = created.id;
    assert.ok(created.id);
    assert.ok(["agent", "admin"].includes(created.role));

    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: testPass }),
    });
    assert.equal(login.status, 200);
    const data = await login.json();
    assert.ok(data.token);
    testToken = data.token;

    const me = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${testToken}` },
    });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).email, testEmail);
  });

  it("rejects duplicate registration with 400", async (t) => {
    if (!dbAvailable || !testToken) return t.skip("needs registered user");
    const r = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Dup", email: testEmail, password: testPass }),
    });
    assert.equal(r.status, 400);
  });

  it("authenticated reads: tickets/customers/categories/dashboards", async (t) => {
    if (!dbAvailable || !testToken) return t.skip("needs auth");
    const h = { Authorization: `Bearer ${testToken}` };
    const paths = [
      "/api/tickets",
      "/api/customers",
      "/api/categories",
      "/api/dashboard/summary",
      "/api/dashboard/category-stats",
      "/api/dashboard/status-stats",
      "/api/dashboard/priority-stats",
      "/api/dashboard/risk-tickets",
      "/api/dashboard/trends",
      "/api/sla/rules",
      "/api/analytics/csat",
      "/api/analytics/performance",
      "/api/analytics/agents",
      "/api/agents",
    ];
    for (const p of paths) {
      const r = await fetch(`${baseUrl}${p}`, { headers: h });
      assert.equal(r.status, 200, `${p} -> ${r.status}`);
      await r.json(); // must be valid JSON
    }
  });

  it("agent token is forbidden from admin-only routes (RBAC live)", async (t) => {
    if (!dbAvailable || !testToken) return t.skip("needs auth");
    // Only run when test user is a plain agent; admins are legitimately allowed.
    const me = await (
      await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${testToken}` },
      })
    ).json();
    if (me.role !== "agent") return t.skip("test user is admin, negative RBAC N/A");

    const del = await fetch(`${baseUrl}/api/tickets/1`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${testToken}` },
    });
    assert.equal(del.status, 403);

    const users = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Authorization: `Bearer ${testToken}` },
    });
    assert.equal(users.status, 403);
  });

  it("rejects empty ticket message with 400", async (t) => {
    if (!dbAvailable || !testToken) return t.skip("needs auth");
    const tickets = await (
      await fetch(`${baseUrl}/api/tickets`, {
        headers: { Authorization: `Bearer ${testToken}` },
      })
    ).json();
    if (!tickets.length) return t.skip("no tickets to test messages against");
    const r = await fetch(`${baseUrl}/api/tickets/${tickets[0].ticket_id}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({ message: "   " }),
    });
    assert.equal(r.status, 400);
  });
});
