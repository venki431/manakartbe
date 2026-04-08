import './env.js';
import pkg from 'pg';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  family: 4,
  host: 'db.gvcrwugdhswnbskysfjb.supabase.co',
});

async function checkDatabaseConnection() {
  await pool.connect()
    .then(client => {
      console.log('Database connection successful');
      client.release(); // Release the client back to the pool after checking connection which is important to avoid connection leaks
    })
    .catch(err => {
      console.error('Database connection error:', err);
    });
}

await checkDatabaseConnection();

export default pool;