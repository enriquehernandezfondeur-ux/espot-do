-- ============================================================
-- ESPOT.DO — Imágenes para los espacios de prueba
-- Unsplash (uso libre) — 3 fotos por espacio
-- ============================================================

-- Limpiar imágenes previas de los 6 espacios de prueba
DELETE FROM space_images
WHERE space_id IN (
  SELECT id FROM spaces WHERE slug IN (
    'salon-imperial-piantini',
    'restaurante-la-vista',
    'rooftop-sky-naco',
    'villa-esmeralda-events',
    'estudio-creativo-809',
    'hotel-boutique-caribe'
  )
);

-- ── 1. SALÓN IMPERIAL PIANTINI ────────────────────────────
INSERT INTO space_images (space_id, url, is_cover, position)
SELECT id, 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&q=85&fit=crop', true,  0 FROM spaces WHERE slug = 'salon-imperial-piantini';
INSERT INTO space_images (space_id, url, is_cover, position)
SELECT id, 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&q=85&fit=crop', false, 1 FROM spaces WHERE slug = 'salon-imperial-piantini';
INSERT INTO space_images (space_id, url, is_cover, position)
SELECT id, 'https://images.unsplash.com/photo-1478146059778-26c27b4e0f2a?w=1200&q=85&fit=crop', false, 2 FROM spaces WHERE slug = 'salon-imperial-piantini';

-- ── 2. RESTAURANTE LA VISTA ───────────────────────────────
INSERT INTO space_images (space_id, url, is_cover, position)
SELECT id, 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=85&fit=crop', true,  0 FROM spaces WHERE slug = 'restaurante-la-vista';
INSERT INTO space_images (space_id, url, is_cover, position)
SELECT id, 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=1200&q=85&fit=crop', false, 1 FROM spaces WHERE slug = 'restaurante-la-vista';
INSERT INTO space_images (space_id, url, is_cover, position)
SELECT id, 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=1200&q=85&fit=crop', false, 2 FROM spaces WHERE slug = 'restaurante-la-vista';

-- ── 3. ROOFTOP SKY NACO ───────────────────────────────────
INSERT INTO space_images (space_id, url, is_cover, position)
SELECT id, 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=85&fit=crop', true,  0 FROM spaces WHERE slug = 'rooftop-sky-naco';
INSERT INTO space_images (space_id, url, is_cover, position)
SELECT id, 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=1200&q=85&fit=crop', false, 1 FROM spaces WHERE slug = 'rooftop-sky-naco';
INSERT INTO space_images (space_id, url, is_cover, position)
SELECT id, 'https://images.unsplash.com/photo-1528495612343-9ca9f755b3e3?w=1200&q=85&fit=crop', false, 2 FROM spaces WHERE slug = 'rooftop-sky-naco';

-- ── 4. VILLA ESMERALDA EVENTS ─────────────────────────────
INSERT INTO space_images (space_id, url, is_cover, position)
SELECT id, 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&q=85&fit=crop', true,  0 FROM spaces WHERE slug = 'villa-esmeralda-events';
INSERT INTO space_images (space_id, url, is_cover, position)
SELECT id, 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=85&fit=crop', false, 1 FROM spaces WHERE slug = 'villa-esmeralda-events';
INSERT INTO space_images (space_id, url, is_cover, position)
SELECT id, 'https://images.unsplash.com/photo-1540541338537-1366b8b2cf6e?w=1200&q=85&fit=crop', false, 2 FROM spaces WHERE slug = 'villa-esmeralda-events';

-- ── 5. ESTUDIO CREATIVO 809 ───────────────────────────────
INSERT INTO space_images (space_id, url, is_cover, position)
SELECT id, 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200&q=85&fit=crop', true,  0 FROM spaces WHERE slug = 'estudio-creativo-809';
INSERT INTO space_images (space_id, url, is_cover, position)
SELECT id, 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=1200&q=85&fit=crop', false, 1 FROM spaces WHERE slug = 'estudio-creativo-809';
INSERT INTO space_images (space_id, url, is_cover, position)
SELECT id, 'https://images.unsplash.com/photo-1601506521937-0121a7fc2a6b?w=1200&q=85&fit=crop', false, 2 FROM spaces WHERE slug = 'estudio-creativo-809';

-- ── 6. HOTEL BOUTIQUE CARIBE ──────────────────────────────
INSERT INTO space_images (space_id, url, is_cover, position)
SELECT id, 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=85&fit=crop', true,  0 FROM spaces WHERE slug = 'hotel-boutique-caribe';
INSERT INTO space_images (space_id, url, is_cover, position)
SELECT id, 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=1200&q=85&fit=crop', false, 1 FROM spaces WHERE slug = 'hotel-boutique-caribe';
INSERT INTO space_images (space_id, url, is_cover, position)
SELECT id, 'https://images.unsplash.com/photo-1562778612-e1e0cda9915c?w=1200&q=85&fit=crop', false, 2 FROM spaces WHERE slug = 'hotel-boutique-caribe';

-- Verificar
SELECT s.name, COUNT(si.id) AS fotos
FROM spaces s
LEFT JOIN space_images si ON si.space_id = s.id
WHERE s.slug IN ('salon-imperial-piantini','restaurante-la-vista','rooftop-sky-naco','villa-esmeralda-events','estudio-creativo-809','hotel-boutique-caribe')
GROUP BY s.name
ORDER BY s.name;
