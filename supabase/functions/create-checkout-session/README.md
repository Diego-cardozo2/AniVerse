# Edge Function: create-checkout-session

Esta función crea una sesión de checkout de Stripe de forma segura para procesar suscripciones.

## Variables de Entorno Requeridas

Configura estas variables en el dashboard de Supabase (Settings > Edge Functions > Secrets):

- `STRIPE_SECRET_KEY`: Tu clave secreta de Stripe (sk_live_... o sk_test_...)
- `STRIPE_PRICE_ID_FAN_STARTER`: El Price ID del plan Fan Starter en Stripe
- `STRIPE_PRICE_ID_PRO_OTAKU`: El Price ID del plan Pro Otaku en Stripe
- `SUPABASE_URL`: La URL de tu proyecto Supabase
- `SUPABASE_ANON_KEY`: La clave anónima de Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: La clave de servicio de Supabase (para operaciones administrativas)
- `SITE_URL`: La URL de tu aplicación frontend (ej: https://aniverse.app)

## Uso

```typescript
const response = await fetch('https://your-project.supabase.co/functions/v1/create-checkout-session', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseAccessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    plan_level: 'fan_starter' // o 'pro_otaku'
  })
})

const { checkout_url } = await response.json()
window.location.href = checkout_url
```

## Notas

- Esta función requiere autenticación (token de Supabase)
- Los webhooks de Stripe deben configurarse por separado para actualizar el estado de las suscripciones
- Asegúrate de tener los Price IDs correctos configurados en Stripe

