-- ============================================
-- Migración 0003: completar schema de canchas/reservas + tabla bloqueos
-- ============================================

ALTER TABLE canchas ADD COLUMN numero INTEGER;
ALTER TABLE canchas ADD COLUMN categoria TEXT;
ALTER TABLE canchas ADD COLUMN superficie TEXT;
ALTER TABLE canchas ADD COLUMN techada INTEGER DEFAULT 0;
ALTER TABLE canchas ADD COLUMN capacidad TEXT;
ALTER TABLE canchas ADD COLUMN medidas TEXT;
ALTER TABLE canchas ADD COLUMN iluminacion TEXT;

ALTER TABLE reservas ADD COLUMN metodo_pago TEXT;
ALTER TABLE reservas ADD COLUMN notas TEXT;

CREATE TABLE bloqueos (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  cancha_id TEXT NOT NULL,

  fecha TEXT NOT NULL,        -- formato 'YYYY-MM-DD'
  horarios TEXT NOT NULL,     -- JSON array de horas, ej: '["14:00","15:00"]'
  motivo TEXT NOT NULL,       -- 'Mantenimiento' | 'Lluvia' | 'Evento privado' | 'Otro'
  nota TEXT,

  creado_en TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (cancha_id) REFERENCES canchas(id)
);

CREATE INDEX idx_bloqueos_tenant ON bloqueos(tenant_id);
CREATE INDEX idx_bloqueos_cancha_fecha ON bloqueos(tenant_id, cancha_id, fecha);