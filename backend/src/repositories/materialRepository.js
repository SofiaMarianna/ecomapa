import { pool } from '../config/database.js';

export async function findAllMaterials() {
  const result = await pool.query(
    'SELECT id, name, description FROM public.material ORDER BY name ASC;',
  );
  return result.rows;
}
