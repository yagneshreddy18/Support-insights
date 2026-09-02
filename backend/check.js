const pool = require('./config/db');

const tables = ['ticket_messages', 'ticket_events', 'feedback', 'sla_rules'];

Promise.all(tables.map(t =>
  pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='${t}' ORDER BY ordinal_position`)
    .then(r => ({ table: t, cols: r.rows.map(x => `${x.column_name}(${x.data_type})`).join(', ') }))
))
.then(results => {
  results.forEach(r => console.log(`\n[${r.table}]\n  ${r.cols}`));
  pool.end();
})
.catch(e => { console.error(e.message); pool.end(); });
