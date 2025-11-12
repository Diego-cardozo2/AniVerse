import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import './FollowButton.css'

const FollowButton = ({ targetUserId, onFollowChange }) => {
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)

  // Obtener el usuario actual y verificar si ya está siguiendo
  useEffect(() => {
    const checkFollowStatus = async () => {
      try {
        setLoading(true)
        
        // Obtener usuario actual
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error('Error al obtener usuario:', userError)
          return
        }

        if (!user) {
          setLoading(false)
          return
        }

        setCurrentUserId(user.id)

        // Si el usuario actual es el mismo que el objetivo, no mostrar el botón
        if (user.id === targetUserId) {
          setLoading(false)
          return
        }

        // Verificar si el usuario actual está siguiendo al usuario objetivo
        const { data, error } = await supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Error al verificar estado de seguimiento:', error)
        } else {
          setIsFollowing(!!data)
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    if (targetUserId) {
      checkFollowStatus()
    }
  }, [targetUserId])

  // Manejar seguir/dejar de seguir
  const handleToggleFollow = async () => {
    if (!currentUserId || processing) return

    try {
      setProcessing(true)

      if (isFollowing) {
        // Dejar de seguir
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', targetUserId)

        if (error) {
          throw error
        }

        setIsFollowing(false)
        
        // Notificar al componente padre del cambio
        if (onFollowChange) {
          onFollowChange(false)
        }
      } else {
        // Seguir
        const { error } = await supabase
          .from('user_follows')
          .insert([
            {
              follower_id: currentUserId,
              following_id: targetUserId
            }
          ])

        if (error) {
          throw error
        }

        setIsFollowing(true)
        
        // Notificar al componente padre del cambio
        if (onFollowChange) {
          onFollowChange(true)
        }
      }
    } catch (error) {
      console.error('Error al cambiar estado de seguimiento:', error)
      alert('Error al procesar la acción. Por favor, intenta de nuevo.')
    } finally {
      setProcessing(false)
    }
  }

  // No mostrar el botón si el usuario actual es el mismo que el objetivo
  if (!currentUserId || currentUserId === targetUserId || loading) {
    return null
  }

  return (
    <button
      className={`follow-button ${isFollowing ? 'following' : 'not-following'}`}
      onClick={handleToggleFollow}
      disabled={processing || loading}
    >
      {processing ? (
        <span className="follow-button-loading"></span>
      ) : isFollowing ? (
        'SIGUIENDO'
      ) : (
        'SEGUIR'
      )}
    </button>
  )
}

export default FollowButton
