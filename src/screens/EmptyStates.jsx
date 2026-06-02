import { Icon } from '../components/icons.jsx';
// Shared empty-state building blocks. Editorial, grayscale, calm — an empty
// Gaid should feel intentional and inviting, never broken or "no data".

// Generic centered empty state inside a dashed card.
const EmptyState = ({ icon: Ic = Icon.Sparkles, eyebrow, title, desc, primary, secondary, children, className = '' }) => (
  <div className={`border-half border-dashed rounded-3xl bg-white/60 px-8 py-14 flex flex-col items-center text-center ${className}`}>
    <div className="h-14 w-14 rounded-2xl bg-ink-100 text-ink-700 flex items-center justify-center mb-5">
      <Ic size={24}/>
    </div>
    {eyebrow && <div className="label mb-2">{eyebrow}</div>}
    <h3 className="text-[20px] tracking-tight font-medium text-ink-900 leading-snug max-w-[420px]">{title}</h3>
    {desc && <p className="text-[13.5px] text-ink-500 mt-2.5 max-w-[440px] leading-relaxed text-pretty">{desc}</p>}
    {(primary || secondary) && (
      <div className="flex items-center gap-2.5 mt-6">
        {primary}
        {secondary}
      </div>
    )}
    {children}
  </div>
);

// Compact inline empty (for sidebars / smaller cards).
const EmptyInline = ({ icon: Ic = Icon.Sparkles, title, desc, action }) => (
  <div className="text-center py-8 px-4">
    <div className="h-11 w-11 rounded-xl bg-ink-100 text-ink-600 flex items-center justify-center mx-auto mb-3.5">
      <Ic size={18}/>
    </div>
    <div className="text-[14px] font-medium text-ink-900">{title}</div>
    {desc && <div className="text-[12px] text-ink-500 mt-1 leading-relaxed max-w-[260px] mx-auto">{desc}</div>}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);



export { EmptyState, EmptyInline };
