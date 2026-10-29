import { useId } from "react";

/**
 * Maskot Arah Assist: map berwajah di atas ubin biru Arus, dengan kertas yang mengintip.
 * `animated` membuat matanya berkedip dan kertasnya naik-turun (dipakai di kapsul kecil Notch).
 * `bare` hanya menggambar mapnya tanpa ubin (dipakai di dalam Notch yang sudah gelap).
 * Bentuknya sama dengan src/app/icon.svg dan desktop/assets (ikon aplikasi & tray).
 */
export function Mascot({
  size = 28,
  animated = false,
  bare = false,
  className = "",
  title,
}: {
  size?: number;
  animated?: boolean;
  bare?: boolean;
  className?: string;
  title?: string;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={bare ? Math.round(size * (86 / 104)) : size}
      viewBox={bare ? "12 26 104 86" : "0 0 128 128"}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={`${animated ? "mascot-animated" : ""} ${className}`}
    >
      <defs>
        <linearGradient id={`${id}-tile`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#45bdf0" />
          <stop offset="0.5" stopColor="#007aad" />
          <stop offset="1" stopColor="#00527c" />
        </linearGradient>
        <linearGradient id={`${id}-front`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffbfc" />
          <stop offset="1" stopColor="#dfe8ef" />
        </linearGradient>
      </defs>
      {!bare && (
        <>
          <rect width="128" height="128" rx="30" fill={`url(#${id}-tile)`} />
          <rect x="10" y="6" width="108" height="40" rx="20" fill="#ffffff" opacity="0.12" />
          {/* Lembar kaca di belakang map */}
          <rect x="62" y="20" width="48" height="62" rx="10" fill="#ffffff" opacity="0.26" transform="rotate(9 86 51)" />
        </>
      )}
      {/* Punggung map */}
      <path
        d="M20 52Q20 42 30 42H49Q55 42 58 46L61 50Q63 52 67 52H95Q104 52 104 61V96Q104 106 94 106H30Q20 106 20 96Z"
        fill="#b9c7d3"
      />
      {/* Kertas di dalam map */}
      <g className="mascot-paper">
        <rect x="37" y="38" width="58" height="40" rx="6" fill="#d9e2e9" transform="rotate(-5 66 58)" />
        <rect x="31" y="44" width="62" height="40" rx="6" fill="#ffffff" />
      </g>
      {/* Sisi depan map dan wajahnya */}
      <path d="M16 68Q16 60 24 60H104Q112 60 111 68L108 98Q107 108 97 108H27Q17 108 17 98Z" fill={`url(#${id}-front)`} />
      <path d="M24 60H104Q110 60 111 64" stroke="#ffffff" strokeWidth="2" fill="none" opacity="0.9" />
      <g className="mascot-eye" style={{ transformOrigin: "50px 81px" }}>
        <ellipse cx="50" cy="81" rx="4.8" ry="6.6" fill="#0c1d32" />
        <circle cx="51.6" cy="78.4" r="1.6" fill="#ffffff" />
      </g>
      <g className="mascot-eye" style={{ transformOrigin: "78px 81px" }}>
        <ellipse cx="78" cy="81" rx="4.8" ry="6.6" fill="#0c1d32" />
        <circle cx="79.6" cy="78.4" r="1.6" fill="#ffffff" />
      </g>
      <circle cx="40" cy="91" r="4.2" fill="#45bdf0" opacity="0.35" />
      <circle cx="88" cy="91" r="4.2" fill="#45bdf0" opacity="0.35" />
      <path d="M56 92Q64 99.5 72 92" stroke="#0c1d32" strokeWidth="4.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}
