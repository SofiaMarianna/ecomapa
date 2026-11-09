BEGIN;

-- =====================================================
-- Serializa execuções concorrentes desta seed
-- =====================================================

SELECT pg_advisory_xact_lock(847291, 2);

-- =====================================================
-- Verifica a presença do catálogo de materiais
-- =====================================================

DO $$
DECLARE
    missing_materials TEXT[];
BEGIN
    SELECT array_agg(expected.name ORDER BY expected.name)
    INTO missing_materials
    FROM unnest(ARRAY[
        'Papel e papelão',
        'Plástico',
        'Vidro',
        'Metal',
        'Resíduos eletrônicos',
        'Pilhas e baterias',
        'Lâmpadas',
        'Óleo de cozinha usado'
    ]::TEXT[]) AS expected(name)
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.material AS material
        WHERE material.name = expected.name
    );

    IF missing_materials IS NOT NULL THEN
        RAISE EXCEPTION
            'Não é possível inserir os pontos fictícios. Materiais ausentes em public.material: %',
            array_to_string(missing_materials, ', ')
            USING HINT = 'Execute primeiro a seed database/seeds/001_insert_materials.sql.';
    END IF;
END;
$$;

-- =====================================================
-- Insere pontos fictícios sem duplicar registros
-- =====================================================

WITH demo_points (name, address, description, longitude, latitude) AS (
    VALUES
        (
            'Ponto de demonstração — Centro',
            'Endereço fictício — Rua Imaginária do Centro, Cajazeiras - PB (somente demonstração e testes)',
            'Registro fictício, destinado exclusivamente a demonstração e testes; não representa um local real de coleta.',
            -38.5612::DOUBLE PRECISION,
            -6.8891::DOUBLE PRECISION
        ),
        (
            'Ponto de demonstração — Norte',
            'Endereço fictício — Avenida Inventada do Norte, Cajazeiras - PB (somente demonstração e testes)',
            'Registro fictício, destinado exclusivamente a demonstração e testes; não representa um local real de coleta.',
            -38.5612::DOUBLE PRECISION,
            -6.8851::DOUBLE PRECISION
        ),
        (
            'Ponto de demonstração — Leste',
            'Endereço fictício — Travessa Imaginária do Leste, Cajazeiras - PB (somente demonstração e testes)',
            'Registro fictício, destinado exclusivamente a demonstração e testes; não representa um local real de coleta.',
            -38.5572::DOUBLE PRECISION,
            -6.8891::DOUBLE PRECISION
        ),
        (
            'Ponto de demonstração — Sul',
            'Endereço fictício — Rua Inventada do Sul, Cajazeiras - PB (somente demonstração e testes)',
            'Registro fictício, destinado exclusivamente a demonstração e testes; não representa um local real de coleta.',
            -38.5612::DOUBLE PRECISION,
            -6.8931::DOUBLE PRECISION
        )
)
INSERT INTO public.eco_point (name, address, description, location, is_demo)
SELECT
    demo_point.name,
    demo_point.address,
    demo_point.description,
    extensions.ST_SetSRID(
        extensions.ST_MakePoint(demo_point.longitude, demo_point.latitude),
        4326
    )::extensions.geography,
    TRUE
FROM demo_points AS demo_point
WHERE NOT EXISTS (
    SELECT 1
    FROM public.eco_point AS existing_point
    WHERE existing_point.name = demo_point.name
      AND existing_point.address = demo_point.address
      AND existing_point.is_demo IS TRUE
);

-- =====================================================
-- Associa materiais aos pontos fictícios
-- =====================================================

WITH demo_point_materials (point_name, address, material_name) AS (
    VALUES
        ('Ponto de demonstração — Centro', 'Endereço fictício — Rua Imaginária do Centro, Cajazeiras - PB (somente demonstração e testes)', 'Papel e papelão'),
        ('Ponto de demonstração — Centro', 'Endereço fictício — Rua Imaginária do Centro, Cajazeiras - PB (somente demonstração e testes)', 'Plástico'),
        ('Ponto de demonstração — Centro', 'Endereço fictício — Rua Imaginária do Centro, Cajazeiras - PB (somente demonstração e testes)', 'Vidro'),
        ('Ponto de demonstração — Centro', 'Endereço fictício — Rua Imaginária do Centro, Cajazeiras - PB (somente demonstração e testes)', 'Metal'),
        ('Ponto de demonstração — Norte', 'Endereço fictício — Avenida Inventada do Norte, Cajazeiras - PB (somente demonstração e testes)', 'Resíduos eletrônicos'),
        ('Ponto de demonstração — Norte', 'Endereço fictício — Avenida Inventada do Norte, Cajazeiras - PB (somente demonstração e testes)', 'Pilhas e baterias'),
        ('Ponto de demonstração — Norte', 'Endereço fictício — Avenida Inventada do Norte, Cajazeiras - PB (somente demonstração e testes)', 'Lâmpadas'),
        ('Ponto de demonstração — Leste', 'Endereço fictício — Travessa Imaginária do Leste, Cajazeiras - PB (somente demonstração e testes)', 'Plástico'),
        ('Ponto de demonstração — Leste', 'Endereço fictício — Travessa Imaginária do Leste, Cajazeiras - PB (somente demonstração e testes)', 'Óleo de cozinha usado'),
        ('Ponto de demonstração — Sul', 'Endereço fictício — Rua Inventada do Sul, Cajazeiras - PB (somente demonstração e testes)', 'Papel e papelão'),
        ('Ponto de demonstração — Sul', 'Endereço fictício — Rua Inventada do Sul, Cajazeiras - PB (somente demonstração e testes)', 'Metal'),
        ('Ponto de demonstração — Sul', 'Endereço fictício — Rua Inventada do Sul, Cajazeiras - PB (somente demonstração e testes)', 'Óleo de cozinha usado')
)
INSERT INTO public.eco_point_material (eco_point_id, material_id)
SELECT
    demo_point.id,
    material.id
FROM demo_point_materials AS association
JOIN public.eco_point AS demo_point
    ON demo_point.name = association.point_name
   AND demo_point.address = association.address
   AND demo_point.is_demo IS TRUE
JOIN public.material AS material
    ON material.name = association.material_name
ON CONFLICT (eco_point_id, material_id) DO NOTHING;

COMMIT;
