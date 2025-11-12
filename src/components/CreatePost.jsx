import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import './CreatePost.css'

const CreatePost = ({ isOpen, onClose, onPostCreated, onSuccess, communityId }) => {
  // Estados del formulario
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Estados de usuario y validación
  const [currentUser, setCurrentUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Referencias
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)

  // Configuración de Storage
  const BUCKET_NAME = 'posts-media'
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

  // Obtener usuario actual al montar el componente
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.error('Error al obtener usuario:', error)
          setError('Error de autenticación')
          return
        }

        if (user) {
          setCurrentUser(user)
          setIsAuthenticated(true)
          
          // Verificar si el usuario existe en la tabla users
          await ensureUserExists(user)
        } else {
          setIsAuthenticated(false)
          setError('Debes estar autenticado para crear publicaciones')
        }
      } catch (error) {
        console.error('Error:', error)
        setError('Error al verificar autenticación')
      }
    }

    if (isOpen) {
      getCurrentUser()
    }
  }, [isOpen])

  // Asegurar que el usuario existe en la tabla users
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
              display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
              avatar_url: user.user_metadata?.avatar_url || null,
              bio: null
            }
          ])

        if (error) {
          console.error('Error al crear usuario:', error)
        }
      }
    } catch (error) {
      console.error('Error al verificar/crear usuario:', error)
    }
  }

  // Manejar selección de imagen
  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    
    if (!file) return

    // Validar tipo de archivo
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Solo se permiten imágenes (JPEG, PNG, WebP, GIF)')
      return
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      setError('La imagen debe ser menor a 5MB')
      return
    }

    setImageFile(file)
    setError(null)

    // Crear preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target.result)
    }
    reader.readAsDataURL(file)
  }

  // Subir imagen a Supabase Storage
  const uploadImageToStorage = async (file) => {
    try {
      setUploadProgress(0)
      
      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${currentUser.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${fileName}`

      // Simular progreso de subida
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)

      // Subir archivo
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (error) {
        throw error
      }

      // Obtener URL pública
      const { data: publicData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath)

      return publicData.publicUrl

    } catch (error) {
      console.error('Error al subir imagen:', error)
      
      // Manejar errores específicos de RLS
      if (error.message.includes('row-level security policy')) {
        throw new Error('Error de permisos: No tienes autorización para subir imágenes. Contacta al administrador.')
      } else if (error.message.includes('bucket')) {
        throw new Error('Error: El bucket de almacenamiento no está configurado correctamente.')
      } else {
        throw new Error(`Error al subir imagen: ${error.message}`)
      }
    }
  }

  // Crear publicación en la base de datos
  const createPostInDatabase = async (content, imageUrl = null) => {
    try {
      const postData = {
        user_id: currentUser.id,
        content: content.trim(),
        image_url: imageUrl,
        likes_count: 0,
        comments_count: 0
      }

      // Si hay communityId, agregarlo al post
      if (communityId) {
        postData.community_id = communityId
      }

      const { data, error } = await supabase
        .from('posts')
        .insert([postData])
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

      return data

    } catch (error) {
      console.error('Error al crear post:', error)
      throw new Error(`Error al crear publicación: ${error.message}`)
    }
  }

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!isAuthenticated) {
      setError('Debes estar autenticado para crear publicaciones')
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
    setUploadProgress(0)

    try {
      let imageUrl = null

      // Subir imagen si existe
      if (imageFile) {
        setUploadProgress(10)
        imageUrl = await uploadImageToStorage(imageFile)
      }

      // Crear post en la base de datos
      setUploadProgress(95)
      const newPost = await createPostInDatabase(content.trim(), imageUrl)
      
      setUploadProgress(100)
      setSuccess(true)

      // Limpiar formulario
      setTimeout(() => {
        setContent('')
        setImageFile(null)
        setImagePreview(null)
        setSuccess(false)
        setUploadProgress(0)
        
        // Notificar al componente padre
        if (onPostCreated) {
          onPostCreated(newPost)
        }
        if (onSuccess) {
          onSuccess()
        }
        
        // Cerrar modal
        onClose()
      }, 1000)

    } catch (error) {
      console.error('Error al crear post:', error)
      setError(error.message || 'Error al crear la publicación. Inténtalo de nuevo.')
      setUploadProgress(0)
    } finally {
      setLoading(false)
    }
  }

  // Limpiar formulario y cerrar modal
  const handleClose = () => {
    if (!loading) {
      setContent('')
      setImageFile(null)
      setImagePreview(null)
      setError(null)
      setSuccess(false)
      setUploadProgress(0)
      onClose()
    }
  }

  // Manejar tecla Escape
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleClose()
    }
  }

  // Drag and drop para imágenes
  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (ALLOWED_TYPES.includes(file.type)) {
        setImageFile(file)
        setError(null)
        
        const reader = new FileReader()
        reader.onload = (e) => {
          setImagePreview(e.target.result)
        }
        reader.readAsDataURL(file)
      } else {
        setError('Solo se permiten imágenes (JPEG, PNG, WebP, GIF)')
      }
    }
  }

  // isOpen es opcional, si no viene se asume true
  if (isOpen === false) return null

  return (
    <div className="create-post-overlay" onClick={handleClose}>
      <div className="create-post-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Header del Modal */}
        <div className="create-post-header">
          <h1 className="create-post-title">Crear Publicación</h1>
          <button 
            className="create-post-close" 
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
        <form onSubmit={handleSubmit} className="create-post-form" onKeyDown={handleKeyDown}>
          
          {/* Área de contenido */}
          <div className="form-section">
            <label htmlFor="post-content" className="form-label">
              ¿Qué quieres compartir con la comunidad AniVerse? 🎌
            </label>
            <textarea
              ref={textareaRef}
              id="post-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Comparte tus pensamientos sobre anime, manga, personajes favoritos..."
              className="post-content-textarea"
              rows={6}
              maxLength={500}
              disabled={loading}
              autoFocus
            />
            <div className="character-counter">
              <span className={`character-count ${content.length > 450 ? 'warning' : ''}`}>
                {content.length}
              </span>
              <span className="character-max">/ 500</span>
            </div>
          </div>

          {/* Área de imagen */}
          <div className="form-section">
            <label className="form-label">Imagen (opcional)</label>
            
            {imagePreview ? (
              <div className="image-preview-container">
                <img src={imagePreview} alt="Preview" className="image-preview" />
                <button
                  type="button"
                  className="remove-image-btn"
                  onClick={() => {
                    setImageFile(null)
                    setImagePreview(null)
                    setError(null)
                  }}
                  disabled={loading}
                  aria-label="Eliminar imagen"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="#F5F5F5" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div 
                className="image-upload-area"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="#D01C1C" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21,15 16,10 5,21"/>
                </svg>
                <p className="upload-text">Arrastra una imagen aquí o haz clic para seleccionar</p>
                <p className="upload-hint">JPEG, PNG, WebP, GIF (máx. 5MB)</p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden-file-input"
              disabled={loading}
            />
          </div>

          {/* Barra de progreso */}
          {loading && (
            <div className="progress-section">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="progress-text">
                {uploadProgress < 50 ? 'Preparando publicación...' :
                 uploadProgress < 90 ? 'Subiendo imagen...' :
                 uploadProgress < 100 ? 'Guardando publicación...' :
                 '¡Publicación creada!'}
              </p>
            </div>
          )}

          {/* Mensajes de estado */}
          {error && (
            <div className="status-message error">
              <svg viewBox="0 0 24 24" fill="none" stroke="#D01C1C" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="status-message success">
              <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22,4 12,14.01 9,11.01"/>
              </svg>
              <span>¡Publicación creada exitosamente!</span>
            </div>
          )}

          {/* Botones de acción */}
          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`submit-btn ${loading ? 'loading' : ''}`}
              disabled={loading || !content.trim() || content.trim().length < 3}
            >
              {loading ? (
                <>
                  <div className="btn-spinner"></div>
                  Publicando...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 19l7-7 3 3-7 7-3-3z"/>
                    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                  </svg>
                  POSTEAR
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreatePost
