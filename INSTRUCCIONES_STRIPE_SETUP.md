# Instrucciones para Configurar Stripe con Supabase

## Paso 1: Crear la Tabla de Suscripciones

1. Ve al **SQL Editor** en tu dashboard de Supabase
2. Copia y ejecuta el contenido del archivo `supabase_migrations/create_subscriptions_table.sql`
3. Verifica que la tabla `subscriptions` se haya creado correctamente

## Paso 2: Configurar Stripe

1. Crea una cuenta en [Stripe](https://stripe.com) si no la tienes
2. Ve al Dashboard de Stripe > **Products** > **Add Product**
3. Crea dos productos:
   - **Fan Starter**: $2.99/mes (recurring)
   - **Pro Otaku**: $6.99/mes (recurring)
4. Copia los **Price IDs** de cada producto (empiezan con `price_...`)

## Paso 3: Configurar Variables de Entorno en Supabase

1. Ve a **Settings** > **Edge Functions** en tu dashboard de Supabase
2. Agrega los siguientes **Secrets**:

```
STRIPE_SECRET_KEY=sk_test_... (o sk_live_... para producción)
STRIPE_PRICE_ID_FAN_STARTER=price_... (el Price ID del plan Fan Starter)
STRIPE_PRICE_ID_PRO_OTAKU=price_... (el Price ID del plan Pro Otaku)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
SITE_URL=https://tu-dominio.com (o http://localhost:5173 para desarrollo)
```

## Paso 4: Desplegar la Edge Function

1. Instala la CLI de Supabase si no la tienes:
   ```bash
   npm install -g supabase
   ```

2. Inicia sesión en Supabase:
   ```bash
   supabase login
   ```

3. Enlaza tu proyecto:
   ```bash
   supabase link --project-ref tu-project-ref
   ```

4. Despliega la función:
   ```bash
   supabase functions deploy create-checkout-session
   ```

## Paso 5: Verificar la Configuración

1. Asegúrate de que la función esté desplegada correctamente
2. Verifica que todas las variables de entorno estén configuradas
3. Prueba el flujo de suscripción desde la aplicación

## Notas Importantes

- **Modo de Prueba**: Usa `sk_test_...` para desarrollo y pruebas
- **Modo de Producción**: Cambia a `sk_live_...` cuando estés listo para producción
- **Webhooks**: Los webhooks de Stripe deben configurarse por separado (fuera del alcance del MVP)
- **URLs de Retorno**: Asegúrate de que `SITE_URL` apunte a la URL correcta de tu aplicación

## Troubleshooting

- Si la función no se despliega, verifica que tengas la CLI de Supabase actualizada
- Si hay errores de autenticación, verifica que el token de sesión se esté enviando correctamente
- Si Stripe no crea la sesión, verifica que los Price IDs sean correctos y que estén en el modo correcto (test/live)

