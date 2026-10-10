import React from 'react';
import brandIcon from '../../../assets/brand/generated/icon-192.png';

// Khawarizm Academy Brand Seal / Logo
export const BrandLogo: React.FC<{ size?: number; showText?: boolean; textClass?: string; onClick?: () => void }> = ({
  size = 42,
  showText = true,
  textClass = 'text-xl font-bold text-gold-400',
  onClick,
}) => {
  const [imgError, setImgError] = React.useState(false);

  return (
    <div onClick={onClick} className="art-logo-row group">
      <div
        className="art-seal flex-center"
        style={{
          width: size,
          height: size,
          background:
            'linear-gradient(135deg, var(--color-gold-400) 0%, var(--color-navy-800) 50%, var(--color-gold-600) 100%)',
          boxShadow: '0 0 14px rgba(229, 182, 92, 0.35)',
        }}
      >
        <div className="art-seal-inner">
          {!imgError ? (
            <img
              src={brandIcon}
              alt="شعار أكاديمية خوارزم"
              className="art-seal-img"
              onError={() => setImgError(true)}
            />
          ) : (
            <svg viewBox="0 0 100 100" className="art-seal-glyph" fill="none">
              {/* Outer Astrolabe Ring with Degree Ticks */}
              <circle cx="50" cy="50" r="44" stroke="#E5B65C" strokeWidth="2" strokeDasharray="3 3" opacity="0.75" className="transition-transform duration-700 group-hover:rotate-45" />
              <circle cx="50" cy="50" r="38" stroke="#29A9FF" strokeWidth="1" opacity="0.5" />
              {/* Celestial coordinate lines */}
              <path d="M 12 50 H 88" stroke="#E5B65C" strokeWidth="1.2" opacity="0.6" />
              <path d="M 50 12 V 88" stroke="#E5B65C" strokeWidth="1.2" opacity="0.6" />
              <ellipse cx="50" cy="50" rx="34" ry="18" stroke="#29A9FF" strokeWidth="1.5" opacity="0.8" transform="rotate(-25 50 50)" />
              {/* Ancient Islamic Arch Motif */}
              <path d="M 32 72 V 46 C 32 32 50 22 50 22 C 50 22 68 32 68 46 V 72 Z" stroke="#E5B65C" strokeWidth="2" fill="rgba(9, 37, 87, 0.7)" />
              {/* Central Star / Spark */}
              <polygon points="50,36 53,44 61,47 53,50 50,58 47,50 39,47 47,44" fill="#E5B65C" />
            </svg>
          )}
        </div>
      </div>
      {showText && (
        <span className={`${textClass} art-brand-text`}>
          أكاديمية خوارزم
        </span>
      )}
    </div>
  );
};

