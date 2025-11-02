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
        {/* Main orange flame - teardrop shape */}
        <path
          d="M32 56 Q24 56, 20 52 Q16 48, 16 44 Q16 40, 18 36 Q20 32, 22 28 Q24 24, 26 20 Q28 16, 30 14 Q31 12, 32 12 Q33 12, 34 14 Q36 16, 38 20 Q40 24, 42 28 Q44 32, 46 36 Q48 40, 48 44 Q48 48, 44 52 Q40 56, 32 56 Z"
          fill="#FF6B35"
          stroke="#000000"
          strokeWidth="3"
          className="flame-main"
        />
        
        {/* Inner yellow flame - smaller teardrop */}
        <path
          d="M32 52 Q28 52, 25 49 Q22 46, 22 43 Q22 40, 23 37 Q24 34, 25 31 Q26 28, 27 25 Q28 22, 29 20 Q30 18, 32 18 Q34 18, 35 20 Q36 22, 37 25 Q38 28, 39 31 Q40 34, 41 37 Q42 40, 42 43 Q42 46, 39 49 Q36 52, 32 52 Z"
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

