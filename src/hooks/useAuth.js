import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    
    // Obtener sesión inicial
    const getInitialSession = async () => {
      try {
        console.log('Obteniendo sesión inicial...')
        setLoading(true)
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        if (error) {
          console.error('Error al obtener sesión:', error)
          setError(error.message)
          setUser(null)
        } else {
          console.log('Sesión inicial:', session?.user?.email || 'No hay sesión')
          setUser(session?.user ?? null)
          setError(null)
        }
      } catch (err) {
        console.error('Error:', err)
        if (isMounted) {
          setError(err.message)
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    getInitialSession()
    
    return () => {
      isMounted = false
    }

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email || 'No user')
        
        try {
          setLoading(false) // Siempre quitar loading cuando hay un cambio de estado
          
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('Usuario firmado correctamente:', session.user.email)
            setUser(session.user)
            setError(null)
            
            // Asegurar que el usuario existe en la tabla users
            try {
              await ensureUserExists(session.user)
            } catch (profileError) {
              console.error('Error al crear perfil:', profileError)
              // No bloquear el login por errores de perfil
            }
          } else if (event === 'SIGNED_OUT') {
            console.log('Usuario cerrado sesión')
            setUser(null)
            setError(null)
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            console.log('Token refrescado para:', session.user.email)
            setUser(session.user)
            setError(null)
          }
        } catch (err) {
          console.error('Error al manejar cambio de auth:', err)
          setError(err.message)
          setUser(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Función para asegurar que el usuario existe en la tabla users
  const ensureUserExists = async (user) => {
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingUser) {
        // Crear usuario si no existe
        const { error } = await supabase
          .from('users')
          .insert([
            {
              id: user.id,
              email: user.email,
              username: user.email?.split('@')[0] || 'usuario',
              display_name: user.user_metadata?.full_name || user.user_metadata?.display_name || user.email?.split('@')[0] || 'Usuario',
              avatar_url: user.user_metadata?.avatar_url || null,
              bio: null
            }
          ])

        if (error && !error.message.includes('duplicate key')) {
          console.error('Error al crear usuario:', error)
        }
      }
    } catch (error) {
      console.error('Error al verificar/crear usuario:', error)
    }
  }

  // Función para cerrar sesión
  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw error
      }
      
      setUser(null)
      setError(null)
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Función para actualizar perfil
  const updateProfile = async (updates) => {
    try {
      if (!user) throw new Error('No hay usuario autenticado')

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)

      if (error) {
        throw error
      }

      return true
    } catch (error) {
      console.error('Error al actualizar perfil:', error)
      setError(error.message)
      return false
    }
  }

  return {
    user,
    loading,
    error,
    signOut,
    updateProfile,
    isAuthenticated: !!user
  }
}