// Course Thumbnails (AI Generative, UI/UX, Python Data, AI/ML)
export const CourseThumbnail: React.FC<{ type: string }> = ({ type }) => {
  if (type === 'ai_generative' || type === 'ai_ml') {
    return (
      <div className="art-shell art-shell-deep">
        {/* Glowing Neural Network Graphic */}
        <div className="art-dotgrid" />
        <svg viewBox="0 0 300 160" className="w-full h-full opacity-90">
          <defs>
            <linearGradient id="neuralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#29A9FF" />
              <stop offset="100%" stopColor="#167BDB" />
            </linearGradient>
            <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* Connection Lines */}
          <line x1="50" y1="80" x2="110" y2="40" stroke="#167BDB" strokeWidth="1.5" opacity="0.6" />
          <line x1="50" y1="80" x2="110" y2="120" stroke="#167BDB" strokeWidth="1.5" opacity="0.6" />
          <line x1="110" y1="40" x2="180" y2="60" stroke="#29A9FF" strokeWidth="1.8" opacity="0.8" />
          <line x1="110" y1="120" x2="180" y2="100" stroke="#29A9FF" strokeWidth="1.8" opacity="0.8" />
          <line x1="180" y1="60" x2="250" y2="80" stroke="#29A9FF" strokeWidth="2" filter="url(#glowBlue)" />
          <line x1="180" y1="100" x2="250" y2="80" stroke="#29A9FF" strokeWidth="2" filter="url(#glowBlue)" />
          <line x1="110" y1="40" x2="110" y2="120" stroke="#167BDB" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
          <line x1="180" y1="60" x2="180" y2="100" stroke="#167BDB" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />

          {/* Nodes */}
          <circle cx="50" cy="80" r="6" fill="#167BDB" />
          <circle cx="110" cy="40" r="5" fill="#29A9FF" />
          <circle cx="110" cy="120" r="5" fill="#29A9FF" />
          <circle cx="180" cy="60" r="7" fill="#29A9FF" filter="url(#glowBlue)" />
          <circle cx="180" cy="100" r="7" fill="#29A9FF" filter="url(#glowBlue)" />
          <circle cx="250" cy="80" r="9" fill="#E5B65C" filter="url(#glowBlue)" className="animate-pulse" />
          <circle cx="250" cy="80" r="4" fill="#FFFFFF" />
        </svg>
        <div className="absolute bottom-2 text-center w-full">
          <span className="art-tag">
            System Health: Optimal | Active Nodes: 1,024
          </span>
        </div>
      </div>
    );
  }

  if (type === 'web_frontend') {
    return (
      <div className="art-shell art-shell-tech p-3">
        {/* Code & UI Wireframe Graphics */}
        <div className="art-code">
          <div className="art-code-head">
            <div className="art-dot art-dot-red" />
            <div className="art-dot art-dot-amber" />
            <div className="art-dot art-dot-green" />
            <span className="art-code-file">App.tsx — React 19</span>
          </div>
          <div className="art-code-body">
            <div className="text-blue-400">const [course, setCourse] = useState(AI);</div>
            <div className="text-slate-400 pl-2">&lt;<span className="text-gold-400">FrontendUI</span> layout=&quot;modern&quot;&gt;</div>
            <div className="text-slate-100 pl-4">&lt;<span className="text-blue-400">Components</span> glassmorphism /&gt;</div>
            <div className="text-slate-400 pl-2">&lt;/<span className="text-gold-400">FrontendUI</span>&gt;</div>
          </div>
          <div className="art-code-foot">
            <span className="art-tech-chip">
              Vite + Tailwind v4
            </span>
          </div>
        </div>
      </div>
    );
  }

  // python_data
  return (
    <div className="art-shell art-shell-deep p-3">
      <svg viewBox="0 0 240 120" className="w-full h-full">
        {/* Grid lines */}
        <line x1="20" y1="20" x2="220" y2="20" stroke="#1B3F80" strokeWidth="0.8" opacity="0.5" />
        <line x1="20" y1="60" x2="220" y2="60" stroke="#1B3F80" strokeWidth="0.8" opacity="0.5" />
        <line x1="20" y1="100" x2="220" y2="100" stroke="#1B3F80" strokeWidth="0.8" opacity="0.5" />
        {/* Bars */}
        <rect x="35" y="55" width="16" height="45" rx="3" fill="#167BDB" opacity="0.8" />
        <rect x="65" y="35" width="16" height="65" rx="3" fill="#29A9FF" />
        <rect x="95" y="70" width="16" height="30" rx="3" fill="#167BDB" opacity="0.8" />
        <rect x="125" y="25" width="16" height="75" rx="3" fill="#E5B65C" />
        <rect x="155" y="45" width="16" height="55" rx="3" fill="#29A9FF" />
        <rect x="185" y="30" width="16" height="70" rx="3" fill="#167BDB" />
        {/* Trend line */}
        <path d="M 43 55 L 73 35 L 103 70 L 133 25 L 163 45 L 193 30" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.9" />
      </svg>
      <div className="absolute top-2 right-2">
        <span className="art-tag-gold">
          Pandas • NumPy • PyTorch
        </span>
      </div>
    </div>
  );
};

