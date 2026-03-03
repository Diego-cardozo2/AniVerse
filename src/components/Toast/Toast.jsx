import { useEffect } from 'react'
import './Toast.css'

const Toast = ({ show, message = 'Comunidad creada correctamente', duration = 7000, onClose }) => {
  useEffect(() => {
    if (!show || !onClose) return
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [show, duration, onClose])

  if (!show) return null

  return (
    <div className="toast" role="status" aria-live="polite">
      <div className="toast-content">
        <span className="toast-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </span>
        <span className="toast-message">{message}</span>
      </div>
      <div
        className="toast-progress"
        style={{ animationDuration: `${duration}ms` }}
        aria-hidden="true"
      />
    </div>
  )
}

export default Toast
