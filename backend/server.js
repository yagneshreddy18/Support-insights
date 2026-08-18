const express = require("express");
const cors = require("cors");
const pool = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Support Insights Backend is running");
});

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
            JOIN users u ON t.agent_id = u.id
            JOIN categories cat ON t.category_id = cat.id
            LEFT JOIN predictions p ON t.id = p.ticket_id
            ORDER BY t.id;
        `);

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching tickets:", error.message);
        res.status(500).json({ error: "Failed to fetch tickets" });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});