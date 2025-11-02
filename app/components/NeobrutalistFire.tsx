'use client';

export default function NeobrutalistFire({ 
  size = 48, 
  className = '',
  intensity = 0 
}: { 
  size?: number; 
  className?: string;
  intensity?: number; // 0-10, where 0 is minimal flicker, 10 is intense
}) {
  // Calculate animation duration based on intensity (higher intensity = faster/fiercer)
  // Intensity 0: slow and subtle (3s), Intensity 10: fast and intense (0.5s)
  const animationSpeed = 3 - (intensity * 0.25); // 3s to 0.5s
  const sparkSpeed = 2.5 - (intensity * 0.2); // 2.5s to 0.5s
  
  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="neobrutalist-fire"
        style={{
          animationDuration: `${animationSpeed}s`,
          '--flame-main-duration': `${animationSpeed * 0.75}s`,
          '--flame-inner-duration': `${animationSpeed * 0.6}s`,
          '--spark-duration': `${sparkSpeed}s`,
        } as React.CSSProperties}
      >
        {/* Main orange flame - clean teardrop shape */}
        <path
          d="M32 56 C24 56, 18 52, 18 46 C18 42, 20 36, 22 30 C24 24, 26 18, 28 14 C29 12, 30 10, 32 10 C34 10, 35 12, 36 14 C38 18, 40 24, 42 30 C44 36, 46 42, 46 46 C46 52, 40 56, 32 56 Z"
          fill="#FF6B35"
          stroke="#000000"
          strokeWidth="3"
          className="flame-main"
        />
        
        {/* Inner yellow flame - smaller teardrop */}
        <path
          d="M32 52 C26 52, 22 49, 22 44 C22 41, 23 37, 24 33 C25 29, 26 25, 27 21 C28 19, 29 17, 32 17 C35 17, 36 19, 37 21 C38 25, 39 29, 40 33 C41 37, 42 41, 42 44 C42 49, 38 52, 32 52 Z"
          fill="#FFD233"
          stroke="#000000"
          strokeWidth="2.5"
          className="flame-inner"
        />
        
        {/* Floating rounded square spark */}
        <rect
          x="20"
          y="12"
          width="8"
          height="8"
          rx="2"
          fill="#FFD233"
          stroke="#000000"
          strokeWidth="2"
          className="spark-square"
        />
        
        {/* Floating circle spark */}
        <circle
          cx="44"
          cy="14"
          r="4"
          fill="#FFD233"
          stroke="#000000"
          strokeWidth="2"
          className="spark-circle"
        />
      </svg>
    </div>
  );
}

