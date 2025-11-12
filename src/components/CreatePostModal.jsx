import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { aniVerseServices } from '../lib/supabaseClient'
import './CreatePostModal.css'

const CreatePostModal = ({ isOpen, onClose, onPostCreated }) => {
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Obtener usuario actual
  const [currentUser, setCurrentUser] = useState(null)

  useState(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getCurrentUser()
  }, [])

  // Manejar selección de imagen
  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      
      // Crear preview de la imagen
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Subir imagen a Supabase Storage
  const uploadImage = async (file) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `post-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Error al subir imagen:', error)
      throw error
    }
  }

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!content.trim()) {
      setError('Por favor escribe algo en tu publicación')
      return
    }

    if (!currentUser) {
      setError('Debes estar autenticado para crear publicaciones')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let imageUrl = null

      // Subir imagen si existe
      if (imageFile) {
        imageUrl = await uploadImage(imageFile)
      }

      // Crear el post
      const { data, error } = await supabase
        .from('posts')
        .insert([
          {
            user_id: currentUser.id,
            content: content.trim(),
            image_url: imageUrl,
            likes_count: 0,
            comments_count: 0
          }
        ])
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

      if (error) {
        throw error
      }

      // Limpiar formulario
      setContent('')
      setImageFile(null)
      setImagePreview(null)
      
      // Notificar al componente padre
      onPostCreated(data)
      
      // Cerrar modal
      onClose()

    } catch (error) {
      console.error('Error al crear post:', error)
      setError('Error al crear la publicación. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Cerrar modal
  const handleClose = () => {
    if (!loading) {
      setContent('')
      setImageFile(null)
      setImagePreview(null)
      setError(null)
      onClose()
    }
  }

  // Manejar tecla Escape
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header del Modal */}
        <div className="modal-header">
          <h2 className="modal-title">Crear Publicación</h2>
          <button 
            className="close-button" 
            onClick={handleClose}
            disabled={loading}
            aria-label="Cerrar modal"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#F5F5F5" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="post-form">
          {/* Área de texto */}
          <div className="form-group">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="¿Qué quieres compartir con la comunidad AniVerse? 🎌"
              className="content-textarea"
              rows={4}
              maxLength={500}
              disabled={loading}
              onKeyDown={handleKeyDown}
            />
            <div className="character-count">
              {content.length}/500
            </div>
          </div>

          {/* Preview de imagen */}
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Preview" />
              <button
                type="button"
                className="remove-image-button"
                onClick={() => {
                  setImageFile(null)
                  setImagePreview(null)
                }}
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#F5F5F5" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          )}

          {/* Selector de imagen */}
          <div className="form-group">
            <label htmlFor="image-upload" className="image-upload-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="#D01C1C" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21,15 16,10 5,21"/>
              </svg>
              {imageFile ? 'Cambiar imagen' : 'Agregar imagen'}
            </label>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="image-upload-input"
              disabled={loading}
            />
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="error-message">
              <svg viewBox="0 0 24 24" fill="none" stroke="#D01C1C" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              {error}
            </div>
          )}

          {/* Botones de acción */}
          <div className="form-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={loading || !content.trim()}
            >
              {loading ? (
                <>
                  <div className="loading-spinner small"></div>
                  Publicando...
                </>
              ) : (
                'Publicar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreatePostModal
