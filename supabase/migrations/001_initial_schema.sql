-- =============================================
-- MIGRACIÓN INICIAL: Sistema de Embudo de Conversión
-- =============================================

-- =============================================
-- TABLA: eventos (para multi-evento)
-- =============================================
CREATE TABLE eventos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT,
  fecha_evento TIMESTAMP WITH TIME ZONE,
  fecha_cierre_registro TIMESTAMP WITH TIME ZONE,
  url_whatsapp VARCHAR(500),
  url_zoom VARCHAR(500),
  precio_vip DECIMAL(10,2) DEFAULT 14.00,
  moneda VARCHAR(3) DEFAULT 'USD',
  activo BOOLEAN DEFAULT true,
  config_pixel JSONB DEFAULT '{}',
  config_email JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABLA: registros (leads del embudo)
-- =============================================
CREATE TABLE registros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,

  -- Datos del usuario
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  whatsapp VARCHAR(50),

  -- Estado del embudo
  paso_actual INTEGER DEFAULT 1,
  registro_completado BOOLEAN DEFAULT true,
  whatsapp_joined BOOLEAN DEFAULT false,
  calendario_added BOOLEAN DEFAULT false,
  tipo_calendario VARCHAR(20),

  -- VIP
  es_vip BOOLEAN DEFAULT false,
  vip_pagado_at TIMESTAMP WITH TIME ZONE,
  vip_order_id VARCHAR(100),

  -- Tracking
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_content VARCHAR(100),
  utm_term VARCHAR(100),
  referrer TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Meta Pixel
  fbp VARCHAR(100),
  fbc VARCHAR(100),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  whatsapp_joined_at TIMESTAMP WITH TIME ZONE,
  calendario_added_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(evento_id, email)
);

-- =============================================
-- TABLA: page_views (analytics)
-- =============================================
CREATE TABLE page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
  pagina VARCHAR(50) NOT NULL,
  session_id VARCHAR(100),
  ip_address VARCHAR(45),
  user_agent TEXT,
  referrer TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABLA: eventos_tracking (cada acción)
-- =============================================
CREATE TABLE eventos_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_id UUID REFERENCES registros(id) ON DELETE CASCADE,
  evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,

  tipo_evento VARCHAR(50) NOT NULL,
  evento_meta VARCHAR(50),
  datos JSONB DEFAULT '{}',

  event_id VARCHAR(100),
  enviado_pixel BOOLEAN DEFAULT false,
  enviado_capi BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABLA: admin_users (usuarios del panel)
-- =============================================
CREATE TABLE admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  rol VARCHAR(20) DEFAULT 'viewer',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABLA: configuraciones (settings globales)
-- =============================================
CREATE TABLE configuraciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clave VARCHAR(100) UNIQUE NOT NULL,
  valor JSONB NOT NULL,
  descripcion TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABLA: webhooks_log (registro de webhooks enviados)
-- =============================================
CREATE TABLE webhooks_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_id UUID REFERENCES registros(id),
  tipo VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  exitoso BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================
CREATE INDEX idx_registros_evento ON registros(evento_id);
CREATE INDEX idx_registros_email ON registros(email);
CREATE INDEX idx_registros_created ON registros(created_at DESC);
CREATE INDEX idx_page_views_evento ON page_views(evento_id);
CREATE INDEX idx_page_views_created ON page_views(created_at DESC);
CREATE INDEX idx_tracking_evento ON eventos_tracking(evento_id);
CREATE INDEX idx_tracking_registro ON eventos_tracking(registro_id);