// Scholarship Thumbnails (Astrolabe with Candle, Historic Campus, Dubai Leadership)
export const ScholarshipThumbnail: React.FC<{ type: string }> = ({ type }) => {
  if (type === 'astrolabe_scholarship') {
    return (
      <div className="art-shell art-shell-scholar">
        {/* Warm ancient knowledge mood: Candlelight & Brass Astrolabe */}
        <div className="art-candle-glow" />
        <svg viewBox="0 0 280 140" className="w-full h-full">
          {/* Candle Flame on left */}
          <g transform="translate(45, 60)">
            <rect x="-4" y="20" width="8" height="40" fill="#DCE5EE" rx="2" />
            <path d="M 0 20 Q -4 10 0 0 Q 4 10 0 20 Z" fill="#E5B65C" filter="drop-shadow(0 0 8px #C88A32)" />
            <circle cx="0" cy="10" r="2" fill="#FFFFFF" />
          </g>

          {/* Intricate Astrolabe Center */}
          <g transform="translate(170, 70)">
            {/* Outer brass ring */}
            <circle cx="0" cy="0" r="54" stroke="#E5B65C" strokeWidth="4" fill="#061A3A" opacity="0.95" />
            <circle cx="0" cy="0" r="48" stroke="#C88A32" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="40" stroke="#E5B65C" strokeWidth="1" strokeDasharray="2 3" />
            {/* Arabic Rete Pointers & Curved Ecliptic */}
            <path d="M -40 0 C -40 -30 40 -30 40 0 C 40 25 -40 25 -40 0 Z" stroke="#E5B65C" strokeWidth="1.5" fill="none" opacity="0.75" />
            <line x1="-48" y1="0" x2="48" y2="0" stroke="#C88A32" strokeWidth="1.5" />
            <line x1="0" y1="-48" x2="0" y2="48" stroke="#C88A32" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="6" fill="#E5B65C" />
            {/* Suspension Throne Loop on top */}
            <path d="M -14 -54 C -14 -64 14 -64 14 -54 Z" fill="#C88A32" stroke="#E5B65C" strokeWidth="1.5" />
            <circle cx="0" cy="-68" r="7" stroke="#E5B65C" strokeWidth="2.5" fill="none" />
          </g>
        </svg>
      </div>
    );
  }

  if (type === 'campus_night') {
    return (
      <div className="art-shell art-shell-campus">
        {/* Starry Night University Tower */}
        <div className="absolute inset-0 space-stars-bg opacity-75" />
        <svg viewBox="0 0 280 140" className="w-full h-full">
          {/* Glowing full moon/astronomical crescent */}
          <circle cx="210" cy="35" r="16" fill="#E5B65C" opacity="0.85" filter="drop-shadow(0 0 10px rgba(229,182,92,0.5))" />
          <circle cx="216" cy="32" r="14" fill="#040F24" />

          {/* Historic Campus Silhouette with Clock Tower */}
          <path d="M 0 140 L 0 105 L 50 105 L 60 90 L 80 90 L 90 105 L 120 105 L 120 50 L 135 30 L 150 50 L 150 105 L 200 105 L 215 95 L 230 105 L 280 105 L 280 140 Z" fill="#061A3A" stroke="#1B3F80" strokeWidth="1.5" />
          
          {/* Glowing Clock in tower */}
          <circle cx="135" cy="65" r="7" fill="#E5B65C" opacity="0.9" />
          <line x1="135" y1="65" x2="135" y2="61" stroke="#061A3A" strokeWidth="1.5" />
          <line x1="135" y1="65" x2="138" y2="65" stroke="#061A3A" strokeWidth="1.5" />

          {/* Illuminated windows */}
          <rect x="70" y="98" width="4" height="6" fill="#E5B65C" opacity="0.75" />
          <rect x="170" y="98" width="4" height="6" fill="#E5B65C" opacity="0.75" />
          <rect x="180" y="98" width="4" height="6" fill="#E5B65C" opacity="0.75" />
        </svg>
      </div>
    );
  }

  // leadership_dubai / cultural scholarship
  return (
    <div className="art-shell art-shell-dubai">
      <svg viewBox="0 0 280 140" className="w-full h-full">
        {/* Modern Architecture Skyline */}
        <polygon points="40,140 60,40 80,140" fill="#092557" stroke="#29A9FF" strokeWidth="1" opacity="0.8" />
        <rect x="90" y="55" width="35" height="85" fill="#061A3A" stroke="#1B3F80" strokeWidth="1" />
        <polygon points="145,140 160,25 175,140" fill="#092557" stroke="#E5B65C" strokeWidth="1.5" />
        <rect x="190" y="65" width="40" height="75" fill="#061A3A" stroke="#29A9FF" strokeWidth="1" opacity="0.7" />
        {/* Light beam */}
        <path d="M 160 25 L 120 140 L 200 140 Z" fill="rgba(229,182,92,0.1)" />
      </svg>
    </div>
  );
};

