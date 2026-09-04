const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const pool = require("./config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.disable("x-powered-by");

// Security headers (CSP, HSTS, noSniff, frameguard, etc.)
app.use(helmet());

// Restrict CORS to the frontend origin instead of wide-open "*".
// Set FRONTEND_URL in .env for production (e.g. https://app.yourdomain.com).
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({
    origin: (origin, cb) => {
        // Allow same-origin / curl / mobile (no Origin header) and the configured frontend
        if (!origin || origin === FRONTEND_URL) return cb(null, true);
        // In development, also allow any localhost vite port for convenience
        if (process.env.NODE_ENV !== "production" && /^http:\/\/localhost:\d+$/.test(origin)) {
            return cb(null, true);
        }
        return cb(new Error("CORS blocked: origin not allowed"));
    },
    credentials: true,
}));

// Cap JSON payload size to blunt large-payload DoS
app.use(express.json({ limit: "10kb" }));

// Resolve JWT secret — fail fast in production instead of silently using a
// publicly-known fallback (anyone reading the repo could forge admin tokens).
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (secret && secret.length >= 32) return secret;
    if (process.env.NODE_ENV === "production") {
        throw new Error("FATAL: JWT_SECRET missing or too short (>=32 chars required) in production.");
    }
    if (!secret) console.warn("WARNING: JWT_SECRET not set — using insecure dev fallback. Set a 64+ char secret in .env.");
    return secret || "fallback_secret";
};

// --- Shared auth validation helpers (mirrored client-side) ---
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const isValidEmail = (email) => {
    const e = normalizeEmail(email);
    return e.length >= 5 && e.length <= 254 && EMAIL_RE.test(e);
};
// Strong password: 8-72 chars (bcrypt limit), upper + lower + digit + symbol
const passwordIssues = (password) => {
    const issues = [];
    if (typeof password !== "string") return ["Password must be a string."];
    if (password.length < 8) issues.push("at least 8 characters");
    if (password.length > 72) issues.push("at most 72 characters (bcrypt limit)");
    if (!/[A-Z]/.test(password)) issues.push("one uppercase letter");
    if (!/[a-z]/.test(password)) issues.push("one lowercase letter");
    if (!/[0-9]/.test(password)) issues.push("one number");
    if (!/[^A-Za-z0-9]/.test(password)) issues.push("one symbol");
    return issues;
};
const BCRYPT_ROUNDS = 12;

// Brute-force protection: strict on auth, lenient on general API.
// Limits are per-IP; tests make <10 auth calls so these never trigger in CI.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many auth attempts. Please wait 15 minutes and try again." },
});
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use("/api/auth/", authLimiter);
app.use("/api/", apiLimiter);

app.get("/", (req, res) => {
    res.send("Support Insights Backend is running");
});

// Authentication Middleware — verifies JWT then refreshes role from DB so a
// demoted admin/lead loses privileges immediately (no 8h stale-role window).
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: "Access denied. No token provided." });
    
    jwt.verify(token, getJwtSecret(), async (err, decoded) => {
        if (err) return res.status(403).json({ error: "Invalid or expired token." });
        try {
            // Refresh role from DB; fail closed if the user was deleted
            const fresh = await pool.query("SELECT id, role FROM users WHERE id = $1", [decoded.id]);
            if (fresh.rows.length === 0) {
                return res.status(401).json({ error: "Account no longer exists. Please log in again." });
            }
            req.user = { ...decoded, role: fresh.rows[0].role };
        } catch {
            // DB transient failure: fall back to token claims rather than lock everyone out
            req.user = decoded;
        }
        next();
    });
};

