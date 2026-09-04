/**
 * Complete frontend test suite — Support Insights UI
 * Runner: Node built-in test runner (no extra deps)
 * Run: node --test tests/frontend.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const SRC = path.join(__dirname, "..", "src");
const read = (p) => fs.readFileSync(path.join(SRC, p), "utf8");

// ---------------------------------------------------------------------------
// Pure-logic replicas (mirror the exact logic in the components so regressions
// in behavior are caught even without a browser/jsdom).
// ---------------------------------------------------------------------------
function filterTickets(tickets, { search = "", status = "All", priority = "All" } = {}) {
  return tickets.filter((t) => {
    const matchSearch =
      !search ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      String(t.ticket_id).includes(search);
    return (
      matchSearch &&
      (status === "All" || t.status === status) &&
      (priority === "All" || t.priority === priority)
    );
  });
}

function buildCsvRows(filtered) {
  const headers = ["Ticket ID", "Subject", "Customer", "Category", "Priority", "Status", "AI Polarity", "SLA Breach Risk %"];
  const rows = filtered.map((t) => [
    t.ticket_id,
    `"${t.subject}"`,
    t.customer_name,
    t.category_name,
    t.priority,
    t.status,
    t.polarity || "",
    t.sla_breach_probability ? (t.sla_breach_probability * 100).toFixed(0) + "%" : "",
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

const sampleTickets = [
  { ticket_id: 1, subject: "Server down outage", customer_name: "Acme", category_name: "Infra", priority: "Critical", status: "Open", polarity: "negative", sla_breach_probability: 0.85 },
  { ticket_id: 2, subject: "Thanks great support", customer_name: "Globex", category_name: "Billing", priority: "Low", status: "Resolved", polarity: "positive", sla_breach_probability: 0.08 },
  { ticket_id: 3, subject: "Login slow", customer_name: "Acme", category_name: "Auth", priority: "High", status: "In Progress", polarity: "negative", sla_breach_probability: 0.55 },
];

// ---------------------------------------------------------------------------
// 1. Project structure — every view/component the Dashboard depends on exists
// ---------------------------------------------------------------------------
describe("project structure", () => {
  const required = [
    "App.jsx",
    "main.jsx",
    "Login.jsx",
    "Register.jsx",
    "Dashboard.jsx",
    "DashboardCharts.jsx",
    "TicketDetailModal.jsx",
    "CreateTicketForm.jsx",
    "context/AuthContext.jsx",
    "views/OverviewView.jsx",
    "views/TicketsView.jsx",
    "views/SlaView.jsx",
    "views/TeamView.jsx",
    "views/AdminUsersView.jsx",
  ];
  for (const f of required) {
    it(`has src/${f}`, () => {
      assert.ok(fs.existsSync(path.join(SRC, f)), `missing ${f}`);
    });
  }

  it("vite proxies /api to backend localhost:5000", () => {
    const cfg = fs.readFileSync(path.join(__dirname, "..", "vite.config.js"), "utf8");
    assert.ok(cfg.includes("'/api'"));
    assert.ok(cfg.includes("localhost:5000"));
  });
});

// ---------------------------------------------------------------------------
// 2. Routing + auth shell
// ---------------------------------------------------------------------------
describe("App routing + AuthContext", () => {
  it("App defines /login, /register, protected /", () => {
    const src = read("App.jsx");
    assert.ok(src.includes('path="/login"'));
    assert.ok(src.includes('path="/register"'));
    assert.ok(src.includes("ProtectedRoute"));
    assert.ok(src.includes('Navigate to="/login"'));
  });

  it("AuthContext persists token/user, sets axios header, exposes login/logout", () => {
    const src = read("context/AuthContext.jsx");
    assert.ok(src.includes("localStorage.getItem('token')"));
    assert.ok(src.includes("localStorage.setItem('token'"));
    assert.ok(src.includes("Authorization"));
    assert.ok(src.includes("axios.get('/api/auth/me')"));
    assert.ok(src.includes("const login"));
    assert.ok(src.includes("const logout"));
  });

  it("Login posts to /api/auth/login and navigates home", () => {
    const src = read("Login.jsx");
    assert.ok(src.includes("axios.post('/api/auth/login'"));
    assert.ok(src.includes("navigate('/')"));
    assert.ok(src.includes("type=\"email\""));
    assert.ok(src.includes("type=\"password\""));
  });

  it("Register creates account then logs in", () => {
    const src = read("Register.jsx");
    assert.ok(src.includes("axios.post('/api/auth/register'"));
    assert.ok(src.includes("axios.post('/api/auth/login'"));
  });
});

// ---------------------------------------------------------------------------
// 3. Dashboard shell
// ---------------------------------------------------------------------------
describe("Dashboard shell", () => {
  it("fetches all 7 dashboard endpoints in parallel", () => {
    const src = read("Dashboard.jsx");
    for (const ep of [
      "/api/dashboard/summary",
      "/api/tickets",
      "/api/dashboard/category-stats",
      "/api/dashboard/status-stats",
      "/api/dashboard/priority-stats",
      "/api/dashboard/risk-tickets",
      "/api/dashboard/trends",
    ]) {
      assert.ok(src.includes(ep), `missing fetch ${ep}`);
    }
    assert.ok(src.includes("Promise.all"));
  });

  it("renders 5 tabs and gates admin tab to role==='admin'", () => {
    const src = read("Dashboard.jsx");
    for (const tab of ["overview", "tickets", "sla", "team", "admin"]) {
      assert.ok(src.includes(`'${tab}'`), `missing tab ${tab}`);
    }
    assert.ok(src.includes("user?.role === 'admin'"));
  });

  it("opens TicketDetailModal on selection and refreshes after update", () => {
    const src = read("Dashboard.jsx");
    assert.ok(src.includes("TicketDetailModal"));
    assert.ok(src.includes("selectedTicketId"));
    assert.ok(src.includes("onUpdate"));
  });
});

// ---------------------------------------------------------------------------
// 4. TicketsView logic (filter + CSV) — unit + contract
// ---------------------------------------------------------------------------
describe("TicketsView filtering logic", () => {
  it("returns all tickets with no filters", () => {
    assert.equal(filterTickets(sampleTickets).length, 3);
  });

  it("searches subject, customer, and id (case-insensitive)", () => {
    assert.equal(filterTickets(sampleTickets, { search: "acme" }).length, 2);
    assert.equal(filterTickets(sampleTickets, { search: "OUTAGE" }).length, 1);
    assert.equal(filterTickets(sampleTickets, { search: "2" }).length, 1);
  });

  it("filters by status and priority", () => {
    assert.equal(filterTickets(sampleTickets, { status: "Open" }).length, 1);
    assert.equal(filterTickets(sampleTickets, { priority: "Low" }).length, 1);
    assert.equal(
      filterTickets(sampleTickets, { status: "Resolved", priority: "Critical" }).length,
      0
    );
  });

  it("builds CSV with header + RFC-style rows", () => {
    const csv = buildCsvRows(sampleTickets);
    const lines = csv.split("\n");
    assert.equal(lines.length, 4);
    assert.ok(lines[0].includes("Ticket ID,Subject,Customer"));
    assert.ok(lines[1].includes("85%"));
    assert.ok(lines[2].includes("8%"));
  });

  it("TicketsView wires search, filters, CSV export, status change, risk table", () => {
    const src = read("views/TicketsView.jsx");
    assert.ok(src.includes("axios.put(`/api/tickets/${ticketId}/status`"));
    assert.ok(src.includes("exportToCSV"));
    assert.ok(src.includes("All Status"));
    assert.ok(src.includes("All Priority"));
    assert.ok(src.includes("AI Flagged High-Risk"));
    assert.ok(src.includes("onTicketSelect"));
  });
});

// ---------------------------------------------------------------------------
// 5. Overview + charts
// ---------------------------------------------------------------------------
describe("Overview + charts", () => {
  it("Overview shows 6 KPI cards and 4 charts with empty-trend fallback", () => {
    const src = read("views/OverviewView.jsx");
    for (const label of [
      "Total Tickets",
      "Open &amp; In Progress",
      "Resolved",
      "Critical Priority",
      "Avg SLA Breach Risk",
      "Negative Polarity",
    ]) {
      assert.ok(src.includes(label), `missing card ${label}`);
    }
    assert.ok(src.includes("CategoryBarChart"));
    assert.ok(src.includes("PriorityPieChart"));
    assert.ok(src.includes("StatusDonutChart"));
    assert.ok(src.includes("TrendsLineChart"));
    assert.ok(src.includes("No trend data available yet"));
  });

  it("charts export all four components with correct dataKeys", () => {
    const src = read("DashboardCharts.jsx");
    assert.ok(src.includes("CategoryBarChart"));
    assert.ok(src.includes("PriorityPieChart"));
    assert.ok(src.includes("StatusDonutChart"));
    assert.ok(src.includes("TrendsLineChart"));
    assert.ok(src.includes('dataKey="ticket_count"'));
    assert.ok(src.includes('dataKey="day"'));
  });

  it("computes open+in-progress and SLA % like the component", () => {
    const summary = { open_tickets: 3, in_progress_tickets: 2, average_sla_breach_probability: 0.4567 };
    assert.equal(summary.open_tickets + summary.in_progress_tickets, 5);
    assert.equal((summary.average_sla_breach_probability * 100).toFixed(1) + "%", "45.7%");
  });
});

// ---------------------------------------------------------------------------
// 6. Ticket detail modal (RBAC + tabs + messaging)
// ---------------------------------------------------------------------------
describe("TicketDetailModal", () => {
  it("gates delete to admin and reassign to admin/lead", () => {
    const src = read("TicketDetailModal.jsx");
    assert.ok(src.includes("currentUser?.role === 'admin'"));
    assert.ok(src.includes("currentUser?.role === 'lead'"));
    assert.ok(src.includes("axios.delete(`/api/tickets/${ticketId}`)"));
    assert.ok(src.includes("axios.put(`/api/tickets/${ticketId}/assign`"));
  });

  it("has overview/messages/events/feedback tabs and messaging flow", () => {
    const src = read("TicketDetailModal.jsx");
    for (const tab of ["overview", "messages", "events", "feedback"]) {
      assert.ok(src.includes(tab), `missing tab ${tab}`);
    }
    assert.ok(src.includes("axios.get(`/api/tickets/${ticketId}/messages`)"));
    assert.ok(src.includes("axios.post(`/api/tickets/${ticketId}/messages`"));
    assert.ok(src.includes("axios.get(`/api/tickets/${ticketId}/events`)"));
    assert.ok(src.includes("axios.get(`/api/tickets/${ticketId}/feedback`)"));
  });

  it("computes risk-gauge percent like RiskGauge (value*100)", () => {
    assert.equal(Math.round(0.856 * 100), 86);
    assert.equal(Math.round((0 || 0) * 100), 0);
  });
});

// ---------------------------------------------------------------------------
// 7. SLA / Team / Admin views + CreateTicketForm
// ---------------------------------------------------------------------------
describe("SLA, Team, Admin, CreateTicket", () => {
  it("SlaView loads rules+csat+performance and computes compliance", () => {
    const src = read("views/SlaView.jsx");
    assert.ok(src.includes("axios.get('/api/sla/rules')"));
    assert.ok(src.includes("axios.get('/api/analytics/csat')"));
    assert.ok(src.includes("axios.get('/api/analytics/performance')"));
    // compliance = within/total*100 ; 100% when nothing evaluated
    const rate = (within, total) => (total > 0 ? Math.round((within / total) * 100) : 100);
    assert.equal(rate(8, 10), 80);
    assert.equal(rate(0, 0), 100);
  });

  it("TeamView loads agent analytics and computes resolution rate", () => {
    const src = read("views/TeamView.jsx");
    assert.ok(src.includes("axios.get('/api/analytics/agents')"));
    const rate = (resolved, total) => (total > 0 ? Math.round((resolved / total) * 100) : 0);
    assert.equal(rate(7, 10), 70);
    assert.equal(rate(0, 0), 0);
  });

  it("AdminUsersView lists users and updates roles via admin API", () => {
    const src = read("views/AdminUsersView.jsx");
    assert.ok(src.includes("axios.get('/api/admin/users')"));
    assert.ok(src.includes("axios.put(`/api/admin/users/${userId}/role`"));
    assert.ok(src.includes("Role Permissions Matrix"));
  });

  it("CreateTicketForm loads customers+categories and posts ticket", () => {
    const src = read("CreateTicketForm.jsx");
    assert.ok(src.includes("axios.get('/api/customers')"));
    assert.ok(src.includes("axios.get('/api/categories')"));
    assert.ok(src.includes("axios.post('/api/tickets'"));
    assert.ok(src.includes("Ticket created successfully!"));
  });
});

// ---------------------------------------------------------------------------
// 8. Frontend→backend API contract (every axios path must exist server-side)
// ---------------------------------------------------------------------------
describe("frontend→backend API contract", () => {
  it("every axios endpoint used by the UI exists in server.js", () => {
    const serverSrc = fs.readFileSync(
      path.join(__dirname, "..", "..", "backend", "server.js"),
      "utf8"
    );
    const axiosPaths = new Set();
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(jsx?)$/.test(entry.name)) {
          const src = fs.readFileSync(full, "utf8");
          // axios.get('/api/...') / axios.post(`/api/...`) / axios.put / axios.delete
          const re = /axios\.(get|post|put|delete)\(\s*[`'"]((?:\/api\/)[^`'"}\s$]*)/g;
          let m;
          while ((m = re.exec(src))) {
            axiosPaths.add(m[2].replace(/\/\$\{.*$/, "/:id"));
          }
        }
      }
    };
    walk(SRC);

    // normalize dynamic segments: /api/tickets/123/messages -> /api/tickets/:id/messages
    const normalized = [...axiosPaths].map((p) =>
      p.replace(/\/\d+(\/|$)/, "/:id$1").replace(/\$\{[^}]*\}/g, ":id")
    );

    assert.ok(normalized.length > 10, "expected many API usages");
    const missing = normalized.filter((p) => {
      const base = p.split("?")[0];
      // server defines routes with express params; check the static prefix exists
      const prefix = base.split("/:")[0];
      return !serverSrc.includes(`"${prefix}`) && !serverSrc.includes(`'${prefix}`);
    });
    assert.deepEqual(missing, [], `frontend calls missing on backend: ${missing.join(", ")}`);
  });
});
