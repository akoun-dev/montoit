export const KentePattern = () => (
  <svg className="absolute inset-0 w-full h-full opacity-5 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="kente" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
        {/* Lignes horizontales */}
        <rect x="0" y="0" width="100" height="10" fill="hsl(30 100% 50%)" />
        <rect x="0" y="20" width="100" height="10" fill="hsl(142 76% 36%)" />
        <rect x="0" y="40" width="100" height="10" fill="hsl(45 100% 51%)" />
        
        {/* Lignes verticales */}
        <rect x="0" y="0" width="10" height="100" fill="hsl(30 100% 50%)" opacity="0.5" />
        <rect x="30" y="0" width="10" height="100" fill="hsl(142 76% 36%)" opacity="0.5" />
        <rect x="60" y="0" width="10" height="100" fill="hsl(45 100% 51%)" opacity="0.5" />
        
        {/* Motifs géométriques */}
        <circle cx="25" cy="25" r="5" fill="hsl(30 100% 50%)" />
        <circle cx="75" cy="75" r="5" fill="hsl(142 76% 36%)" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#kente)" />
  </svg>
);

export const BogolanPattern = () => (
  <svg className="absolute inset-0 w-full h-full opacity-5 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="bogolan" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
        {/* Lignes organiques */}
        <path d="M 0 20 Q 20 10, 40 20 T 80 20" stroke="hsl(30 25% 35%)" strokeWidth="2" fill="none" />
        <path d="M 0 40 Q 20 30, 40 40 T 80 40" stroke="hsl(30 25% 35%)" strokeWidth="2" fill="none" />
        <path d="M 0 60 Q 20 50, 40 60 T 80 60" stroke="hsl(30 25% 35%)" strokeWidth="2" fill="none" />
        
        {/* Points décoratifs */}
        <circle cx="10" cy="10" r="2" fill="hsl(30 25% 35%)" />
        <circle cx="30" cy="30" r="2" fill="hsl(30 25% 35%)" />
        <circle cx="50" cy="50" r="2" fill="hsl(30 25% 35%)" />
        <circle cx="70" cy="70" r="2" fill="hsl(30 25% 35%)" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#bogolan)" />
  </svg>
);

export const AkanPattern = () => (
  <svg className="absolute inset-0 w-full h-full opacity-5 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="akan" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
        {/* Spirales Akan (symbole de sagesse) */}
        <path 
          d="M 30 15 Q 35 20, 30 25 Q 25 30, 20 25 Q 15 20, 20 15 Q 25 10, 30 15" 
          stroke="hsl(45 100% 51%)" 
          strokeWidth="1.5" 
          fill="none" 
        />
        
        {/* Croix (symbole d'unité) */}
        <line x1="30" y1="35" x2="30" y2="55" stroke="hsl(142 76% 36%)" strokeWidth="2" />
        <line x1="20" y1="45" x2="40" y2="45" stroke="hsl(142 76% 36%)" strokeWidth="2" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#akan)" />
  </svg>
);