// Granular Role-Based Access Control (RBAC) Middleware
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Your current role is '${req.user?.role || 'unassigned'}'.` 
            });
        }
        next();
    };
};

// Register (default role is agent, only admin can promote to lead/admin)
app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const cleanName = String(name || "").trim();
        const cleanEmail = normalizeEmail(email);

        if (!cleanName || cleanName.length < 2 || cleanName.length > 60) {
            return res.status(400).json({ error: "Name must be 2-60 characters." });
        }
        if (!isValidEmail(cleanEmail)) {
            return res.status(400).json({ error: "Invalid email address." });
        }
        const pwIssues = passwordIssues(password);
        if (pwIssues.length > 0) {
            return res.status(400).json({ error: `Weak password. Require ${pwIssues.join(", ")}.` });
        }

        const userExists = await pool.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [cleanEmail]);
        if (userExists.rows.length > 0) return res.status(400).json({ error: "Email already exists" });

        // If this is the very first user ever created in the system, automatically grant admin!
        const totalUsers = await pool.query("SELECT COUNT(*)::int as count FROM users");
        const assignedRole = totalUsers.rows[0].count === 0 ? 'admin' : 'agent';

        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

        const result = await pool.query(
            "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
            [cleanName, cleanEmail, hashedPassword, assignedRole]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error registering user:", error.message);
        res.status(500).json({ error: "Failed to register user" });
    }
});

// Login (with legacy plaintext upgrade + constant generic errors to avoid enumeration)
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const cleanEmail = normalizeEmail(email);
        if (!isValidEmail(cleanEmail) || typeof password !== "string" || password.length === 0) {
            return res.status(400).json({ error: "Invalid credentials" });
        }
        // Case-insensitive lookup so "User@X.com" matches "user@x.com"
        const userResult = await pool.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [cleanEmail]);
        
        if (userResult.rows.length === 0) return res.status(400).json({ error: "Invalid credentials" });
        const user = userResult.rows[0];
        
                let validPassword = false;
        if (user.password && user.password.startsWith("$2")) {
            validPassword = await bcrypt.compare(password, user.password);
        } else {
            validPassword = password === user.password;
            if (validPassword) {
                const upgradedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
                await pool.query("UPDATE users SET password = $1 WHERE id = $2", [upgradedPassword, user.id]);
            }
        }
        if (!validPassword) return res.status(400).json({ error: "Invalid credentials" });

        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role },
            getJwtSecret(),
            { expiresIn: "2h" }
        );
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        console.error("Error logging in:", error.message);
        res.status(500).json({ error: "Failed to log in" });
    }
});

// Get current logged in user details & permissions
app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
        const userResult = await pool.query("SELECT id, name, email, role, created_at FROM users WHERE id = $1", [req.user.id]);
        if (userResult.rows.length === 0) return res.status(404).json({ error: "User not found" });
        res.json(userResult.rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch user profile" });
    }
});

// Apply authentication middleware to all other API routes
app.use("/api", authenticateToken);

app.get("/api/tickets", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                t.id AS ticket_id,
                c.name AS customer_name,
                u.name AS agent_name,
                COALESCE(cat.name, t.category, 'Uncategorized') AS category_name,
                t.subject,
                t.description,
                t.priority,
                t.status,
                t.channel,
                t.created_at,
                t.first_response_at,
                t.resolved_at,
                p.polarity,
                p.polarity_score,
                p.sla_breach_probability,
                p.escalation_probability,
                p.recommended_action
            FROM tickets t
            JOIN customers c ON t.customer_id = c.id
            LEFT JOIN users u ON t.agent_id = u.id
            LEFT JOIN categories cat ON t.category_id = cat.id
            LEFT JOIN predictions p ON t.id = p.ticket_id
            ORDER BY t.id DESC;
        `);

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching tickets:", error.message);
        res.status(500).json({ error: "Failed to fetch tickets" });
    }
});

