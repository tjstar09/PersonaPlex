export const themeTokens = {
  color: {
    base: "#07070d",
    surface: "rgba(255,255,255,0.04)",
    surfaceStrong: "rgba(255,255,255,0.07)",
    line: "rgba(255,255,255,0.09)",
    lineStrong: "rgba(255,255,255,0.16)",
    foreground: "#e8eaf4",
    muted: "#98a0b8",
    accent: "#8b5cf6",
    accentSoft: "rgba(139,92,246,0.16)",
    accent2: "#22d3ee",
    success: "#34d399",
    warning: "#fbbf24",
    danger: "#fb7185",
  },
  radius: {
    sm: "10px",
    md: "16px",
    lg: "22px",
    xl: "28px",
  },
  glow: {
    accent: "0 0 24px rgba(139,92,246,0.35)",
    accent2: "0 0 24px rgba(34,211,238,0.25)",
    card: "inset 0 1px 0 rgba(255,255,255,0.06)",
  },
  motion: {
    fastMs: 150,
    baseMs: 220,
    slowMs: 380,
    ease: "cubic-bezier(0.22, 1, 0.36, 1)",
  },
  typography: {
    displaySize: "1.35rem",
    bodySize: "0.9rem",
    captionSize: "0.75rem",
  },
} as const;

export type ThemeTokens = typeof themeTokens;
