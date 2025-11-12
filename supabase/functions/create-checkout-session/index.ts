// Supabase Edge Function: create-checkout-session
// Esta función crea una sesión de checkout de Stripe de forma segura

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejar preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar que el usuario esté autenticado
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado. Debes iniciar sesión.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Obtener el token de autenticación
    const token = authHeader.replace('Bearer ', '')
    
    // Verificar el token con Supabase usando el endpoint correcto
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    
    const userResponse = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseAnonKey,
        },
      }
    )

    if (!userResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Token de autenticación inválido' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const userData = await userResponse.json()
    const user = userData.user || userData

    if (!user || !user.id) {
      return new Response(
        JSON.stringify({ error: 'Usuario no encontrado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Obtener el plan_level del body de la petición
    const { plan_level } = await req.json()

    if (!plan_level || !['fan_starter', 'pro_otaku'].includes(plan_level)) {
      return new Response(
        JSON.stringify({ error: 'Plan inválido. Debe ser fan_starter o pro_otaku' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Configurar los precios según el plan (estos deben coincidir con los Price IDs de Stripe)
    const priceIds: Record<string, string> = {
      fan_starter: Deno.env.get('STRIPE_PRICE_ID_FAN_STARTER') || '',
      pro_otaku: Deno.env.get('STRIPE_PRICE_ID_PRO_OTAKU') || '',
    }

    const priceId = priceIds[plan_level]

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: 'Price ID no configurado para este plan' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Obtener o crear el cliente de Stripe
    let customerId: string | null = null

    // Buscar si el usuario ya tiene un customer_id en la tabla subscriptions
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    const { data: existingSubscription } = await fetch(
      `${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${user.id}&select=stripe_customer_id`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
      }
    ).then(res => res.json())

    if (existingSubscription && existingSubscription.length > 0 && existingSubscription[0].stripe_customer_id) {
      customerId = existingSubscription[0].stripe_customer_id
    } else {
      // Crear un nuevo cliente en Stripe
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id

      // Guardar el customer_id en la base de datos
      await fetch(
        `${supabaseUrl}/rest/v1/subscriptions`,
        {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            user_id: user.id,
            stripe_customer_id: customerId,
            plan_level: plan_level,
            status: 'inactive',
          }),
        }
      )
    }

    // Crear la sesión de checkout de Stripe
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/pricing?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        plan_level: plan_level,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_level: plan_level,
        },
      },
    })

    // Devolver la URL de checkout
    return new Response(
      JSON.stringify({ 
        checkout_url: session.url,
        session_id: session.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error en create-checkout-session:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Error al crear la sesión de checkout',
        details: error instanceof Error ? error.message : 'Error desconocido',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