// Intelligent AI Prediction helper
const generateTicketPredictions = (subject, description, priority) => {
    const text = `${subject} ${description}`.toLowerCase();
    const negativeWords = ["down", "broken", "crash", "error", "fail", "failure", "urgent", "outage", "slow", "terrible", "bad", "loss", "stuck", "frustrated", "refund"];
    const positiveWords = ["thanks", "good", "great", "resolved", "awesome", "helpful", "working", "fast"];

    let negCount = 0;
    let posCount = 0;
    negativeWords.forEach(w => { if (text.includes(w)) negCount++; });
    positiveWords.forEach(w => { if (text.includes(w)) posCount++; });

    let polarity = "neutral";
    let polarity_score = 0.0;
    if (negCount > posCount) {
        polarity = "negative";
        polarity_score = Math.min(1.0, 0.3 + negCount * 0.15);
    } else if (posCount > negCount) {
        polarity = "positive";
        polarity_score = Math.min(1.0, 0.3 + posCount * 0.15);
    }

    let sla_breach_probability = 0.20;
    let escalation_probability = 0.15;
    let recommended_action = "Standard agent queue triage";

    if (priority === "Critical") {
        sla_breach_probability = Math.min(0.95, 0.70 + negCount * 0.05);
        escalation_probability = Math.min(0.90, 0.65 + negCount * 0.05);
        recommended_action = "Page tier-3 on-call engineer immediately and notify lead";
    } else if (priority === "High") {
        sla_breach_probability = Math.min(0.75, 0.50 + negCount * 0.05);
        escalation_probability = Math.min(0.65, 0.40 + negCount * 0.05);
        recommended_action = "Assign to specialist queue; check customer tier SLA";
    } else if (priority === "Medium") {
        sla_breach_probability = Math.min(0.45, 0.25 + negCount * 0.04);
        escalation_probability = Math.min(0.35, 0.15 + negCount * 0.04);
        recommended_action = "Review within 4 hours; provide standard troubleshooting steps";
    } else {
        sla_breach_probability = 0.08;
        escalation_probability = 0.05;
        recommended_action = "Queue for general agent review";
    }

    return {
        polarity,
        polarity_score: Number(polarity_score.toFixed(2)),
        sla_breach_probability: Number(sla_breach_probability.toFixed(2)),
        escalation_probability: Number(escalation_probability.toFixed(2)),
        recommended_action
    };
};

const ALLOWED_PRIORITIES = ["Low", "Medium", "High", "Critical"];
const ALLOWED_STATUSES = ["Open", "In Progress", "Resolved"];
const ALLOWED_CHANNELS = ["Portal", "Email", "Phone", "Chat"];
const ALLOWED_SENDER_TYPES = ["agent", "customer"];

app.post("/api/tickets", async (req, res) => {
    try {
        const { customer_id, category_id, subject, description, priority, channel } = req.body;
        const cleanSubject = String(subject || "").trim();
        const cleanDescription = String(description || "").trim();
        if (!Number.isInteger(customer_id)) {
            return res.status(400).json({ error: "Invalid customer_id." });
        }
        if (!Number.isInteger(category_id)) {
            return res.status(400).json({ error: "Invalid category_id." });
        }
        if (!cleanSubject || cleanSubject.length > 200) {
            return res.status(400).json({ error: "Subject is required (max 200 chars)." });
        }
        if (!cleanDescription || cleanDescription.length > 5000) {
            return res.status(400).json({ error: "Description is required (max 5000 chars)." });
        }
        if (!ALLOWED_PRIORITIES.includes(priority)) {
            return res.status(400).json({ error: `Invalid priority. Must be one of: ${ALLOWED_PRIORITIES.join(", ")}.` });
        }
        if (!ALLOWED_CHANNELS.includes(channel)) {
            return res.status(400).json({ error: `Invalid channel. Must be one of: ${ALLOWED_CHANNELS.join(", ")}.` });
        }
        const ticketResult = await pool.query(`
            INSERT INTO tickets (customer_id, category_id, category, subject, description, priority, status, channel)
            VALUES ($1, $2, (SELECT name FROM categories WHERE id = $2), $3, $4, $5, 'Open', $6)
            RETURNING *;
        `, [customer_id, category_id, cleanSubject, cleanDescription, priority, channel]);

        const newTicket = ticketResult.rows[0];

        // Generate and store AI Predictions
        const ai = generateTicketPredictions(subject, description, priority);
        await pool.query(`
            INSERT INTO predictions (ticket_id, polarity, polarity_score, sla_breach_probability, escalation_probability, recommended_action)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (ticket_id) DO NOTHING;
        `, [newTicket.id, ai.polarity, ai.polarity_score, ai.sla_breach_probability, ai.escalation_probability, ai.recommended_action]);

        // Insert initial creation event
        await pool.query(`
            INSERT INTO ticket_events (ticket_id, user_id, event_type, old_value, new_value, note, created_at)
            VALUES ($1, $2, 'created', NULL, 'Open', 'Ticket created via ' || $3, NOW())
        `, [newTicket.id, req.user?.id || null, channel || 'Portal']);

        res.status(201).json(newTicket);
    } catch (error) {
        console.error("Error creating ticket:", error.message);
        res.status(500).json({ error: "Failed to create ticket" });
    }
});

