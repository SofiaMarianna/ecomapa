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

export async function findEcoPointsNearby({ latitude, longitude, radiusMeters }) {
  const result = await pool.query(
    `WITH reference AS (
       SELECT extensions.ST_SetSRID(
         extensions.ST_MakePoint($1::double precision, $2::double precision),
         4326
       )::extensions.geography AS location
     )
     SELECT
       eco_point.id,
       eco_point.name,
       eco_point.address,
       extensions.ST_Y(eco_point.location::extensions.geometry) AS latitude,
       extensions.ST_X(eco_point.location::extensions.geometry) AS longitude,
       eco_point.is_demo,
       extensions.ST_Distance(eco_point.location, reference.location) AS distance_meters
     FROM public.eco_point
     CROSS JOIN reference
     WHERE extensions.ST_DWithin(eco_point.location, reference.location, $3::double precision)
     ORDER BY distance_meters ASC, eco_point.name ASC, eco_point.id ASC;`,
    [longitude, latitude, radiusMeters],
  );

  return result.rows;
}
