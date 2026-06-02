import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '../components/icons.jsx';
import { Placeholder, Button, Tag, Card, Modal, Drawer, SmartImg, Portrait, useToast, Topbar, SectionHeader, Stat, TabRow, OptimizeMenu, AddToTripDrawer } from '../components/ui.jsx';
import { EmptyState, EmptyInline } from './EmptyStates.jsx';
import { Async, CardSkeleton, CatalogCarousel, Carousel, Skeleton, ErrorState, CarouselSkeleton } from '../core/states.jsx';
import { useAccount, useTrips, useCatalog, deriveTraits, profileCompletion } from '../core/store.jsx';
import { TBD, has, orTBD, fmtDuration, fmtMoney } from '../core/contracts.jsx';
// Tours / Experiences — curated. Production: results from tripApi (empty-first)
// in a horizontal carousel. No mockData; nothing fabricated.

const ToursScreen = ({ setRoute }) => {
  const [addItem, setAddItem] = useState(null);
  const q = useCatalog('tours');
  return (
    <div className="min-h-screen">
      <Topbar subtitle="Gaid · Passeios" title="Experiências curadas"
        right={<Button variant="secondary" icon={Icon.Sparkles}>Pedir personalizado</Button>}/>

      <div className="px-10 pb-12">
        <CatalogCarousel
          query={q}
          itemClass="w-[320px]"
          empty={<EmptyState icon={Icon.Ticket} eyebrow="Passeios"
            title="Nenhuma experiência para mostrar ainda"
            desc="Escolha uma cidade e a Gaid traz passeios curados por experts — aparecem aqui em carrossel."
            primary={<Button icon={Icon.Sparkles} onClick={() => setRoute('home')}>Conversar com a Gaid</Button>}/>}
          render={(t) => (
            <Card key={t.id} hover className="overflow-hidden h-full">
              <SmartImg seed={`tour-${t.id}`} tone={t.tone} label={t.city} w={600} h={400} className="h-[180px]"/>
              <div className="p-5">
                <Tag tone="brand"><Icon.Sparkles size={10}/> curado</Tag>
                <div className="text-[15.5px] font-medium text-ink-900 mt-3 leading-snug">{orTBD(t.name)}</div>
                <div className="text-[12px] text-ink-500 mt-1 flex items-center gap-2">
                  <Icon.MapPin size={11}/>{orTBD(t.city)}<span className="text-ink-300">·</span>
                  <Icon.Clock size={11}/>{fmtDuration(t.dur)}
                </div>
                {has(t.host) && (
                  <div className="mt-3 flex items-center gap-2 text-[12px] text-ink-700">
                    <Placeholder tone="warm" className="h-6 w-6 rounded-full"/> Host: {t.host}
                  </div>
                )}
                <div className="mt-4 pt-4 border-t hairline flex items-center justify-between">
                  <div className="text-[16px] font-medium text-ink-900">{fmtMoney(t.price)}</div>
                  <Button size="sm" icon={Icon.Plus} onClick={() => setAddItem(t)}>Adicionar</Button>
                </div>
              </div>
            </Card>
          )}
        />
      </div>

      <AddToTripDrawer open={!!addItem} onClose={() => setAddItem(null)} item={addItem}/>
    </div>
  );
};


export { ToursScreen };