app.put("/api/tickets/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!ALLOWED_STATUSES.includes(status)) {
            return res.status(400).json({ error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(", ")}.` });
        }
        
        // Get old status first for audit event
        const oldTicket = await pool.query(`SELECT status FROM tickets WHERE id = $1`, [id]);
        if (oldTicket.rows.length === 0) {
            return res.status(404).json({ error: "Ticket not found" });
        }
        const oldStatus = oldTicket.rows[0].status;

        const result = await pool.query(`
            UPDATE tickets
            SET status = $1, 
                resolved_at = CASE WHEN $1::text = 'Resolved' THEN NOW() ELSE NULL END
            WHERE id = $2
            RETURNING *;
        `, [status, id]);

        // Insert event record
        if (oldStatus !== status) {
            await pool.query(`
                INSERT INTO ticket_events (ticket_id, user_id, event_type, old_value, new_value, note, created_at)
                VALUES ($1, $2, 'status_change', $3, $4, $5, NOW())
            `, [id, req.user?.id || null, oldStatus, status, `Status changed from ${oldStatus} to ${status}`]);
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error updating ticket status:", error.message);
        res.status(500).json({ error: "Failed to update ticket status" });
    }
});

app.get("/api/customers", async (req, res) => {
    try {
        const result = await pool.query(`SELECT id, name FROM customers ORDER BY name`);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching customers:", error.message);
        res.status(500).json({ error: "Failed to fetch customers" });
    }
});

app.get("/api/categories", async (req, res) => {
    try {
        const result = await pool.query(`SELECT id, name FROM categories ORDER BY name`);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching categories:", error.message);
        res.status(500).json({ error: "Failed to fetch categories" });
    }
});

app.get("/api/dashboard/summary", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                COUNT(*)::int AS total_tickets,
                COUNT(*) FILTER (WHERE status = 'Open')::int AS open_tickets,
                COUNT(*) FILTER (WHERE status = 'In Progress')::int AS in_progress_tickets,
                COUNT(*) FILTER (WHERE status = 'Resolved')::int AS resolved_tickets,
                COUNT(*) FILTER (WHERE priority = 'High')::int AS high_priority_tickets,
                COUNT(*) FILTER (WHERE priority = 'Critical')::int AS critical_tickets,
                COUNT(*) FILTER (WHERE p.polarity = 'negative')::int AS negative_polarity_tickets,
                ROUND(AVG(p.sla_breach_probability), 4) AS average_sla_breach_probability,
                ROUND(AVG(p.escalation_probability), 4) AS average_escalation_probability
            FROM tickets t
            LEFT JOIN predictions p ON t.id = p.ticket_id;
        `);

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error fetching dashboard summary:", error.message);
        res.status(500).json({ error: "Failed to fetch dashboard summary" });
    }
});

app.get("/api/dashboard/category-stats", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                cat.name AS category,
                COUNT(t.id)::int AS ticket_count
            FROM categories cat
            LEFT JOIN tickets t ON t.category_id = cat.id
            GROUP BY cat.name
            ORDER BY ticket_count DESC, cat.name;
        `);

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching category stats:", error.message);
        res.status(500).json({ error: "Failed to fetch category stats" });
    }
});

app.get("/api/dashboard/status-stats", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                status,
                COUNT(*)::int AS ticket_count
            FROM tickets
            GROUP BY status
            ORDER BY ticket_count DESC, status;
        `);

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching status stats:", error.message);
        res.status(500).json({ error: "Failed to fetch status stats" });
    }
});

