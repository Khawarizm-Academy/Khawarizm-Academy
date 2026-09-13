import React from 'react';
import brandIcon from '../../../assets/brand/generated/icon-192.png';

// Khawarizm Academy Brand Seal / Logo
export const BrandLogo: React.FC<{ size?: number; showText?: boolean; textClass?: string; onClick?: () => void }> = ({
  size = 42,
  showText = true,
  textClass = 'text-xl font-bold text-[#E5B65C]',
  onClick,
}) => {
  const [imgError, setImgError] = React.useState(false);

  return (
    <div onClick={onClick} className="inline-flex items-center gap-3 select-none group cursor-pointer">
      <div
        className="relative flex-center rounded-full p-0.5 transition-transform duration-300 group-hover:scale-105"
        style={{
          width: size,
          height: size,
          background: 'linear-gradient(135deg, #E5B65C 0%, #092557 50%, #C88A32 100%)',
          boxShadow: '0 0 14px rgba(229, 182, 92, 0.35)',
        }}
      >
        <div className="w-full h-full rounded-full bg-[#061A3A] flex-center relative overflow-hidden border border-[#E5B65C]/40">
          {!imgError ? (
            <img
              src={brandIcon}
              alt="شعار أكاديمية خوارزم"
              className="w-full h-full object-cover rounded-full"
              onError={() => setImgError(true)}
            />
          ) : (
            <svg viewBox="0 0 100 100" className="w-[85%] h-[85%]" fill="none">
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
        <span className={`${textClass} font-['IBM_Plex_Sans_Arabic'] tracking-tight transition-colors duration-300 group-hover:text-white`}>
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
      <div className="w-full h-full relative overflow-hidden bg-gradient-to-b from-[#061A3A] to-[#040F24] flex-center group-hover:scale-105 transition-transform duration-500 ease-out">
        {/* Glowing Neural Network Graphic */}
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#29A9FF_1px,transparent_1px)] [background-size:16px_16px]" />
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
          <span className="text-[10px] text-[#8299B5] font-mono tracking-widest uppercase bg-[#061A3A]/85 px-2 py-0.5 rounded border border-[#1B3F80]">
            System Health: Optimal | Active Nodes: 1,024
          </span>
        </div>
      </div>
    );
  }

  if (type === 'web_frontend') {
    return (
      <div className="w-full h-full relative overflow-hidden bg-gradient-to-b from-[#092557] to-[#040F24] flex-center p-3 group-hover:scale-105 transition-transform duration-500 ease-out">
        {/* Code & UI Wireframe Graphics */}
        <div className="w-full h-full rounded border border-[#1B3F80] bg-[#061A3A]/85 p-2 font-mono text-left flex flex-col justify-between">
          <div className="flex items-center gap-1 mb-1 border-b border-[#1B3F80]/60 pb-1">
            <div className="w-2 h-2 rounded-full bg-[#D9534F]" />
            <div className="w-2 h-2 rounded-full bg-[#E0A23B]" />
            <div className="w-2 h-2 rounded-full bg-[#3FAE6B]" />
            <span className="text-[9px] text-[#8299B5] ml-2">App.tsx — React 19</span>
          </div>
          <div className="space-y-1 text-[10px] opacity-90">
            <div className="text-[#29A9FF]">const [course, setCourse] = useState(AI);</div>
            <div className="text-[#8299B5] pl-2">&lt;<span className="text-[#E5B65C]">FrontendUI</span> layout=&quot;modern&quot;&gt;</div>
            <div className="text-[#DCE5EE] pl-4">&lt;<span className="text-[#29A9FF]">Components</span> glassmorphism /&gt;</div>
            <div className="text-[#8299B5] pl-2">&lt;/<span className="text-[#E5B65C]">FrontendUI</span>&gt;</div>
          </div>
          <div className="flex justify-end gap-1 mt-1">
            <span className="text-[9px] bg-[#167BDB]/20 text-[#29A9FF] px-1.5 py-0.5 rounded border border-[#167BDB]/40">
              Vite + Tailwind v4
            </span>
          </div>
        </div>
      </div>
    );
  }

  // python_data
  return (
    <div className="w-full h-full relative overflow-hidden bg-gradient-to-b from-[#061A3A] to-[#040F24] flex-center p-3 group-hover:scale-105 transition-transform duration-500 ease-out">
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
        <span className="text-[10px] text-[#E5B65C] bg-[#040F24]/85 px-2 py-0.5 rounded border border-[#E5B65C]/30 font-mono">
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
      <div className="w-full h-full relative overflow-hidden bg-gradient-to-tr from-[#061A3A] via-[#092557] to-[#123168] flex-center group-hover:scale-105 transition-transform duration-500 ease-out">
        {/* Warm ancient knowledge mood: Candlelight & Brass Astrolabe */}
        <div className="absolute -left-4 -bottom-4 w-32 h-32 rounded-full bg-[#E5B65C]/20 blur-xl pointer-events-none animate-pulse" />
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
      <div className="w-full h-full relative overflow-hidden bg-gradient-to-b from-[#040F24] to-[#092557] flex-center group-hover:scale-105 transition-transform duration-500 ease-out">
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
    <div className="w-full h-full relative overflow-hidden bg-gradient-to-tr from-[#061A3A] to-[#123168] flex-center group-hover:scale-105 transition-transform duration-500 ease-out">
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
      <div className="w-full h-full relative overflow-hidden bg-[#040F24]">
        {/* High-tech amphitheater stage with blue laser curves */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#040F24] via-transparent to-transparent z-10" />
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
    <div className="w-full h-full relative overflow-hidden bg-gradient-to-r from-[#040F24] via-[#061A3A] to-[#092557]">
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
