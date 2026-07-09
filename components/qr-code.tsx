"use client";

/**
 * QR code décoratif déterministe pour la démo.
 * En production, utiliser un vrai encodeur QR signé côté serveur
 * (signature numérique + expiration — cahier des charges §15.1, §35.4).
 */

function hash(str: string, index: number): boolean {
  let h = 2166136261 ^ index;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100 < 46;
}

export function QrCode({ value, size = 180 }: { value: string; size?: number }) {
  const modules = 21;
  const cell = size / modules;
  const cells: { x: number; y: number }[] = [];

  const inFinder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= modules - 7 && y < 7) || (x < 7 && y >= modules - 7);

  for (let y = 0; y < modules; y += 1) {
    for (let x = 0; x < modules; x += 1) {
      if (!inFinder(x, y) && hash(value, y * modules + x)) {
        cells.push({ x, y });
      }
    }
  }

  const finder = (fx: number, fy: number) => (
    <g key={`${fx}-${fy}`}>
      <rect x={fx * cell} y={fy * cell} width={cell * 7} height={cell * 7} rx={cell} fill="currentColor" />
      <rect x={(fx + 1) * cell} y={(fy + 1) * cell} width={cell * 5} height={cell * 5} rx={cell * 0.8} fill="var(--qr-bg, white)" />
      <rect x={(fx + 2) * cell} y={(fy + 2) * cell} width={cell * 3} height={cell * 3} rx={cell * 0.6} fill="currentColor" />
    </g>
  );

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label="QR code"
      className="text-ink-900 [--qr-bg:white] dark:text-ink-100 dark:[--qr-bg:#0f172a]"
    >
      <rect width={size} height={size} fill="var(--qr-bg, white)" rx={12} />
      {finder(0, 0)}
      {finder(modules - 7, 0)}
      {finder(0, modules - 7)}
      {cells.map(({ x, y }) => (
        <rect
          key={`${x}-${y}`}
          x={x * cell + cell * 0.1}
          y={y * cell + cell * 0.1}
          width={cell * 0.8}
          height={cell * 0.8}
          rx={cell * 0.2}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
