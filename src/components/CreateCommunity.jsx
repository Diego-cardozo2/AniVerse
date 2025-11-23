import { useState, useEffect } from 'react'
import { supabase, aniVerseServices } from '../lib/supabaseClient'
import { router } from '../lib/router'
import './CreateCommunity.css'

const CreateCommunity = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general',
    is_private: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)

  // Obtener usuario actual
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUserId(user?.id || null)
      } catch (error) {
        console.error('Error al obtener usuario:', error)
      }
    }
    getCurrentUser()
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!currentUserId) {
      setError('Debes iniciar sesión para crear una comunidad')
      return
    }

    if (!formData.name.trim()) {
      setError('El nombre de la comunidad es requerido')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const newCommunity = await aniVerseServices.communities.create({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        is_private: formData.is_private,
        member_count: 1
      }, currentUserId)

      // Unirse automáticamente a la comunidad creada
      await aniVerseServices.communities.join(newCommunity.id, currentUserId)

      // Redirigir a la página de la comunidad (usar el formato correcto: comunidades/:id)
      router.navigate(`comunidades/${newCommunity.id}`)
    } catch (err) {
      console.error('Error al crear comunidad:', err)
      
      // Manejar errores específicos
      let errorMessage = 'Error al crear la comunidad. Por favor, intenta de nuevo.'
      
      if (err.code === '23505' || err.message?.includes('duplicate key') || err.message?.includes('unique constraint')) {
        errorMessage = 'Ya existe una comunidad con ese nombre. Por favor, elige otro nombre.'
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.navigate('communities')
  }

  return (
    <div className="create-community-container">
      <div className="create-community-header">
        <button className="back-button" onClick={handleCancel}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Volver
        </button>
        <h1 className="create-community-title">Crear Nueva Comunidad</h1>
      </div>

      <form className="create-community-form" onSubmit={handleSubmit}>
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="name" className="form-label">
            Nombre de la Comunidad <span className="required">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="form-input"
            placeholder="Ej: Fans de Naruto"
            maxLength={50}
            required
          />
          <span className="form-hint">{formData.name.length}/50 caracteres</span>
        </div>

        <div className="form-group">
          <label htmlFor="description" className="form-label">
            Descripción
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="form-textarea"
            placeholder="Describe tu comunidad..."
            rows={4}
            maxLength={500}
          />
          <span className="form-hint">{formData.description.length}/500 caracteres</span>
        </div>

        <div className="form-group">
          <label htmlFor="category" className="form-label">
            Categoría
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="form-select"
          >
            <option value="general">General</option>
            <option value="anime">Anime</option>
            <option value="manga">Manga</option>
            <option value="gaming">Gaming</option>
            <option value="art">Arte</option>
            <option value="discussion">Discusión</option>
            <option value="other">Otro</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-checkbox-label">
            <input
              type="checkbox"
              name="is_private"
              checked={formData.is_private}
              onChange={handleChange}
              className="form-checkbox"
            />
            <span>Comunidad privada (solo miembros invitados pueden unirse)</span>
          </label>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="cancel-button"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="submit-button"
            disabled={loading || !formData.name.trim()}
          >
            {loading ? 'Creando...' : 'Crear Comunidad'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateCommunity

