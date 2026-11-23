// Ikon kubah/mihrab emas (SVG inline, tanpa aset eksternal).
export default function DomeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 56" fill="none" aria-hidden="true">
      {/* kubah */}
      <path
        d="M24 2 C31 9 36 13 36 21 L36 24 L12 24 L12 21 C12 13 17 9 24 2 Z"
        fill="currentColor"
        opacity="0.9"
      />
      <rect x="22.6" y="0" width="2.8" height="5" rx="1.4" fill="currentColor" />
      {/* badan mihrab */}
      <path
        d="M24 26 C30 31 33 34.5 33 40 L33 54 L15 54 L15 40 C15 34.5 18 31 24 26 Z"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path d="M24 34 C27 37 28.5 39 28.5 42.5 L28.5 50 L19.5 50 L19.5 42.5 C19.5 39 21 37 24 34 Z" fill="currentColor" opacity="0.35" />
      {/* dasar */}
      <rect x="10" y="54" width="28" height="2" rx="1" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

// Siluet lengkung mihrab besar untuk kartu utama tengah.
export function MihrabArch({ className }) {
  return (
    <svg className={className} viewBox="0 0 200 220" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMax meet">
      <path
        d="M100 8 C130 34 158 58 158 104 L158 212 L42 212 L42 104 C42 58 70 34 100 8 Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M100 34 C122 54 142 74 142 106 L142 212 L58 212 L58 106 C58 74 78 54 100 34 Z"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.6"
      />
      <path
        d="M100 62 C114 76 126 90 126 112 L126 212 L74 212 L74 112 C74 90 86 76 100 62 Z"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.35"
      />
    </svg>
  );
}

// Ikon QR redup untuk empty state QRIS.
export function QrIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm3 1h1v1H8V6zM4 4h1v1H4V4zM13 3h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm11-2h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2zm-8 4h2v2H8v-2zm8 0h4v4h-2v-2h-2v-2z" />
    </svg>
  );
}
