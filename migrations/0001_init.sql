-- ============================================
-- Migración 0001: Schema inicial
-- tenants, canchas, reservas
-- ============================================

CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  subdominio TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,

  -- Branding (personalización por tenant)
  logo_url TEXT,
  color_primario TEXT DEFAULT '#1a73e8',
  color_secundario TEXT DEFAULT '#f5f5f5',
  slogan TEXT,
  whatsapp_contacto TEXT,
  direccion TEXT,

  -- Config general
  activo INTEGER DEFAULT 1,
  creado_en TEXT DEFAULT (datetime('now'))
);

CREATE TABLE canchas (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,

  nombre TEXT NOT NULL,
  tipo TEXT,                      -- ej: 'futbol5', 'futbol7', 'padel'
  descripcion TEXT,
  precio_hora REAL NOT NULL,
  imagen_url TEXT,
  activa INTEGER DEFAULT 1,

  creado_en TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE reservas (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  cancha_id TEXT NOT NULL,

  nombre_cliente TEXT NOT NULL,
  telefono_cliente TEXT,
  email_cliente TEXT,

  fecha TEXT NOT NULL,            -- formato 'YYYY-MM-DD'
  hora_inicio TEXT NOT NULL,      -- formato 'HH:MM'
  hora_fin TEXT NOT NULL,

  estado TEXT DEFAULT 'pendiente', -- 'pendiente' | 'confirmada' | 'cancelada'
  monto_total REAL,
  pago_id TEXT,                    -- referencia a Mercado Pago (Fase 9)

  creado_en TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (cancha_id) REFERENCES canchas(id)
);

-- ============================================
-- Índices (aislamiento y performance multi-tenant)
-- ============================================

CREATE INDEX idx_canchas_tenant ON canchas(tenant_id);
CREATE INDEX idx_reservas_tenant ON reservas(tenant_id);
CREATE INDEX idx_reservas_cancha ON reservas(cancha_id);
CREATE INDEX idx_reservas_fecha ON reservas(tenant_id, cancha_id, fecha);
CREATE UNIQUE INDEX idx_tenants_subdominio ON tenants(subdominio);