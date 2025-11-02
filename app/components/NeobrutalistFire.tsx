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
    <div 
      className={`relative inline-block ${className}`} 
      style={{ 
        width: size, 
        height: size,
        '--fire-duration': `${animationSpeed}s`,
        '--spark-duration': `${sparkSpeed}s`,
      } as React.CSSProperties}
    >
      <div className="neobrutalist-fire-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }}>
        {/* Back layer - largest orange */}
        <div 
          className="flame-layer flame-back"
          style={{
            position: 'absolute',
            bottom: '4%',
            left: '0%',
            width: '100%',
            height: '100%',
          }}
        />
        
        {/* Medium layer - medium orange */}
        <div 
          className="flame-layer flame-medium"
          style={{
            position: 'absolute',
            bottom: '5%',
            left: '10%',
            width: '80%',
            height: '80%',
          }}
        />
        
        {/* Front layer - yellow */}
        <div 
          className="flame-layer flame-front"
          style={{
            position: 'absolute',
            bottom: '10%',
            left: '20%',
            width: '60%',
            height: '60%',
          }}
        />
        
        {/* Floating rounded square spark */}
        <div 
          className="spark-square"
          style={{
            position: 'absolute',
            top: '15%',
            left: '20%',
            width: '12%',
            height: '12%',
          }}
        />
        
        {/* Floating circle spark */}
        <div 
          className="spark-circle"
          style={{
            position: 'absolute',
            top: '12%',
            right: '25%',
            width: '8%',
            height: '8%',
          }}
        />
      </div>
    </div>
  );
}

