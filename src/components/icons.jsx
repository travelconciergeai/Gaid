// Tiny Lucide-style inline SVG icons (consistent stroke, 1.6 weight)
// Used everywhere so we don't depend on lucide DOM-init quirks inside React.

const I = ({ d, size = 18, stroke = 1.6, fill = 'none', className = '', children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
       stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
       className={className} aria-hidden="true">
    {children || (d && <path d={d} />)}
  </svg>
);

export const Icon = {
  Compass: (p) => <I {...p}><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2z"/></I>,
  Sparkles: (p) => <I {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></I>,
  Send: (p) => <I {...p}><path d="m3 11 18-8-8 18-2-7-8-3z"/></I>,
  Plus: (p) => <I {...p}><path d="M12 5v14M5 12h14"/></I>,
  X: (p) => <I {...p}><path d="M18 6 6 18M6 6l12 12"/></I>,
  Check: (p) => <I {...p}><path d="m5 12 5 5 9-11"/></I>,
  ChevronRight: (p) => <I {...p}><path d="m9 6 6 6-6 6"/></I>,
  ChevronLeft: (p) => <I {...p}><path d="m15 6-6 6 6 6"/></I>,
  ChevronDown: (p) => <I {...p}><path d="m6 9 6 6 6-6"/></I>,
  ArrowRight: (p) => <I {...p}><path d="M5 12h14M13 5l7 7-7 7"/></I>,
  ArrowUpRight: (p) => <I {...p}><path d="M7 17 17 7M8 7h9v9"/></I>,
  Search: (p) => <I {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></I>,
  Home: (p) => <I {...p}><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></I>,
  Map: (p) => <I {...p}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/></I>,
  Wallet: (p) => <I {...p}><path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v2H5a2 2 0 0 0 0 4h15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="17" cy="13" r="1.2" fill="currentColor"/></I>,
  Coins: (p) => <I {...p}><ellipse cx="9" cy="8" rx="6" ry="2.5"/><path d="M3 8v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V8"/><path d="M15 12c3.3 0 6-1.1 6-2.5S18.3 7 15 7"/><path d="M21 9.5v4c0 1.4-2.7 2.5-6 2.5"/><path d="M3 12v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-1"/></I>,
  Users: (p) => <I {...p}><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M21 19c0-2.5-1.8-4.5-4.5-4.5"/></I>,
  Star: (p) => <I {...p}><path d="m12 3 2.6 5.6L20 9.4l-4 4 1 5.8L12 16.8 7 19.2l1-5.8-4-4 5.4-.8z"/></I>,
  Heart: (p) => <I {...p}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></I>,
  Plane: (p) => <I {...p}><path d="M3 14 21 8l-2 4-7 2-3 6-2-1 1-5-5-1 1-2z"/></I>,
  Bed: (p) => <I {...p}><path d="M3 18V8M3 14h18M21 18v-4a2 2 0 0 0-2-2H10v6"/><circle cx="7" cy="12" r="1.5"/></I>,
  Ticket: (p) => <I {...p}><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M13 6v12" strokeDasharray="2 2"/></I>,
  Calendar: (p) => <I {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></I>,
  Clock: (p) => <I {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></I>,
  Sun: (p) => <I {...p}><circle cx="12" cy="12" r="3.5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M5.6 18.4l1.5-1.5M16.9 7.1l1.5-1.5"/></I>,
  Sunset: (p) => <I {...p}><circle cx="12" cy="14" r="4"/><path d="M3 18h18M12 4v3M5 7l2 2M19 7l-2 2M2 14h2M20 14h2"/></I>,
  Moon: (p) => <I {...p}><path d="M20 15a8 8 0 1 1-9-11 6 6 0 0 0 9 11z"/></I>,
  MapPin: (p) => <I {...p}><path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></I>,
  Edit: (p) => <I {...p}><path d="M4 20h4l10-10-4-4L4 16zM14 6l4 4"/></I>,
  MoreH: (p) => <I {...p}><circle cx="6" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18" cy="12" r="1.2" fill="currentColor"/></I>,
  Filter: (p) => <I {...p}><path d="M3 5h18l-7 9v6l-4-2v-4z"/></I>,
  Globe: (p) => <I {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></I>,
  Share: (p) => <I {...p}><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 11l8-4M8 13l8 4"/></I>,
  Download: (p) => <I {...p}><path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></I>,
  Shield: (p) => <I {...p}><path d="M12 3 4 6v6c0 5 4 8 8 9 4-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></I>,
  Award: (p) => <I {...p}><circle cx="12" cy="9" r="5"/><path d="m8 13-2 8 6-3 6 3-2-8"/></I>,
  Bell: (p) => <I {...p}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/></I>,
  Settings: (p) => <I {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.5 7.5 0 0 0 0-3l2-1.5-2-3.5-2.4 1a7.5 7.5 0 0 0-2.6-1.5l-.4-2.5h-4l-.4 2.5a7.5 7.5 0 0 0-2.6 1.5l-2.4-1-2 3.5 2 1.5a7.5 7.5 0 0 0 0 3l-2 1.5 2 3.5 2.4-1a7.5 7.5 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.5 7.5 0 0 0 2.6-1.5l2.4 1 2-3.5z"/></I>,
  Coffee: (p) => <I {...p}><path d="M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M16 10h2a3 3 0 0 1 0 6h-2"/><path d="M6 3v2M10 3v2M14 3v2"/></I>,
  Utensils: (p) => <I {...p}><path d="M6 3v18M6 9c-2 0-3-1.5-3-3V3h6v3c0 1.5-1 3-3 3z"/><path d="M14 3v18M18 3c-1.5 1.5-2 4-2 6s1 4 2 5"/></I>,
  Image: (p) => <I {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 18 5-5 4 4 3-2 4 4"/></I>,
  Sliders: (p) => <I {...p}><path d="M4 6h12M19 6h1M4 12h2M9 12h11M4 18h11M18 18h2"/><circle cx="17" cy="6" r="1.6" fill="currentColor"/><circle cx="7" cy="12" r="1.6" fill="currentColor"/><circle cx="16" cy="18" r="1.6" fill="currentColor"/></I>,
  Wand: (p) => <I {...p}><path d="m3 21 12-12M14 3l1 3 3 1-3 1-1 3-1-3-3-1 3-1zM19 13l.7 1.7L21 15l-1.3.3L19 17l-.7-1.7L17 15l1.3-.3z"/></I>,
  Refresh: (p) => <I {...p}><path d="M20 12a8 8 0 1 1-3-6.2L20 8M20 3v5h-5"/></I>,
  Lock: (p) => <I {...p}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></I>,
  Info: (p) => <I {...p}><circle cx="12" cy="12" r="9"/><path d="M12 8v.01M11 12h1v5h1"/></I>,
  Trash: (p) => <I {...p}><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/></I>,
  Phone: (p) => <I {...p}><path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z"/></I>,
  Mail: (p) => <I {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></I>,
  Logo: (p) => (
    <svg width={p?.size || 28} height={p?.size || 28} viewBox="0 0 32 32" fill="none" className={p?.className}>
      <path d="M4 6c5 .5 9 6 12 11 3-5 7-10.5 12-11-2 12-7 19-12 21C11 25 6 18 4 6z"
            fill="currentColor"/>
    </svg>
  ),
};