app.get("/api/dashboard/priority-stats", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                priority,
                COUNT(*)::int AS ticket_count
            FROM tickets
            GROUP BY priority
            ORDER BY ticket_count DESC, priority;
        `);

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching priority stats:", error.message);
        res.status(500).json({ error: "Failed to fetch priority stats" });
    }
});

app.get("/api/dashboard/risk-tickets", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                t.id AS ticket_id,
                c.name AS customer_name,
                COALESCE(cat.name, t.category, 'Uncategorized') AS category_name,
                t.subject,
                t.priority,
                t.status,
                p.polarity,
                p.sla_breach_probability,
                p.escalation_probability,
                p.recommended_action
            FROM tickets t
            JOIN customers c ON t.customer_id = c.id
            LEFT JOIN categories cat ON t.category_id = cat.id
            JOIN predictions p ON t.id = p.ticket_id
            WHERE p.sla_breach_probability >= 0.6
               OR p.escalation_probability >= 0.6
            ORDER BY p.sla_breach_probability DESC, p.escalation_probability DESC;
        `);

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching risk tickets:", error.message);
        res.status(500).json({ error: "Failed to fetch risk tickets" });
    }
});

app.get("/api/dashboard/trends", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                TO_CHAR(created_at::date, 'Mon DD') AS day,
                created_at::date AS raw_date,
                COUNT(*)::int AS ticket_count
            FROM tickets
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY created_at::date
            ORDER BY raw_date ASC;
        `);

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching trends:", error.message);
        res.status(500).json({ error: "Failed to fetch trends" });
    }
});

app.get("/api/tickets/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT
                t.id AS ticket_id,
                c.name AS customer_name,
                c.email AS customer_email,
                u.name AS agent_name,
                COALESCE(cat.name, t.category, 'Uncategorized') AS category_name,
                t.subject,
                t.description,
                t.priority,
                t.status,
                t.channel,
                t.created_at,
                t.first_response_at,
                t.resolved_at,
                p.polarity,
                p.polarity_score,
                p.sla_breach_probability,
                p.escalation_probability,
                p.recommended_action
            FROM tickets t
            JOIN customers c ON t.customer_id = c.id
            LEFT JOIN users u ON t.agent_id = u.id
            LEFT JOIN categories cat ON t.category_id = cat.id
            LEFT JOIN predictions p ON t.id = p.ticket_id
            WHERE t.id = $1;
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Ticket not found" });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error fetching ticket:", error.message);
        res.status(500).json({ error: "Failed to fetch ticket" });
    }
});

// Get agents list
app.get("/api/agents", async (req, res) => {
    try {
        const result = await pool.query(`SELECT id, name, email, role FROM users ORDER BY name ASC`);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching agents:", error.message);
        res.status(500).json({ error: "Failed to fetch agents" });
    }
});

// Assign ticket to agent (Restricted to Admin and Lead)
app.put("/api/tickets/:id/assign", authorizeRoles('admin', 'lead'), async (req, res) => {
    try {
        const { id } = req.params;
        const { agent_id } = req.body;
        if (!Number.isInteger(agent_id)) {
            return res.status(400).json({ error: "Invalid agent_id." });
        }
        // Verify the assignee actually exists (prevents dangling FK / typos)
        const assignee = await pool.query(`SELECT id, name FROM users WHERE id = $1`, [agent_id]);
        if (assignee.rows.length === 0) {
            return res.status(404).json({ error: "Assignee user not found." });
        }

        const oldTicket = await pool.query(`
            SELECT t.agent_id, u.name as old_agent_name 
            FROM tickets t 
            LEFT JOIN users u ON t.agent_id = u.id 
            WHERE t.id = $1
        `, [id]);
        
        if (oldTicket.rows.length === 0) {
            return res.status(404).json({ error: "Ticket not found" });
        }

        const oldAgentName = oldTicket.rows[0].old_agent_name || 'Unassigned';

        const result = await pool.query(`
            UPDATE tickets
            SET agent_id = $1
            WHERE id = $2
            RETURNING *;
        `, [agent_id, id]);

        const newAgentName = assignee.rows[0]?.name || 'Unassigned';

        await pool.query(`
            INSERT INTO ticket_events (ticket_id, user_id, event_type, old_value, new_value, note, created_at)
            VALUES ($1, $2, 'assignment', $3, $4, $5, NOW())
        `, [id, req.user?.id || null, oldAgentName, newAgentName, `Ticket assigned to ${newAgentName}`]);

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error assigning ticket:", error.message);
        res.status(500).json({ error: "Failed to assign ticket" });
    }
});

// Get ticket messages / conversation
app.get("/api/tickets/:id/messages", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT id, ticket_id, sender_type, message, created_at
            FROM ticket_messages
            WHERE ticket_id = $1
            ORDER BY created_at ASC
        `, [id]);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching ticket messages:", error.message);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});

