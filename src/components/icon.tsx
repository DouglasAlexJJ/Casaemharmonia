import type { ReactNode } from "react";

type IconName =
  | "home" | "wallet" | "check" | "plus" | "trend" | "arrowUp" | "arrowDown"
  | "spark" | "chevronLeft" | "chevronRight" | "calendar" | "download" | "upload"
  | "clock" | "heart" | "filter" | "target" | "close" | "layers" | "leaf"
  | "lock" | "user" | "shield" | "info" | "copy";

const shapes: Record<IconName, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-7h6v7"/></>,
  wallet: <><rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18M16 14h.01"/><path d="M7 5V3h10v2"/></>,
  check: <><path d="m5 12 4 4L19 6"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  trend: <><path d="M3 17 9 11l4 4 8-9"/><path d="M15 6h6v6"/></>,
  arrowUp: <><path d="M12 19V5M5 12l7-7 7 7"/></>,
  arrowDown: <><path d="M12 5v14m-7-7 7 7 7-7"/></>,
  spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></>,
  chevronLeft: <><path d="m14.5 18-6-6 6-6"/></>,
  chevronRight: <><path d="m9.5 18 6-6-6-6"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M5 17v4h14v-4"/></>,
  upload: <><path d="M12 16V4m-5 5 5-5 5 5"/><path d="M5 17v4h14v-4"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  heart: <><path d="M20.8 8.6c0 5.4-8.8 10.2-8.8 10.2S3.2 14 3.2 8.6A4.6 4.6 0 0 1 12 6.1a4.6 4.6 0 0 1 8.8 2.5Z"/></>,
  filter: <><path d="M4 6h16M7 12h10m-7 6h4"/></>,
  target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
  leaf: <><path d="M20 4c-8 0-14 3-14 10a6 6 0 0 0 6 6c7 0 10-6 8-16Z"/><path d="M5 21c3-5 6-8 11-11"/></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
  shield: <><path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z"/><path d="m9 12 2 2 4-4"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
};

export default function Icon({
  name,
  size = 18,
  strokeWidth = 1.8,
  className,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {shapes[name]}
    </svg>
  );
}
