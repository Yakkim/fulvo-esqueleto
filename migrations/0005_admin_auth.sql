-- ============================================
-- Migración 0005: Autenticación Admin
-- Credenciales de administración por tenant
-- ============================================

ALTER TABLE tenants ADD COLUMN admin_usuario TEXT;
ALTER TABLE tenants ADD COLUMN admin_password_hash TEXT;
ALTER TABLE tenants ADD COLUMN admin_password_salt TEXT;

UPDATE tenants SET
  admin_usuario = 'Potrero',
  admin_password_hash = '11f338a980d061b23cc4c72d7a43553215212bcf89fa1f54fa4b3dd89defbea3',
  admin_password_salt = 'a3130fdee04140ead176ae80b90b1d86'
WHERE id = 'tenant_norte';
