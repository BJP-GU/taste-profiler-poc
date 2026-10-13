function Meter({ label, count, required }) {
  const pct = Math.min(100, Math.round((count / required) * 100));
  const met = count >= required;
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span>{label}</span>
        <span className="mono">
          {count}
          <span className="text-black/40"> · min {required}</span>
          {met ? " ✓" : ""}
        </span>
      </div>
      <div className="h-1 bg-black/10">
        <div className="h-1 bg-black" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function CalibrationBar({ calibration }) {
  if (!calibration) return null;

  return (
    <div className="border border-black p-4 space-y-3 bg-white">
      <div className="flex items-baseline justify-between gap-4">
        <span className="mono text-xs uppercase tracking-wide">Calibration</span>
        <span className="mono text-xs text-black/50">
          {calibration.ready
            ? "Minimum met · keep adding to sharpen your profile"
            : `${calibration.likedRemaining} liked · ${calibration.dislikedRemaining} disliked to go`}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <Meter
          label="Liked"
          count={calibration.likedCount}
          required={calibration.requiredLiked}
        />
        <Meter
          label="Disliked"
          count={calibration.dislikedCount}
          required={calibration.requiredDisliked}
        />
      </div>
    </div>
  );
}
