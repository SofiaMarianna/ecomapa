import { pool } from '../config/database.js';

export async function findEcoPointById(id) {
  const result = await pool.query(
    `SELECT
       eco_point.id,
       eco_point.name,
       eco_point.address,
       eco_point.description,
       extensions.ST_Y(eco_point.location::extensions.geometry) AS latitude,
       extensions.ST_X(eco_point.location::extensions.geometry) AS longitude,
       eco_point.is_demo,
       eco_point.created_at,
       eco_point.updated_at,
       COALESCE(
         json_agg(
           json_build_object(
             'id', material.id,
             'name', material.name,
             'description', material.description
           )
           ORDER BY material.name ASC, material.id ASC
         ) FILTER (WHERE material.id IS NOT NULL),
         '[]'::json
       ) AS materials
     FROM public.eco_point
     LEFT JOIN public.eco_point_material
       ON eco_point_material.eco_point_id = eco_point.id
     LEFT JOIN public.material
       ON material.id = eco_point_material.material_id
     WHERE eco_point.id = $1::uuid
     GROUP BY eco_point.id;`,
    [id],
  );

  return result.rows[0] ?? null;
}

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

export async function createEcoPoint({
  name,
  address,
  description,
  latitude,
  longitude,
  materialIds,
}) {
  const client = await pool.connect();
  let transactionOpen = false;
  let rollbackError;

  try {
    await client.query('BEGIN');
    transactionOpen = true;

    const materialResult = await client.query(
      'SELECT id FROM public.material WHERE id = ANY($1::uuid[]);',
      [materialIds],
    );
    const existingMaterialIds = new Set(
      materialResult.rows.map(({ id }) => String(id).toLowerCase()),
    );
    const missingMaterialIds = materialIds.filter((id) => !existingMaterialIds.has(id));

    if (missingMaterialIds.length > 0) {
      await client.query('ROLLBACK');
      transactionOpen = false;
      return { ecoPoint: null, missingMaterialIds };
    }

    const insertedPoint = await client.query(
      `INSERT INTO public.eco_point (name, address, description, location)
       VALUES (
         $1,
         $2,
         $3,
         extensions.ST_SetSRID(
           extensions.ST_MakePoint($4::double precision, $5::double precision),
           4326
         )::extensions.geography
       )
       RETURNING id;`,
      [name, address, description, longitude, latitude],
    );
    const ecoPointId = insertedPoint.rows[0]?.id;
    if (ecoPointId === undefined) {
      throw new Error('Eco point insert did not return an id');
    }

    await client.query(
      `INSERT INTO public.eco_point_material (eco_point_id, material_id)
       SELECT $1::uuid, selected_material.material_id
       FROM unnest($2::uuid[]) AS selected_material(material_id);`,
      [ecoPointId, materialIds],
    );

    const ecoPointResult = await client.query(
      `SELECT
         eco_point.id,
         eco_point.name,
         eco_point.address,
         eco_point.description,
         extensions.ST_Y(eco_point.location::extensions.geometry) AS latitude,
         extensions.ST_X(eco_point.location::extensions.geometry) AS longitude,
         eco_point.is_demo,
         eco_point.created_at,
         eco_point.updated_at,
         COALESCE(
           json_agg(
             json_build_object(
               'id', material.id,
               'name', material.name,
               'description', material.description
             )
             ORDER BY material.name ASC, material.id ASC
           ) FILTER (WHERE material.id IS NOT NULL),
           '[]'::json
         ) AS materials
       FROM public.eco_point
       LEFT JOIN public.eco_point_material
         ON eco_point_material.eco_point_id = eco_point.id
       LEFT JOIN public.material
         ON material.id = eco_point_material.material_id
       WHERE eco_point.id = $1::uuid
       GROUP BY eco_point.id;`,
      [ecoPointId],
    );
    const ecoPoint = ecoPointResult.rows[0];
    if (ecoPoint === undefined) {
      throw new Error('Eco point was not returned after insert');
    }

    await client.query('COMMIT');
    transactionOpen = false;
    return { ecoPoint, missingMaterialIds: [] };
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query('ROLLBACK');
      } catch (error) {
        rollbackError = error;
        const errorIdentifier = rollbackError.code ?? rollbackError.name;
        console.error(`Failed to roll back eco point creation transaction (${errorIdentifier}).`);
      }
    }

    throw error;
  } finally {
    client.release(rollbackError);
  }
}
