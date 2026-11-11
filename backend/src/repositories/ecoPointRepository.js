import { pool } from '../config/database.js';

export async function findEcoPointsWithinBounds({ west, south, east, north }) {
  const result = await pool.query(
    `SELECT
       id,
       name,
       address,
       extensions.ST_Y(location::extensions.geometry) AS latitude,
       extensions.ST_X(location::extensions.geometry) AS longitude,
       is_demo
     FROM public.eco_point
     WHERE extensions.ST_Intersects(
       location,
       extensions.ST_MakeEnvelope(
         $1::double precision,
         $2::double precision,
         $3::double precision,
         $4::double precision,
         4326
       )::extensions.geography
     )
     ORDER BY name ASC, id ASC;`,
    [west, south, east, north],
  );

  return result.rows;
}
