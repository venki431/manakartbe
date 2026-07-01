import './env.js';
import pkg from 'pg';

const { Pool, types } = pkg;

// Parse DATE (OID 1082) as a plain 'YYYY-MM-DD' string instead of a JS Date.
// The default parser builds a Date at local midnight, which shifts the day when
// serialized to UTC (e.g. a delivery_date of 2026-07-02 came back as
// "2026-07-01T18:30:00Z"). Returning the raw string keeps the calendar date intact.
types.setTypeParser(1082, (value) => value);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
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