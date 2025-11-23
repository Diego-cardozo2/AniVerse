import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Función para cargar el user_role del perfil
  const loadUserRole = async (userId) => {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('user_role')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Error al cargar user_role:', error)
        setUserRole('FREEMIUM') // Valor por defecto
        return
      }
      
      const role = profile?.user_role || 'FREEMIUM'
      setUserRole(role)
      console.log('✅ User role cargado en useAuth:', role)
    } catch (error) {
      console.error('Error al cargar user_role:', error)
      setUserRole('FREEMIUM') // Valor por defecto
    }
  }

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
      setUserRole(null)
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

      // Si se actualiza user_role, recargar el estado
      if (updates.user_role) {
        await loadUserRole(user.id)
      }

      return true
    } catch (error) {
      console.error('Error al actualizar perfil:', error)
      setError(error.message)
      return false
    }
  }

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
          setUserRole(null)
        } else {
          console.log('Sesión inicial:', session?.user?.email || 'No hay sesión')
          const authUser = session?.user ?? null
          setUser(authUser)
          setError(null)
          
          // Cargar user_role del perfil si hay usuario
          if (authUser) {
            await loadUserRole(authUser.id)
          } else {
            setUserRole(null)
          }
        }
      } catch (err) {
        console.error('Error:', err)
        if (isMounted) {
          setError(err.message)
          setUser(null)
          setUserRole(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    getInitialSession()

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
              // Cargar user_role después de asegurar que el usuario existe
              await loadUserRole(session.user.id)
            } catch (profileError) {
              console.error('Error al crear perfil:', profileError)
              // No bloquear el login por errores de perfil
            }
          } else if (event === 'SIGNED_OUT') {
            console.log('Usuario cerrado sesión')
            setUser(null)
            setUserRole(null)
            setError(null)
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            console.log('Token refrescado para:', session.user.email)
            setUser(session.user)
            setError(null)
            // Recargar user_role al refrescar token
            await loadUserRole(session.user.id)
          }
        } catch (err) {
          console.error('Error al manejar cambio de auth:', err)
          setError(err.message)
          setUser(null)
          setUserRole(null)
        }
      }
    )
    
    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    userRole,
    loading,
    error,
    signOut,
    updateProfile,
    isAuthenticated: !!user,
    refreshUserRole: () => user?.id && loadUserRole(user.id)
  }
}
