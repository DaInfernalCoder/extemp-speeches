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
  // Intensity 0: slow (2.5s), Intensity 10: fast (0.5s)
  const animationTime = 2.5 - (intensity * 0.2); // 2.5s to 0.5s
  
  return (
    <div 
      className={`fire ${className}`} 
      style={{ 
        width: size, 
        height: size,
        '--animation-time': `${animationTime}s`,
      } as React.CSSProperties}
    >
      <div className="flames">
        <div className="flame"></div>
        <div className="flame"></div>
        <div className="flame"></div>
        <div className="flame"></div>
      </div>
      <div className="logs"></div>
    </div>
  );
}

