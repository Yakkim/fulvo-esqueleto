-- ============================================
-- Migración 0004: branding real de "El Potrero" + datos completos de las 6 canchas
-- ============================================

UPDATE tenants SET
  nombre = 'El Potrero',
  color_primario = '#1B4D2E',
  color_secundario = '#F2B705',
  slogan = 'Fútbol de barrio, pasión de siempre'
WHERE id = 'tenant_norte';

UPDATE canchas SET
  nombre = 'La Bombonerita', numero = 1, categoria = 'F5',
  superficie = 'Césped Sintético Forbex 50mm', techada = 1,
  capacidad = '10 jugadores (5 vs 5)', medidas = '30 x 18 m',
  iluminacion = 'Reflectores LED 400W antideslumbrantes',
  descripcion = 'Cancha techada con alfombra premium de pelo alto y caucho ecológico.',
  precio_hora = 32000
WHERE id = 'cancha_1';

UPDATE canchas SET
  nombre = 'El Diego', numero = 3, categoria = 'F7',
  superficie = 'Césped Sintético ShockPad', techada = 0,
  capacidad = '14 jugadores (7 vs 7)', medidas = '50 x 30 m',
  iluminacion = '6 Torres perimetrales de haz concentrado',
  descripcion = 'El espacio ideal para jugar con dinámica y metros para correr.',
  precio_hora = 46000
WHERE id = 'cancha_2';

INSERT INTO canchas (id, tenant_id, nombre, tipo, categoria, numero, descripcion, precio_hora, superficie, techada, capacidad, medidas, iluminacion)
VALUES
  ('cancha_3', 'tenant_norte', 'El Monumentalito', 'futbol5', 'F5', 2,
   'Cancha rápida al aire libre con vista al cielo nocturno.', 28000,
   'Césped Sintético Pro', 0, '10 jugadores (5 vs 5)', '32 x 20 m',
   '4 Torres LED 600W de alta visibilidad'),

  ('cancha_4', 'tenant_norte', 'La Scaloneta', 'futbol7', 'F7', 4,
   'Nuestra joya de F7 techada, con tinglado de altura profesional.', 52000,
   'Sintético Premium Bicolor', 1, '14 jugadores (7 vs 7)', '52 x 32 m',
   'Sistema lumínico suspendido de alta definición'),

  ('cancha_5', 'tenant_norte', 'El Potrero Central', 'futbol11', 'F11', 5,
   'La experiencia definitiva de jugar en cancha grande de 11, césped natural.', 88000,
   'Césped Natural Profesional', 0, '22 jugadores (11 vs 11)', '95 x 62 m',
   '8 Torres de estadio nivel transmisión nocturna'),

  ('cancha_6', 'tenant_norte', 'Maracaná Nocturno', 'futbol11', 'F11', 6,
   'Dimensiones oficiales y césped sintético de densidad máxima.', 94000,
   'Sintético FIFA Quality Pro', 0, '22 jugadores (11 vs 11)', '100 x 64 m',
   'Reflectores LED 1200W iluminación 360°');