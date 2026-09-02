const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Support Insights Backend is running");
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: "Access denied. No token provided." });
    
    jwt.verify(token, process.env.JWT_SECRET || "fallback_secret", (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid or expired token." });
        req.user = user;
        next();
    });
};

// Register
app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userExists.rows.length > 0) return res.status(400).json({ error: "Email already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await pool.query(
            "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
            [name, email, hashedPassword, role || 'agent']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error registering user:", error.message);
        res.status(500).json({ error: "Failed to register user" });
    }
});

// Login
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        
        if (userResult.rows.length === 0) return res.status(400).json({ error: "Invalid credentials" });
        const user = userResult.rows[0];
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "8h" });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        console.error("Error logging in:", error.message);
        res.status(500).json({ error: "Failed to log in" });
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
                cat.name AS category_name,
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
            JOIN categories cat ON t.category_id = cat.id
            LEFT JOIN predictions p ON t.id = p.ticket_id
            ORDER BY t.id DESC;
        `);

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching tickets:", error.message);
        res.status(500).json({ error: "Failed to fetch tickets" });
    }
});

app.post("/api/tickets", async (req, res) => {
    try {
        const { customer_id, category_id, subject, description, priority, channel } = req.body;
        const result = await pool.query(`
            INSERT INTO tickets (customer_id, category_id, category, subject, description, priority, status, channel)
            VALUES ($1, $2, (SELECT name FROM categories WHERE id = $2), $3, $4, $5, 'Open', $6)
            RETURNING *;
        `, [customer_id, category_id, subject, description, priority, channel]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error creating ticket:", error.message);
        res.status(500).json({ error: "Failed to create ticket" });
    }
});

app.put("/api/tickets/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
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
                cat.name AS category_name,
                t.subject,
                t.priority,
                t.status,
                p.polarity,
                p.sla_breach_probability,
                p.escalation_probability,
                p.recommended_action
            FROM tickets t
            JOIN customers c ON t.customer_id = c.id
            JOIN categories cat ON t.category_id = cat.id
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
                cat.name AS category_name,
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
            JOIN categories cat ON t.category_id = cat.id
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

// Assign ticket to agent
app.put("/api/tickets/:id/assign", async (req, res) => {
    try {
        const { id } = req.params;
        const { agent_id } = req.body;

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

        const newAgent = await pool.query(`SELECT name FROM users WHERE id = $1`, [agent_id]);
        const newAgentName = newAgent.rows[0]?.name || 'Unassigned';

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

        if (!message || !message.trim()) {
            return res.status(400).json({ error: "Message cannot be empty" });
        }

        const result = await pool.query(`
            INSERT INTO ticket_messages (ticket_id, sender_type, message, created_at)
            VALUES ($1, $2, $3, NOW())
            RETURNING *;
        `, [id, sender_type || 'agent', message]);

        // If it's the first agent response, update first_response_at
        if ((sender_type || 'agent') === 'agent') {
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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
