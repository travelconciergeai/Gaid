// Mobile UI primitives — re-implemented for native mobile feel.
// Kept separate from web ui.jsx because the visual language is genuinely
// different (bottom sheets, tab bars, segmented scrollers, etc).

const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } = React;

// ---------- Photographs ----------
// Reuse the same picsum + pravatar pattern from web. Returns real photos in
// grayscale so the app stays editorial.
const SmartImg = ({ seed, w = 800, h = 500, tone = 'warm', label, className = '', children, eager = false }) => {
  const [failed, setFailed] = useState(false);
  if (failed || !seed) {
    return <Placeholder tone={tone} label={label} className={className}>{children}</Placeholder>;
  }
  const url = `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}?grayscale`;
  return (
    <div className={`relative overflow-hidden bg-ink-200 ${className}`}>
      <img src={url} onError={() => setFailed(true)}
           className="absolute inset-0 w-full h-full object-cover img-grayscale"
           loading={eager ? 'eager' : 'lazy'} alt={label || ''}/>
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0 pointer-events-none"/>
      {label && (
        <div className="absolute left-3 bottom-3 text-[9.5px] tracking-[0.14em] uppercase text-white font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
          {label}
        </div>
      )}
      {children}
    </div>
  );
};

const Portrait = ({ id = 1, className = '', alt = '' }) => {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={`bg-ink-200 ${className}`}/>;
  return (
    <img src={`https://i.pravatar.cc/300?img=${id}`}
         onError={() => setFailed(true)} alt={alt} loading="lazy"
         className={`object-cover img-grayscale ${className}`}/>
  );
};

const Placeholder = ({ tone = 'warm', label, className = '', children }) => {
  const toneCls = { warm:'ph-warm', cool:'ph-cool', sage:'ph-sage', coral:'ph-coral', ink:'ph-ink', paper:'ph-stripes' }[tone] || 'ph-stripes';
  return (
    <div className={`relative overflow-hidden ${toneCls} ${className}`}>
      {label && (
        <div className={`absolute left-3 bottom-3 text-[9.5px] tracking-wider uppercase ${tone === 'ink' ? 'text-white/80' : 'text-ink-700/70'}`}>
          {label}
        </div>
      )}
      {children}
    </div>
  );
};

// ---------- Tag / Chip ----------
const Tag = ({ children, tone = 'ink', className = '' }) => {
  const tones = {
    ink:   'bg-ink-100 text-ink-700 border-ink-200',
    sage:  'bg-sage-50 text-sage-700 border-sage-50',
    coral: 'bg-coral-50 text-coral-700 border-coral-50',
    gold:  'bg-gold-50 text-gold-700 border-gold-50',
    white: 'bg-white/95 text-ink-900 border-edge',
  }[tone] || 'bg-ink-100';
  return (
    <span className={`inline-flex items-center gap-1 px-2 h-5 text-[10.5px] tracking-wide rounded-full border whitespace-nowrap ${tones} ${className}`}>
      {children}
    </span>
  );
};

// ---------- Button (mobile-sized) ----------
const Button = ({ variant = 'primary', size = 'md', children, icon: IconC, iconRight: IconR, className = '', ...rest }) => {
  const base = 'inline-flex items-center justify-center gap-2 font-medium transition-all active:scale-[.97] select-none';
  const sizes = {
    sm: 'h-9 px-3 text-[13px] rounded-lg',
    md: 'h-11 px-4 text-[14px] rounded-xl',
    lg: 'h-14 px-5 text-[15px] rounded-2xl',
  }[size];
  const variants = {
    primary:   'bg-ink-900 text-paper active:bg-ink-800',
    secondary: 'bg-white border-half text-ink-900',
    ghost:     'text-ink-700 active:bg-ink-100',
    accent:    'bg-ink-900 text-paper',
  }[variant];
  return (
    <button {...rest} className={`${base} ${sizes} ${variants} ${className}`}>
      {IconC && <IconC size={size === 'sm' ? 14 : 16}/>}
      {children}
      {IconR && <IconR size={size === 'sm' ? 14 : 16}/>}
    </button>
  );
};

