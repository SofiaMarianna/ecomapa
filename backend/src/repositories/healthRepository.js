import { pool } from '../config/database.js';

export async function checkDatabaseConnection() {
  const result = await pool.query('SELECT 1 AS result');
  return result.rows[0]?.result === 1;
}
