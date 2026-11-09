BEGIN;

-- =====================================================
-- Catálogo inicial de materiais de coleta seletiva
-- =====================================================

INSERT INTO public.material (name, description)
VALUES
    ('Papel e papelão', 'Papéis, caixas de papelão e embalagens de papel'),
    ('Plástico', 'Garrafas PET, embalagens e outros materiais plásticos'),
    ('Vidro', 'Garrafas, potes e recipientes de vidro'),
    ('Metal', 'Latas, embalagens metálicas e outros materiais metálicos'),
    ('Resíduos eletrônicos', 'Equipamentos eletrônicos, componentes e acessórios'),
    ('Pilhas e baterias', 'Pilhas e baterias que necessitam de destinação adequada'),
    ('Lâmpadas', 'Lâmpadas que necessitam de coleta e destinação específica'),
    ('Óleo de cozinha usado', 'Óleo vegetal utilizado em atividades domésticas')
ON CONFLICT (name) DO NOTHING;

COMMIT;
