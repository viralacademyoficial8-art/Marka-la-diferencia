# 🎯 Funnel Masterclass - Sistema de Conversión

Sistema completo de embudo de conversión para eventos/masterclasses.

## 📁 Archivos

| Archivo | Descripción |
|---------|-------------|
| `index.html` | Landing page principal |
| `confirmacion.html` | Página post-registro (95%) |
| `admin.html` | Panel de administración |
| `speaker-photo.jpg` | Foto de la mentora |

## 🎨 Colores de Marca

- **Amarillo Limón:** `#F6FF54`
- **Violeta Intenso:** `#7B53F0`
- **Gris Oscuro:** `#232021`
- **Blanco Suave:** `#F5F5F5`

## ⚙️ Configuración Rápida

### Reemplazar en `index.html` y `confirmacion.html`:

1. `[FECHA]` → Fecha del evento
2. `[HORA]` → Hora del evento  
3. `[Nombre]` → Nombre de la presentadora
4. `[Tu Empresa]` → Tu empresa
5. `TU_VIDEO_ID` → ID de YouTube
6. `TU_LINK_DE_GRUPO` → Link de WhatsApp

### Fecha del countdown (index.html línea ~último script):
```javascript
const eventDate = new Date('2025-02-15T10:00:00');
```

## 🚀 Deploy en Vercel

1. Sube estos archivos a GitHub
2. Conecta el repo en vercel.com
3. Deploy automático

## 📱 URLs

- Landing: `/`
- Confirmación: `/confirmacion.html`
- Admin: `/admin.html`

---
Desarrollado con 💜
