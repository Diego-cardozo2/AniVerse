import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { aniVerseServices } from '../lib/supabaseClient'
import './FeedPostComposer.css'

const FeedPostComposer = ({ onPostCreated, currentUserId }) => {
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)

  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

  // Obtener perfil del usuario
  useEffect(() => {
    const getUserProfile = async () => {
      if (!currentUserId) return

      try {
        const { data, error } = await supabase
          .from('users')
          .select('avatar_url, display_name, username')
          .eq('id', currentUserId)
          .single()

        if (!error && data) {
          setUserProfile(data)
        }
      } catch (error) {
        console.error('Error al obtener perfil:', error)
      }
    }

    getUserProfile()
  }, [currentUserId])

  // Manejar selección de imagen
  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Solo se permiten imágenes (JPEG, PNG, WebP, GIF)')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('La imagen debe ser menor a 5MB')
      return
    }

    setImageFile(file)
    setError(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target.result)
    }
    reader.readAsDataURL(file)
  }

  // Subir imagen y crear post
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!currentUserId) {
      setError('Debes iniciar sesión para publicar')
      return
    }

    if (!content.trim()) {
      setError('Por favor escribe algo en tu publicación')
      textareaRef.current?.focus()
      return
    }

    if (content.trim().length < 3) {
      setError('La publicación debe tener al menos 3 caracteres')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let imageUrl = null

      // Subir imagen si existe
      if (imageFile) {
        try {
          // Generar nombre único para el archivo
          const fileExt = imageFile.name.split('.').pop()
          const fileName = `${currentUserId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
          const filePath = `posts-media/${fileName}`

          // Subir archivo
          const { error: uploadError } = await supabase.storage
            .from('posts-media')
            .upload(filePath, imageFile, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) throw uploadError

          // Obtener URL pública
          const { data: publicData } = supabase.storage
            .from('posts-media')
            .getPublicUrl(filePath)

          imageUrl = publicData.publicUrl
        } catch (uploadError) {
          throw new Error(`Error al subir imagen: ${uploadError.message}`)
        }
      }

      // Crear post en la base de datos
      const { data, error } = await supabase
        .from('posts')
        .insert([{
          user_id: currentUserId,
          content: content.trim(),
          image_url: imageUrl,
          likes_count: 0,
          comments_count: 0
        }])
        .select(`
          *,
          user:users!posts_user_id_fkey(
            id,
            username,
            avatar_url,
            display_name
          )
        `)
        .single()

      if (error) throw error
      const newPost = data

      // Limpiar formulario
      setContent('')
      setImageFile(null)
      setImagePreview(null)

      // Notificar al componente padre
      if (onPostCreated) {
        onPostCreated(newPost)
      }
    } catch (error) {
      console.error('Error al crear post:', error)
      setError(error.message || 'Error al crear la publicación')
    } finally {
      setLoading(false)
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [content])

  const handleGifClick = () => {
    // TODO: Implementar selector de GIF
    console.log('GIF selector - Por implementar')
  }

  const handleEmojiClick = () => {
    // TODO: Implementar selector de emoji
    console.log('Emoji selector - Por implementar')
  }

  return (
    <div className="feed-post-composer">
      <div className="composer-content">
        {/* Avatar */}
        <div className="composer-avatar">
          {userProfile?.avatar_url ? (
            <img src={userProfile.avatar_url} alt={userProfile.display_name || 'Usuario'} />
          ) : (
            <div className="avatar-placeholder">
              {userProfile?.display_name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
        </div>

        {/* Área de contenido */}
        <div className="composer-main">
          <form onSubmit={handleSubmit}>
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="¿Qué está pasando?"
              className="composer-textarea"
              rows={1}
              disabled={loading}
            />

            {/* Preview de imagen */}
            {imagePreview && (
              <div className="image-preview-wrapper">
                <img src={imagePreview} alt="Preview" className="preview-image" />
                <button
                  type="button"
                  className="remove-preview-btn"
                  onClick={() => {
                    setImageFile(null)
                    setImagePreview(null)
                    setError(null)
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            )}

            {/* Iconos de acciones */}
            <div className="composer-actions">
              <div className="action-icons">
                <button
                  type="button"
                  className="action-icon"
                  onClick={() => fileInputRef.current?.click()}
                  title="Añadir imagen"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21,15 16,10 5,21"/>
                  </svg>
                </button>
              </div>

              {/* Botón Postear */}
              <button
                type="submit"
                className={`post-button ${loading || !content.trim() ? 'disabled' : ''}`}
                disabled={loading || !content.trim()}
              >
                {loading ? 'Publicando...' : 'Postear'}
              </button>
            </div>

            {/* Input de archivo oculto */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden-file-input"
              disabled={loading}
            />
          </form>

          {/* Mensaje de error */}
          {error && (
            <div className="composer-error">
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FeedPostComposer

