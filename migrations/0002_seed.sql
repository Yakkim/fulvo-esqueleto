-- Seed de prueba: 1 tenant + 2 canchas

INSERT INTO tenants (id, subdominio, nombre, color_primario, slogan, whatsapp_contacto)
VALUES (
  'tenant_norte',
  'cancha-norte',
  'Cancha Norte',
  '#1a73e8',
  'Reservá tu cancha en segundos',
  '5491122334455'
);

INSERT INTO canchas (id, tenant_id, nombre, tipo, precio_hora)
VALUES
  ('cancha_1', 'tenant_norte', 'Cancha 1 - Futbol 5', 'futbol5', 15000),
  ('cancha_2', 'tenant_norte', 'Cancha 2 - Futbol 7', 'futbol7', 22000);