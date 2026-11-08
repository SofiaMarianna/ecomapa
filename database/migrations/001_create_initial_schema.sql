BEGIN;

-- =====================================================
-- 1. PREPARAÇÃO DO POSTGIS
-- =====================================================

CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS postgis
WITH SCHEMA extensions;

-- Verifica se o PostGIS está instalado no schema esperado.
DO $$
DECLARE
    postgis_schema TEXT;
BEGIN
    SELECT n.nspname
    INTO postgis_schema
    FROM pg_extension e
    JOIN pg_namespace n
        ON n.oid = e.extnamespace
    WHERE e.extname = 'postgis';

    IF postgis_schema IS DISTINCT FROM 'extensions' THEN
        RAISE EXCEPTION
            'PostGIS deveria estar no schema extensions, mas foi encontrado em: %',
            postgis_schema;
    END IF;
END;
$$;

-- Permite localizar os objetos da extensão durante
-- a criação de índices e outros objetos espaciais.
SET LOCAL search_path = public, extensions;


-- =====================================================
-- 2. TABELA ECO_POINT
-- =====================================================

CREATE TABLE public.eco_point (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(120) NOT NULL,

    address TEXT NOT NULL,

    description TEXT,

    location extensions.geography(Point, 4326) NOT NULL,

    is_demo BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_eco_point_name
        CHECK (btrim(name, E' \t\n\r') <> ''),

    CONSTRAINT chk_eco_point_address
        CHECK (btrim(address, E' \t\n\r') <> '')

);


-- =====================================================
-- 3. TABELA MATERIAL
-- =====================================================

CREATE TABLE public.material (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(80) NOT NULL,

    description TEXT,

    CONSTRAINT uq_material_name
        UNIQUE (name),

    CONSTRAINT chk_material_name
        CHECK (btrim(name, E' \t\n\r') <> '')

);


-- =====================================================
-- 4. TABELA ECO_POINT_MATERIAL
-- =====================================================

CREATE TABLE public.eco_point_material (

    eco_point_id UUID NOT NULL,

    material_id UUID NOT NULL,

    CONSTRAINT pk_eco_point_material
        PRIMARY KEY (eco_point_id, material_id),

    CONSTRAINT fk_eco_point_material_eco_point
        FOREIGN KEY (eco_point_id)
        REFERENCES public.eco_point(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_eco_point_material_material
        FOREIGN KEY (material_id)
        REFERENCES public.material(id)
        ON DELETE RESTRICT

);


-- =====================================================
-- 5. ÍNDICES
-- =====================================================

CREATE INDEX idx_eco_point_location
ON public.eco_point
USING GIST (location);

CREATE INDEX idx_eco_point_material_material_id
ON public.eco_point_material (material_id);


-- =====================================================
-- 6. FUNÇÃO DE ATUALIZAÇÃO DO updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_eco_point_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN

    NEW.updated_at := CURRENT_TIMESTAMP;

    RETURN NEW;

END;
$$;


-- =====================================================
-- 7. TRIGGER DE ATUALIZAÇÃO
-- =====================================================

CREATE TRIGGER trg_eco_point_updated_at
BEFORE UPDATE ON public.eco_point
FOR EACH ROW
EXECUTE FUNCTION public.set_eco_point_updated_at();


COMMIT;