// ---------- Bottom tab bar (refined, floating glass pill) ----------
// Inspired by modern app docks (Threads, Apple) — a free-floating capsule with
// frosted glass background. Active item gets a subtle bg pill behind the icon
// and shows its label; inactive items show only icon for a calmer canvas.
const TabBar = ({ tab, setTab, userPortraitId = 5 }) => {
  const tabs = [
    { id: 'home',     label: 'Início',   icon: Icon.Home },
    { id: 'trips',    label: 'Viagens',  icon: Icon.Calendar },
    { id: 'reservar', label: 'Reservar', icon: Icon.Plus, isAction: true },
    { id: 'experts',  label: 'Experts',  icon: Icon.Users },
    { id: 'profile',  label: 'Perfil',   isPortrait: true },
  ];
  return (
    <div className="absolute left-0 right-0 bottom-0 z-30 pointer-events-none">
      {/* soft gradient above the bar so it sits over content without a hard line */}
      <div className="h-12 bg-gradient-to-t from-canvas/95 via-canvas/40 to-transparent"/>
      <div className="px-3 pb-[max(12px,env(safe-area-inset-bottom))] pointer-events-auto">
        <div className="relative bg-white/[0.88] backdrop-blur-2xl backdrop-saturate-150 border-half rounded-3xl px-1 py-1 flex items-center gap-0.5"
             style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.7) inset, 0 -1px 0 rgba(0,0,0,0.02) inset, 0 8px 24px -8px rgba(0,0,0,0.12), 0 2px 6px -2px rgba(0,0,0,0.06)' }}>
          {tabs.map(t => {
            const TI = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 h-14 rounded-[20px] transition-all duration-200 active:scale-95
                            ${active ? 'bg-ink-900 text-paper' : 'text-ink-700 active:bg-ink-100'}`}>
                {t.isPortrait ? (
                  <Portrait id={userPortraitId} alt="Perfil"
                    className={`h-[22px] w-[22px] rounded-full transition-all ${active ? 'ring-2 ring-paper' : 'ring-1 ring-ink-300'}`}/>
                ) : (
                  <TI size={19}/>
                )}
                {!active && (
                  <span className="text-[10px] font-medium leading-none tracking-[-0.005em]">{t.label}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ---------- Bottom sheet ----------
const BottomSheet = ({ open, onClose, title, children, footer, height = '70vh' }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-ink-900/30 fade-up" onClick={onClose}/>
      <div className="relative bg-paper rounded-t-3xl shadow-pop slide-up flex flex-col" style={{ maxHeight: height }}>
        <div className="pt-3 pb-1 flex justify-center"><div className="h-1 w-10 bg-ink-300 rounded-full"/></div>
        {title && (
          <div className="px-5 py-3 flex items-center justify-between border-b hairline">
            <div className="text-[15px] font-medium text-ink-900">{title}</div>
            <button onClick={onClose} className="p-2 -mr-2 rounded-lg active:bg-ink-100 text-ink-600"><Icon.X size={16}/></button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t hairline px-5 py-3 flex items-center gap-2 bg-canvas">{footer}</div>}
      </div>
    </div>
  );
};

// ---------- Section header ----------
const SectionHeader = ({ eyebrow, title, action }) => (
  <div className="flex items-end justify-between mb-3 px-5">
    <div>
      {eyebrow && <div className="label mb-1">{eyebrow}</div>}
      <h2 className="text-[18px] tracking-tight font-medium text-ink-900">{title}</h2>
    </div>
    {action}
  </div>
);

// ---------- Toast ----------
const ToastCtx = createContext(null);
const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((xs) => [...xs, { id, ...t }]);
    setTimeout(() => setToasts((xs) => xs.filter(x => x.id !== id)), t.duration || 2800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="absolute left-4 right-4 bottom-[90px] z-[100] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="bg-ink-900 text-paper rounded-xl px-4 py-3 shadow-pop fade-up pointer-events-auto">
            <div className="text-[13px] font-medium">{t.title}</div>
            {t.desc && <div className="text-[11.5px] text-paper/70 mt-0.5">{t.desc}</div>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};
const useToast = () => useContext(ToastCtx);

// ---------- AddToTripSheet: pick which trip to add a flight/hotel/tour to ----------
const AddToTripSheet = ({ open, onClose, item }) => {
  const toast = useToast();
  const [added, setAdded] = useState(null);
  useEffect(() => { if (open) setAdded(null); }, [open]);
  if (!open) return null;
  const addable = mockData.trips.filter(t => mockData[t.dataKey]);
  const doAdd = (t) => {
    setAdded(t.id);
    toast({ title: `Adicionado a "${t.title}"`, desc: item?.name || item?.title || '', tone: 'success' });
    setTimeout(onClose, 700);
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Adicionar a uma viagem" height="68vh">
      <div className="px-5 pt-3 pb-6">
        {item && (
          <div className="flex items-center gap-3 mb-4 pb-4 border-b hairline">
            <SmartImg seed={item.seed || item.name || item.title} tone={item.tone || 'warm'} w={160} h={160} className="h-14 w-14 rounded-xl shrink-0"/>
            <div className="min-w-0">
              <div className="text-[14px] font-medium text-ink-900 truncate">{item.name || item.title}</div>
              <div className="text-[12px] text-ink-500 mt-0.5 truncate">{item.city || item.from || ''}{item.price ? ` · ${item.price}` : ''}</div>
            </div>
          </div>
        )}
        <div className="label mb-3">Suas viagens</div>
        <div className="space-y-2">
          {addable.map(t => (
            <button key={t.id} onClick={() => doAdd(t)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-2xl border transition-colors text-left
                          ${added === t.id ? 'bg-ink-900 text-paper border-ink-900' : 'bg-white border-half active:bg-ink-50'}`}>
              <SmartImg seed={`trip-${t.id}`} tone={t.tone} w={120} h={120} className="h-12 w-12 rounded-xl shrink-0"/>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium leading-tight truncate">{t.title}</div>
                <div className={`text-[11.5px] mt-0.5 ${added === t.id ? 'text-paper/70' : 'text-ink-500'}`}>{t.dates} · {t.state}</div>
              </div>
              {added === t.id ? <Icon.Check size={17}/> : <Icon.Plus size={16} className="text-ink-500"/>}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-3 w-full h-12 rounded-2xl border-half border-dashed text-[13px] text-ink-600 active:text-ink-900 inline-flex items-center justify-center gap-1.5">
          <Icon.Plus size={14}/> Criar nova viagem
        </button>
      </div>
    </BottomSheet>
  );
};

Object.assign(window, {
  SmartImg, Portrait, Placeholder, Tag, Button,
  TabBar, BottomSheet, SectionHeader, AddToTripSheet,
  ToastCtx, ToastProvider, useToast,
});