// Add message to ticket
app.post("/api/tickets/:id/messages", async (req, res) => {
    try {
        const { id } = req.params;
        const { sender_type, message } = req.body;
        const cleanMessage = String(message || "").trim();

        if (!cleanMessage) {
            return res.status(400).json({ error: "Message cannot be empty" });
        }
        if (cleanMessage.length > 5000) {
            return res.status(400).json({ error: "Message too long (max 5000 chars)." });
        }
        const senderType = sender_type || 'agent';
        if (!ALLOWED_SENDER_TYPES.includes(senderType)) {
            return res.status(400).json({ error: `Invalid sender_type. Must be one of: ${ALLOWED_SENDER_TYPES.join(", ")}.` });
        }

        const result = await pool.query(`
            INSERT INTO ticket_messages (ticket_id, sender_type, message, created_at)
            VALUES ($1, $2, $3, NOW())
            RETURNING *;
        `, [id, senderType, cleanMessage]);

        // If it's the first agent response, update first_response_at
        if (senderType === 'agent') {
            await pool.query(`
                UPDATE tickets 
                SET first_response_at = COALESCE(first_response_at, NOW()) 
                WHERE id = $1
            `, [id]);
        }

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error adding message:", error.message);
        res.status(500).json({ error: "Failed to add message" });
    }
});

// Get ticket audit events
app.get("/api/tickets/:id/events", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT te.id, te.ticket_id, te.event_type, te.old_value, te.new_value, te.note, te.created_at, u.name as user_name
            FROM ticket_events te
            LEFT JOIN users u ON te.user_id = u.id
            WHERE te.ticket_id = $1
            ORDER BY te.created_at DESC
        `, [id]);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching events:", error.message);
        res.status(500).json({ error: "Failed to fetch events" });
    }
});

// Get feedback for ticket
app.get("/api/tickets/:id/feedback", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT f.id, f.ticket_id, f.customer_id, f.rating, f.comment, f.created_at, c.name as customer_name
            FROM feedback f
            LEFT JOIN customers c ON f.customer_id = c.id
            WHERE f.ticket_id = $1
            ORDER BY f.created_at DESC
        `, [id]);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching feedback:", error.message);
        res.status(500).json({ error: "Failed to fetch feedback" });
    }
});

// Get SLA Rules
app.get("/api/sla/rules", async (req, res) => {
    try {
        const result = await pool.query(`SELECT id, priority, response_time_minutes, resolution_time_minutes FROM sla_rules ORDER BY id ASC`);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching SLA rules:", error.message);
        res.status(500).json({ error: "Failed to fetch SLA rules" });
    }
});

// Customer Satisfaction (CSAT) analytics
app.get("/api/analytics/csat", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                ROUND(AVG(rating), 2) AS average_rating,
                COUNT(*)::int AS total_reviews,
                COUNT(*) FILTER (WHERE rating >= 4)::int AS positive_reviews,
                COUNT(*) FILTER (WHERE rating = 3)::int AS neutral_reviews,
                COUNT(*) FILTER (WHERE rating <= 2)::int AS negative_reviews
            FROM feedback;
        `);
        res.json(result.rows[0] || { average_rating: 0, total_reviews: 0, positive_reviews: 0 });
    } catch (error) {
        console.error("Error fetching CSAT:", error.message);
        res.status(500).json({ error: "Failed to fetch CSAT" });
    }
});

// SLA Performance metrics
app.get("/api/analytics/performance", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                COUNT(*)::int as total_evaluated,
                COUNT(*) FILTER (WHERE p.sla_breach_probability < 0.5)::int AS within_sla_count,
                COUNT(*) FILTER (WHERE p.sla_breach_probability >= 0.5)::int AS breached_sla_count,
                ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(t.resolved_at, NOW()) - t.created_at))/3600)::numeric, 1) AS avg_resolution_hours,
                ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(t.first_response_at, NOW()) - t.created_at))/60)::numeric, 1) AS avg_first_response_minutes
            FROM tickets t
            LEFT JOIN predictions p ON t.id = p.ticket_id;
        `);
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error fetching performance metrics:", error.message);
        res.status(500).json({ error: "Failed to fetch performance metrics" });
    }
});

