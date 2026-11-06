export default function BlueprintWatermark() {
  return (
    <div className="blueprint-watermark" aria-hidden="true">
      <svg
        viewBox="0 0 1000 1000"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        stroke="currentColor"
        strokeWidth="0.8"
        className="text-cyan-400"
      >
        {/* Concentric Calibration Rings */}
        <circle cx="500" cy="500" r="100" strokeDasharray="3 3" />
        <circle cx="500" cy="500" r="220" />
        <circle cx="500" cy="500" r="340" strokeDasharray="8 4" />
        <circle cx="500" cy="500" r="460" />

        {/* Crosshairs & Compass Ticks */}
        <line x1="500" y1="20" x2="500" y2="980" strokeDasharray="4 4" />
        <line x1="20" y1="500" x2="980" y2="500" strokeDasharray="4 4" />
        <line x1="160" y1="160" x2="840" y2="840" strokeDasharray="2 6" />
        <line x1="840" y1="160" x2="160" y2="840" strokeDasharray="2 6" />

        {/* Corner Calibration Grids */}
        <rect x="240" y="240" width="520" height="520" strokeDasharray="4 4" />
        <rect x="360" y="360" width="280" height="280" />

        {/* Technical Coordinate Reticles */}
        <circle cx="500" cy="500" r="14" fill="currentColor" fillOpacity="0.2" />
        <path d="M 480 500 L 520 500 M 500 480 L 500 520" />
      </svg>
    </div>
  );
}
