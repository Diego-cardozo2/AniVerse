// Supabase Edge Function: login-without-email-confirmation
// Esta función permite hacer login sin confirmar el email usando la API de administración

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const { email, password } = await req.json()

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email y contraseña son requeridos' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Crear cliente de Supabase con service role key para acceso de administrador
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Intentar hacer login normal primero
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    })

    // Si el error es por email no confirmado, confirmar el email automáticamente
    if (authError && authError.message.includes('Email not confirmed')) {
      try {
        // Obtener el usuario por email usando la API de administración
        const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
        
        if (usersError) {
          throw usersError
        }

        const user = users.find(u => u.email === email)
        
        if (user) {
          // Confirmar el email del usuario usando la API de administración
          const { data: updatedUser, error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { email_confirm: true }
          )

          if (confirmError) {
            throw confirmError
          }

          // Intentar login nuevamente después de confirmar
          const { data: retryData, error: retryError } = await supabaseAdmin.auth.signInWithPassword({
            email,
            password,
          })

          if (retryError) {
            throw retryError
          }

          return new Response(
            JSON.stringify({
              user: retryData.user,
              session: retryData.session,
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        } else {
          throw new Error('Usuario no encontrado')
        }
      } catch (adminError) {
        console.error('Error al confirmar email automáticamente:', adminError)
        // Si falla, devolver el error original
        throw authError
      }
    }

    if (authError) {
      throw authError
    }

    return new Response(
      JSON.stringify({
        user: authData.user,
        session: authData.session,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error en login:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Error al iniciar sesión' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