// Agent Workload & Performance Leaderboard
app.get("/api/analytics/agents", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                u.id AS agent_id,
                u.name AS agent_name,
                u.email AS agent_email,
                u.role AS agent_role,
                COUNT(t.id)::int AS total_assigned,
                COUNT(t.id) FILTER (WHERE t.status IN ('Open', 'In Progress'))::int AS active_tickets,
                COUNT(t.id) FILTER (WHERE t.status = 'Resolved')::int AS resolved_tickets,
                COUNT(t.id) FILTER (WHERE p.sla_breach_probability >= 0.5)::int AS high_risk_tickets,
                ROUND(AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))/3600)::numeric, 1) AS avg_resolution_hours
            FROM users u
            LEFT JOIN tickets t ON u.id = t.agent_id
            LEFT JOIN predictions p ON t.id = p.ticket_id
            GROUP BY u.id, u.name, u.email, u.role
            ORDER BY resolved_tickets DESC, active_tickets DESC;
        `);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching agent analytics:", error.message);
        res.status(500).json({ error: "Failed to fetch agent analytics" });
    }
});

// Delete ticket permanently (Restricted strictly to Admin)
app.delete("/api/tickets/:id", authorizeRoles('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        // Cascade delete child tables first
        await pool.query("DELETE FROM ticket_messages WHERE ticket_id = $1", [id]);
        await pool.query("DELETE FROM ticket_events WHERE ticket_id = $1", [id]);
        await pool.query("DELETE FROM predictions WHERE ticket_id = $1", [id]);
        await pool.query("DELETE FROM feedback WHERE ticket_id = $1", [id]);

        const result = await pool.query("DELETE FROM tickets WHERE id = $1 RETURNING *", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Ticket not found" });
        }

        res.json({ message: "Ticket permanently deleted", ticket_id: id });
    } catch (error) {
        console.error("Error deleting ticket:", error.message);
        res.status(500).json({ error: "Failed to delete ticket" });
    }
});

// Admin: Get all users & roles (Restricted to Admin)
app.get("/api/admin/users", authorizeRoles('admin'), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                u.id,
                u.name,
                u.email,
                u.role,
                u.created_at,
                COUNT(t.id)::int AS tickets_assigned
            FROM users u
            LEFT JOIN tickets t ON u.id = t.agent_id
            GROUP BY u.id, u.name, u.email, u.role, u.created_at
            ORDER BY u.id ASC;
        `);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching admin users:", error.message);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// Admin: Update user role (Restricted to Admin)
app.put("/api/admin/users/:id/role", authorizeRoles('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['admin', 'lead', 'agent'].includes(role)) {
            return res.status(400).json({ error: "Invalid role. Must be 'admin', 'lead', or 'agent'." });
        }

        // Prevent self-demoting the last admin
        if (Number(id) === req.user.id && role !== 'admin') {
            const adminCount = await pool.query("SELECT COUNT(*)::int as count FROM users WHERE role = 'admin'");
            if (adminCount.rows[0].count <= 1) {
                return res.status(400).json({ error: "Cannot demote the only remaining administrator." });
            }
        }

        const result = await pool.query(
            "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role",
            [role, id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error updating user role:", error.message);
        res.status(500).json({ error: "Failed to update user role" });
    }
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = { app, authenticateToken, authorizeRoles, generateTicketPredictions };