// Event Artwork (Space Technology Symposium & Data Science Stage)
export const EventArtwork: React.FC<{ type: string }> = ({ type }) => {
  if (type === 'data_science_stage') {
    return (
      <div className="art-event-bg">
        {/* High-tech amphitheater stage with blue laser curves */}
        <div className="art-event-shade" />
        <svg viewBox="0 0 600 240" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="laserGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#167BDB" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#29A9FF" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#167BDB" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {/* Curved Auditorium Rows */}
          <ellipse cx="300" cy="180" rx="280" ry="80" fill="none" stroke="#1B3F80" strokeWidth="2" opacity="0.4" />
          <ellipse cx="300" cy="195" rx="250" ry="70" fill="none" stroke="#1B3F80" strokeWidth="2" opacity="0.5" />
          <ellipse cx="300" cy="210" rx="220" ry="60" fill="none" stroke="#29A9FF" strokeWidth="3" opacity="0.8" />

          {/* Overhead Circular Canopy / Hologram */}
          <ellipse cx="300" cy="50" rx="200" ry="40" fill="none" stroke="url(#laserGrad)" strokeWidth="4" />
          <line x1="100" y1="50" x2="300" y2="180" stroke="#29A9FF" strokeWidth="0.8" opacity="0.3" />
          <line x1="500" y1="50" x2="300" y2="180" stroke="#29A9FF" strokeWidth="0.8" opacity="0.3" />
          
          {/* Stage Glow */}
          <ellipse cx="300" cy="180" rx="80" ry="25" fill="#29A9FF" opacity="0.25" className="animate-pulse" />
        </svg>
      </div>
    );
  }

  // space_astrolabe
  return (
    <div className="art-shell-space">
      <div className="absolute inset-0 space-stars-bg opacity-85" />
      <svg viewBox="0 0 600 300" className="w-full h-full opacity-95" preserveAspectRatio="xMidYMid slice">
        {/* Orbital Space Astrolabe with Rings rotating slowly */}
        <g transform="translate(300, 150)">
          {/* Planetary rings in perspective */}
          <g className="animate-orbit-slow origin-center">
            <ellipse cx="0" cy="0" rx="240" ry="90" stroke="#29A9FF" strokeWidth="2" fill="none" opacity="0.75" transform="rotate(-15)" />
            <ellipse cx="0" cy="0" rx="200" ry="70" stroke="#E5B65C" strokeWidth="2.5" fill="none" opacity="0.85" transform="rotate(-15)" />
          </g>
          <circle cx="0" cy="0" r="65" fill="#061A3A" stroke="#E5B65C" strokeWidth="3" />
          <circle cx="0" cy="0" r="50" stroke="#29A9FF" strokeWidth="1.5" strokeDasharray="4 4" />
          {/* Core glow */}
          <circle cx="0" cy="0" r="28" fill="#29A9FF" opacity="0.5" filter="blur(8px)" className="animate-pulse" />
          <circle cx="0" cy="0" r="10" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  );
};