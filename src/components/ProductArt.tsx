import { useId } from "react";
import { LogoOnProduct } from "./Brand";
export function ProductArt({ category }: { category: string }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 320 260"
      role="img"
      aria-label={`Ilustração de ${category.toLowerCase()}`}
    >
      <defs>
        <linearGradient id={`cloth-${uid}`} x2="1" y2="1">
          <stop stopColor="#373737" />
          <stop offset="1" stopColor="#111" />
        </linearGradient>
      </defs>
      <ellipse cx="160" cy="224" rx="85" ry="10" fill="#000" opacity=".07" />
      {category === "Boné" ? (
        <g>
          <path d="M79 155c-3-96 150-116 158-6l-47 25-111-19z" fill="#222" />
          <path d="M80 151c58-11 101-8 158-2 71 41 22 59-62 36z" fill="#444" />
          <path d="M162 78v69" stroke="#666" fill="none" />
          <LogoOnProduct id={`logo-cap-${uid}`} x={130} y={90} size={45} />
        </g>
      ) : category === "Meia" ? (
        <g fill="#eee" stroke="#ccc" strokeWidth="2">
          <path d="M100 46h53v115l-15 43c-12 26-75 15-80-2-6-17 31-36 42-49z" />
          <path d="M180 47h52v111l-13 44c-11 26-73 15-78-2-6-17 29-34 39-46z" />
          <path d="M102 68h48M182 69h47" stroke="#222" strokeWidth="8" />
          <text
            x="107"
            y="124"
            fontSize="14"
            fill="#222"
            stroke="none"
            fontFamily="sans-serif"
            fontWeight="900"
          >
            ↗
          </text>
          <text
            x="187"
            y="124"
            fontSize="14"
            fill="#222"
            stroke="none"
            fontFamily="sans-serif"
            fontWeight="900"
          >
            ↗
          </text>
        </g>
      ) : (
        <g>
          <path
            d="M114 43l-50 27-25 57 44 19 15-26v98h126v-98l15 26 44-19-25-57-50-27c-21 18-73 18-94 0z"
            fill={`url(#cloth-${uid})`}
          />
          <path
            d="M132 47q28 25 58 0"
            fill="none"
            stroke="#555"
            strokeWidth="3"
          />
          <LogoOnProduct id={`logo-shirt-${uid}`} x={132} y={97} size={58} />
          <text
            x="126"
            y="141"
            fill="#bbb"
            fontSize="5"
            fontFamily="sans-serif"
            letterSpacing="1"
          >
            SEU RITMO. SUA TURMA.
          </text>
        </g>
      )}
    </svg>
  );
}
