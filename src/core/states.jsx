import React from 'react';
import { Icon } from '../components/icons.jsx';
import { Button } from '../components/ui.jsx';
import { EmptyState } from '../screens/EmptyStates.jsx';
// ============================================================================
// Gaid Production — STATES & CAROUSEL (internal, no control bar)
// ----------------------------------------------------------------------------
// The four states every data-driven view renders, in the APPROVED visual
// language (hairline cards, striped placeholders, grayscale). Plus the
// horizontal Carousel used as the default result layout for hotels, flights,
// tours and suggested routes. There is NO visual state-toggle anywhere — the
// state comes only from the data.
// ============================================================================

// ---- Loading skeleton (shimmer block) ----
const Skeleton = ({ className = '' }) => <div className={`shimmer rounded-xl ${className}`}/>;

// A card-shaped skeleton sized like the catalog cards.
const CardSkeleton = ({ className = '' }) => (
  <div className={`bg-white border hairline rounded-2xl overflow-hidden ${className}`}>
    <Skeleton className="h-[180px] w-full rounded-none"/>
    <div className="p-5 space-y-2.5">
      <Skeleton className="h-4 w-1/2"/>
      <Skeleton className="h-3 w-2/3"/>
      <Skeleton className="h-3 w-1/3"/>
    </div>
  </div>
);

// ---- Error (approved calm tone, with retry) ----
const ErrorState = ({ title = 'Não foi possível carregar', desc = 'Tente novamente em instantes.', onRetry, className = '' }) => (
  <div className={`border-half rounded-3xl bg-white px-8 py-12 flex flex-col items-center text-center ${className}`}>
    <div className="h-14 w-14 rounded-2xl bg-ink-900 text-paper flex items-center justify-center mb-5"><Icon.Info size={24}/></div>
    <h3 className="text-[18px] tracking-tight font-medium text-ink-900">{title}</h3>
    <p className="text-[13.5px] text-ink-500 mt-2 max-w-[420px] leading-relaxed">{desc}</p>
    {onRetry && <Button variant="secondary" icon={Icon.Refresh || Icon.Sparkles} className="mt-5" onClick={onRetry}>Tentar novamente</Button>}
  </div>
);

// ---- Async switch: render the right state from a useQuery result ----
// <Async query={q} empty={<EmptyState .../>} skeleton={<Grid…/>}>{(data)=>…}</Async>
const Async = ({ query, children, empty, skeleton }) => {
  if (!query || query.status === 'loading') return skeleton || <CardSkeleton/>;
  if (query.status === 'error') return <ErrorState onRetry={query.reload}/>;
  if (query.status === 'empty') return empty || <EmptyState title="Nada por aqui ainda" desc="Quando houver dados, eles aparecem aqui."/>;
  return children(query.data);
};

// ---- Horizontal Carousel (default result layout) ----
// Children are cards; scrolls horizontally with snap + arrow controls. Matches
// the approved editorial feel: hairline, no visible scrollbar, peek of next card.
const Carousel = ({ children, className = '', itemClass = 'w-[300px]' }) => {
  const ref = React.useRef(null);
  const scroll = (dir) => {
    const el = ref.current; if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: 'smooth' });
  };
  const items = React.Children.toArray(children);
  return (
    <div className={`relative group ${className}`}>
      <div ref={ref} className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-1">
        {items.map((c, i) => (
          <div key={i} className={`shrink-0 snap-start ${itemClass}`}>{c}</div>
        ))}
      </div>
      {items.length > 2 && (
        <>
          <button onClick={() => scroll(-1)} aria-label="Anterior"
            className="absolute -left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white border hairline shadow-lift flex items-center justify-center text-ink-700 opacity-0 group-hover:opacity-100 transition-opacity">
            <Icon.ChevronLeft size={18}/>
          </button>
          <button onClick={() => scroll(1)} aria-label="Próximo"
            className="absolute -right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white border hairline shadow-lift flex items-center justify-center text-ink-700 opacity-0 group-hover:opacity-100 transition-opacity">
            <Icon.ChevronRight size={18}/>
          </button>
        </>
      )}
    </div>
  );
};

// Skeleton row for a carousel (loading state).
const CarouselSkeleton = ({ itemClass = 'w-[300px]', n = 4 }) => (
  <div className="flex gap-4 overflow-hidden pb-1">
    {Array.from({ length: n }).map((_, i) => <div key={i} className={`shrink-0 ${itemClass}`}><CardSkeleton/></div>)}
  </div>
);

// CatalogCarousel: wires a useCatalog/useQuery result to the 4 states inside a
// carousel. `render(item)` returns a card. `empty` is the approved empty state.
const CatalogCarousel = ({ query, render, empty, itemClass = 'w-[300px]', skeletonCount = 4 }) => {
  if (!query || query.status === 'loading') return <CarouselSkeleton itemClass={itemClass} n={skeletonCount}/>;
  if (query.status === 'error') return <ErrorState onRetry={query.reload}/>;
  if (query.status === 'empty') return empty || <EmptyState title="Nada por aqui ainda" desc="Aparece aqui quando houver dados."/>;
  return <Carousel itemClass={itemClass}>{query.data.map(render)}</Carousel>;
};


export { Skeleton, CardSkeleton, ErrorState, Async, Carousel, CarouselSkeleton, CatalogCarousel };
