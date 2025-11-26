import './Logo.css'

const Logo = ({ className = '' }) => {
  return (
    <div className={`aniverse-logo ${className}`}>
      <svg 
        viewBox="0 0 280 70" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="logo-svg"
      >
        <defs>
          {/* Gradiente para los anillos metálicos */}
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a0a0a0" stopOpacity="1" />
            <stop offset="50%" stopColor="#d0d0d0" stopOpacity="1" />
            <stop offset="100%" stopColor="#808080" stopOpacity="1" />
          </linearGradient>
          {/* Sombra para el círculo central */}
          <filter id="circleShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.5"/>
          </filter>
        </defs>
        
        {/* Elemento gráfico - lado izquierdo */}
        <g className="logo-graphic">
          {/* Círculo central oscuro - más grande */}
          <circle cx="35" cy="35" r="16" fill="#1a1a1a" className="logo-circle" filter="url(#circleShadow)"/>
          
          {/* Marca V roja en el círculo (apuntando hacia abajo) */}
          <path 
            d="M 35 44 L 30 49 L 40 49 Z" 
            fill="#D01C1C" 
            className="logo-v-mark"
          />
          
          {/* Anillos orbitales gruesos y metálicos que se cruzan formando X */}
          <ellipse 
            cx="35" 
            cy="35" 
            rx="24" 
            ry="8" 
            fill="none" 
            stroke="url(#ringGradient)" 
            strokeWidth="4"
            className="logo-ring"
            opacity="0.95"
          />
          <ellipse 
            cx="35" 
            cy="35" 
            rx="24" 
            ry="8" 
            fill="none" 
            stroke="url(#ringGradient)" 
            strokeWidth="4"
            transform="rotate(90 35 35)"
            className="logo-ring"
            opacity="0.95"
          />
          
          {/* Estrellas rojas de cuatro puntas - mejor posicionadas */}
          <g className="logo-stars">
            {/* Estrella izquierda arriba */}
            <path 
              d="M 12 20 L 13.5 25 L 18.5 25 L 14.5 28 L 16 33 L 12 30.5 L 8 33 L 9.5 28 L 5.5 25 L 10.5 25 Z" 
              fill="#D01C1C"
            />
            {/* Estrella izquierda abajo */}
            <path 
              d="M 12 50 L 13.5 55 L 18.5 55 L 14.5 58 L 16 63 L 12 60.5 L 8 63 L 9.5 58 L 5.5 55 L 10.5 55 Z" 
              fill="#D01C1C"
            />
            {/* Estrella derecha arriba */}
            <path 
              d="M 58 20 L 59.5 25 L 64.5 25 L 60.5 28 L 62 33 L 58 30.5 L 54 33 L 55.5 28 L 51.5 25 L 56.5 25 Z" 
              fill="#D01C1C"
            />
            {/* Estrella derecha abajo */}
            <path 
              d="M 58 50 L 59.5 55 L 64.5 55 L 60.5 58 L 62 63 L 58 60.5 L 54 63 L 55.5 58 L 51.5 55 L 56.5 55 Z" 
              fill="#D01C1C"
            />
          </g>
        </g>
        
        {/* Texto - lado derecho */}
        <g className="logo-text">
          <text 
            x="75" 
            y="43" 
            className="logo-text-ani"
            fontSize="32"
            fontWeight="800"
            fontFamily="'Nunito Sans', 'Segoe UI', 'Roboto', sans-serif"
            letterSpacing="-0.02em"
          >
            Ani
          </text>
          <text 
            x="110" 
            y="43" 
            className="logo-text-verse"
            fontSize="32"
            fontWeight="800"
            fontFamily="'Nunito Sans', 'Segoe UI', 'Roboto', sans-serif"
            letterSpacing="-0.02em"
          >
            Verse
          </text>
        </g>
      </svg>
    </div>
  )
}

export default Logo