-- =============================================
-- FUNCIONES Y TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_eventos_updated_at
  BEFORE UPDATE ON eventos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_registros_updated_at
  BEFORE UPDATE ON registros
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- FUNCIÓN RPC: registros por hora (para heatmap)
-- =============================================
CREATE OR REPLACE FUNCTION get_registros_por_hora(
  p_evento_id UUID,
  p_fecha_inicio TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  dia_semana INTEGER,
  hora INTEGER,
  total BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(DOW FROM r.created_at)::INTEGER AS dia_semana,
    EXTRACT(HOUR FROM r.created_at)::INTEGER AS hora,
    COUNT(*) AS total
  FROM registros r
  WHERE r.evento_id = p_evento_id
    AND r.created_at >= p_fecha_inicio
  GROUP BY
    EXTRACT(DOW FROM r.created_at),
    EXTRACT(HOUR FROM r.created_at)
  ORDER BY dia_semana, hora;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuraciones ENABLE ROW LEVEL SECURITY;

-- Políticas para lectura pública (landing page)
CREATE POLICY "Eventos activos son públicos" ON eventos
  FOR SELECT USING (activo = true);

-- Políticas para inserción desde landing (anon)
CREATE POLICY "Cualquiera puede registrarse" ON registros
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Cualquiera puede crear page_view" ON page_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Cualquiera puede crear tracking" ON eventos_tracking
  FOR INSERT WITH CHECK (true);

-- Políticas para admin (authenticated)
CREATE POLICY "Admins pueden ver todo" ON registros
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins pueden actualizar" ON registros
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins ven page_views" ON page_views
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins ven tracking" ON eventos_tracking
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins ven admin_users" ON admin_users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins ven configuraciones" ON configuraciones
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins actualizan configuraciones" ON configuraciones
  FOR UPDATE USING (auth.role() = 'authenticated');

-- =============================================
-- VISTAS PARA DASHBOARD
-- =============================================

CREATE VIEW vista_estadisticas_evento AS
SELECT
  e.id AS evento_id,
  e.nombre AS evento_nombre,
  e.slug,
  COUNT(DISTINCT pv.id) AS total_visitas,
  COUNT(DISTINCT r.id) AS total_registros,
  COUNT(DISTINCT CASE WHEN r.whatsapp_joined THEN r.id END) AS total_whatsapp,
  COUNT(DISTINCT CASE WHEN r.calendario_added THEN r.id END) AS total_calendario,
  COUNT(DISTINCT CASE WHEN r.es_vip THEN r.id END) AS total_vip,
  ROUND(COUNT(DISTINCT r.id)::numeric / NULLIF(COUNT(DISTINCT pv.id), 0) * 100, 2) AS tasa_conversion
FROM eventos e
LEFT JOIN page_views pv ON pv.evento_id = e.id AND pv.pagina = 'landing'
LEFT JOIN registros r ON r.evento_id = e.id
GROUP BY e.id, e.nombre, e.slug;

CREATE VIEW vista_registros_por_dia AS
SELECT
  evento_id,
  DATE(created_at) AS fecha,
  COUNT(*) AS total_registros,
  COUNT(CASE WHEN whatsapp_joined THEN 1 END) AS con_whatsapp,
  COUNT(CASE WHEN calendario_added THEN 1 END) AS con_calendario,
  COUNT(CASE WHEN es_vip THEN 1 END) AS vip
FROM registros
GROUP BY evento_id, DATE(created_at)
ORDER BY fecha DESC;

CREATE VIEW vista_fuentes_trafico AS
SELECT
  evento_id,
  COALESCE(utm_source, 'directo') AS fuente,
  COUNT(*) AS total,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER (PARTITION BY evento_id) * 100, 2) AS porcentaje
FROM registros
GROUP BY evento_id, utm_source
ORDER BY total DESC;

-- =============================================
-- DATOS INICIALES
-- =============================================

INSERT INTO eventos (nombre, slug, descripcion, fecha_evento, url_whatsapp) VALUES (
  'No Es Tu Producto, Eres Tú',
  'masterclass-2025',
  'Masterclass gratuita sobre desbloqueos mentales para emprendedores',
  '2025-02-15 10:00:00-06',
  'https://chat.whatsapp.com/TU_LINK_AQUI'
);

INSERT INTO configuraciones (clave, valor, descripcion) VALUES (
  'meta_pixel',
  '{"pixel_id": "", "access_token": "", "test_event_code": "", "enabled": false}',
  'Configuración de Meta Pixel y Conversions API'
);

INSERT INTO configuraciones (clave, valor, descripcion) VALUES (
  'webhooks',
  '{"on_registro": [], "on_whatsapp": [], "on_calendario": [], "on_vip": []}',
  'URLs de webhooks para cada evento del embudo'
);

INSERT INTO configuraciones (clave, valor, descripcion) VALUES (
  'email_marketing',
  '{"provider": "", "api_url": "", "api_key": "", "list_id": "", "enabled": false}',
  'Configuración de email marketing (ActiveCampaign, Mailchimp, etc.)'
);
