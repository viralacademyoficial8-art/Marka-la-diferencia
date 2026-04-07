# Funnel Masterclass - Sistema de Conversion

Sistema completo de embudo de conversion para eventos/masterclasses con backend en Supabase.

## Arquitectura

```
Frontend (HTML + JS)          Backend (Supabase)
 index.html ──────────────> Edge Function: registro-lead
 confirmacion.html ───────> Edge Function: actualizar-paso
 admin.html ──────────────> Edge Function: dashboard-stats
                            Edge Function: webhook-email
                            PostgreSQL (tablas, vistas, RLS)
                            Auth (login admin)
                            Realtime (suscripciones)
```

## Archivos

| Archivo | Descripcion |
|---------|-------------|
| `index.html` | Landing page principal con formulario de registro |
| `confirmacion.html` | Pagina post-registro (95%) con tracking de pasos |
| `admin.html` | Panel de administracion con auth y datos reales |
| `config.js` | Configuracion de Supabase y utilidades compartidas |
| `vercel.json` | Configuracion de rutas para Vercel |
| `speaker-photo.jpg` | Foto de la mentora |
| `supabase/migrations/001_initial_schema.sql` | Schema completo de la base de datos |
| `supabase/functions/registro-lead/index.ts` | Edge Function para registro de leads |
| `supabase/functions/actualizar-paso/index.ts` | Edge Function para tracking de pasos |
| `supabase/functions/dashboard-stats/index.ts` | Edge Function para estadisticas del admin |
| `supabase/functions/webhook-email/index.ts` | Edge Function para email marketing |

## Colores de Marca

- **Amarillo Limon:** `#F6FF54`
- **Violeta Intenso:** `#7B53F0`
- **Gris Oscuro:** `#232021`
- **Blanco Suave:** `#F5F5F5`

## Configuracion

### 1. Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ejecutar `supabase/migrations/001_initial_schema.sql` en el SQL Editor
3. Crear un usuario admin en Authentication > Users
4. Deploy de Edge Functions desde `supabase/functions/`

### 2. config.js

Editar `config.js` con tus credenciales:

```javascript
SUPABASE_URL: 'https://TU_PROYECTO.supabase.co',
SUPABASE_ANON_KEY: 'TU_ANON_KEY_AQUI',
EVENTO_SLUG: 'masterclass-2025',
```

### 3. Placeholders en HTML

Reemplazar en `index.html` y `confirmacion.html`:

1. `[FECHA]` - Fecha del evento
2. `[HORA]` - Hora del evento
3. `[Nombre]` - Nombre de la presentadora
4. `[Tu Empresa]` - Tu empresa
5. `TU_VIDEO_ID` - ID de YouTube
6. `TU_LINK_DE_GRUPO` - Link de grupo WhatsApp

### 4. Vercel

1. Conectar el repo en vercel.com
2. Deploy automatico con `vercel.json`

## URLs

| Ruta | Pagina |
|------|--------|
| `/` | Landing page |
| `/confirmacion` | Pagina de confirmacion |
| `/admin` | Panel de administracion |

## Base de Datos

### Tablas principales

- `eventos` - Eventos/masterclasses (multi-evento)
- `registros` - Leads del embudo con datos UTM y Meta Pixel
- `page_views` - Analiticas de visitas por pagina
- `eventos_tracking` - Cada accion del embudo (para Meta CAPI)
- `admin_users` - Usuarios del panel admin
- `configuraciones` - Settings globales (Pixel, webhooks, email)
- `webhooks_log` - Log de webhooks enviados

### Vistas

- `vista_estadisticas_evento` - KPIs agregados por evento
- `vista_registros_por_dia` - Registros agrupados por dia
- `vista_fuentes_trafico` - Fuentes UTM con porcentajes

## Flujo del Embudo

```
1. Visitante llega a landing (PageView)
2. Completa formulario (Lead) -> registro-lead Edge Function
3. Redirige a confirmacion (CompleteRegistration)
4. Clic en WhatsApp (WhatsAppJoin) -> actualizar-paso
5. Agrega calendario (Schedule) -> actualizar-paso
6. [Opcional] Compra VIP (Purchase) -> actualizar-paso
```

## Variables de Entorno (Supabase Edge Functions)

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

## Meta Pixel / Conversions API

- Client-side: Pixel fires en cada paso del embudo
- Server-side: CAPI via Edge Functions con datos hasheados
- Deduplicacion: event_id unico compartido entre Pixel y CAPI
- Configuracion desde el panel admin (Integraciones > Meta Pixel)
- Updates MAKERS 2026

---
Desarrollado con Supabase + Vercel
