# 🔐 Guía de Configuración de Stripe

## Pasos para activar Stripe en EXPO COSPIDE

### 1. Crear Cuenta de Stripe
1. Ve a [stripe.com](https://stripe.com)
2. Crea una cuenta empresarial
3. Verifica tu correo y completa el perfil

### 2. Obtener Claves API
1. En tu dashboard de Stripe, ve a **Settings → API Keys**
2. Copia tu **Publishable Key** (empieza con `pk_live_`)
3. Copia tu **Secret Key** (empieza con `sk_live_`)

### 3. Configurar Variables de Entorno

#### En Vercel:
1. Ve a tu proyecto en [vercel.com](https://vercel.com)
2. Settings → Environment Variables
3. Agrega:
   ```
   STRIPE_PUBLIC_KEY=pk_live_...
   STRIPE_SECRET_KEY=sk_live_...
   SUPABASE_URL=https://...supabase.co
   SUPABASE_SERVICE_ROLE_KEY=...
   STRIPE_WEBHOOK_SECRET=whsec_... (después de crear webhook)
   ```

#### Localmente:
1. Crea archivo `.env` (copia de `.env.example`)
2. Rellena con tus claves

### 4. Configurar Webhook de Stripe
Para confirmar pagos automáticamente:

1. En Stripe Dashboard, ve a **Developers → Webhooks**
2. Click en **"Add endpoint"**
3. URL: `https://tu-dominio.com/api/webhook-stripe`
4. Eventos a escuchar:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copia el **Signing Secret** (empieza con `whsec_`)
6. Agrega como `STRIPE_WEBHOOK_SECRET` en variables de entorno

### 5. Configurar Base de Datos (Supabase)

Crea esta tabla en Supabase:

```sql
CREATE TABLE registros (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  plan VARCHAR(50) NOT NULL,
  estado VARCHAR(50) DEFAULT 'pendiente',
  monto DECIMAL(10, 2) DEFAULT 0,
  stripe_payment_id VARCHAR(255),
  stripe_response JSONB,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_pago TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email ON registros(email);
CREATE INDEX idx_stripe_id ON registros(stripe_payment_id);
```

### 6. Probar Integración

#### Tarjetas de Prueba Stripe:
- **Éxito**: 4242 4242 4242 4242
- **Declinada**: 4000 0000 0000 0002
- **Expiración**: Cualquier fecha futura
- **CVV**: Cualquier 3 dígitos

#### Pruebas:
1. Abre `/evento`
2. Haz click en un botón de compra
3. Usa números de tarjeta de prueba
4. Verifica que los registros aparezcan en Supabase

### 7. Actualizar Public Key en evento.html

En `evento.html`, línea ~2750, reemplaza:
```javascript
const STRIPE_PUBLIC_KEY = 'pk_live_...'; // Tu clave aquí
```

### 8. Deploy a Producción

```bash
vercel deploy --prod
```

## 🔒 Consideraciones de Seguridad

- ✅ Nunca expongas tu `sk_live_` (secret key)
- ✅ Usa webhooks para confirmar pagos (no confíes en el cliente)
- ✅ Valida montos en el servidor
- ✅ Cifra datos sensibles en la BD
- ✅ Usa HTTPS siempre

## 📞 Soporte

- **Stripe Docs**: https://stripe.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs

## 💡 Configuración de Precios

Los precios están en `PLANS` dentro de `/api/create-checkout-session.js`:
- Conference Pass: $497 MXN
- VIP Pass: $847 MXN

Para cambiar, edita los valores en `amount` (en centavos).
