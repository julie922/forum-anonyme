const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDb(retries = 10) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          pseudo VARCHAR(50) NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('DB ready');
      return;
    } catch (err) {
      console.log(`DB not ready (attempt ${i}/${retries}): ${err.message}`);
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

app.get('/messages', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM messages ORDER BY created_at DESC');
  res.json(rows);
});

app.post('/messages', async (req, res) => {
  const { pseudo, content } = req.body;
  if (!pseudo || !content) {
    return res.status(400).json({ error: 'pseudo and content are required' });
  }
  const { rows } = await pool.query(
    'INSERT INTO messages (pseudo, content) VALUES ($1, $2) RETURNING *',
    [pseudo, content]
  );
  res.status(201).json(rows[0]);
});

initDb()
  .then(() => app.listen(3000, () => console.log('API listening on port 3000')))
  .catch(err => {
    console.error('Failed to connect to DB:', err.message);
    process.exit(1);
  });
