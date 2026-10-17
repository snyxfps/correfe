// A imagem é a logo fornecida pelo usuário, preservada sem redesenho.
// O enquadramento circular é feito apenas na apresentação (CSS/SVG).
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <span className={`logo-mark ${className}`}>
      <img
        src="/brand-logo.jpg"
        alt="Logo CORREFÉ: dois corredores em movimento e lettering branco"
      />
    </span>
  );
}
export function Brand() {
  return (
    <span className="brand-lockup">
      <LogoMark />
      <span className="brand-wordmark">
        CORREFÉ<small>COLETIVO DE CORRIDA</small>
      </span>
    </span>
  );
}
export function LogoOnProduct({
  id,
  x,
  y,
  size,
}: {
  id: string;
  x: number;
  y: number;
  size: number;
}) {
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <circle cx={x + size / 2} cy={y + size / 2} r={size / 2} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <svg x={x} y={y} width={size} height={size} viewBox="225 257 870 870">
          <image
            href="/brand-logo.jpg"
            x="0"
            y="0"
            width="1320"
            height="1551"
          />
        </svg>
      </g>
    </g>
  );
}
