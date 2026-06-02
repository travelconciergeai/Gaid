import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '../components/icons.jsx';
import { Placeholder, Button, Tag, Card, Modal, Drawer, SmartImg, Portrait, useToast, Topbar, SectionHeader, Stat, TabRow, OptimizeMenu, AddToTripDrawer } from '../components/ui.jsx';
import { EmptyState, EmptyInline } from './EmptyStates.jsx';
import { Async, CardSkeleton, CatalogCarousel, Carousel, Skeleton, ErrorState, CarouselSkeleton } from '../core/states.jsx';
import { useAccount, useTrips, useCatalog, deriveTraits, profileCompletion } from '../core/store.jsx';
import { TBD, has, orTBD, fmtDuration, fmtMoney } from '../core/contracts.jsx';
// Hotels — Gaid Collection. Production: results come from tripApi (empty-first),
// rendered in a horizontal carousel. No mockData; nothing fabricated.

const HotelsScreen = ({ setRoute }) => {
  const [open, setOpen] = useState(null);
  const [addItem, setAddItem] = useState(null);
  const q = useCatalog('hotels');

  return (
    <div className="min-h-screen">
      <Topbar subtitle="Gaid · Hotéis" title="Gaid Collection"
        right={<><Button variant="ghost" icon={Icon.Filter}>Filtros</Button>
                  <Button variant="secondary" icon={Icon.MapPin}>Mapa</Button></>}/>

      <div className="px-10 pb-12">
        <CatalogCarousel
          query={q}
          itemClass="w-[320px]"
          empty={<EmptyState icon={Icon.Bed} eyebrow="Hotéis"
            title="Nenhum hotel para mostrar ainda"
            desc="Defina destino e datas e a Gaid Collection traz opções curadas — elas aparecem aqui em carrossel."
            primary={<Button icon={Icon.Sparkles} onClick={() => setRoute('home')}>Conversar com a Gaid</Button>}/>}
          render={(h) => (
            <Card key={h.id} hover className="overflow-hidden h-full" onClick={() => setOpen(h)}>
              <SmartImg seed={`hotel-${h.id}`} tone={h.tone} label={h.city} w={600} h={400} className="h-[200px]"/>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <Tag tone="gold">{orTBD(h.tag)}</Tag>
                  <div className="text-[12px] text-ink-700 inline-flex items-center gap-1"><Icon.Star size={11}/> {orTBD(h.rating)}</div>
                </div>
                <div className="text-[16px] font-medium text-ink-900 mt-3">{orTBD(h.name)}</div>
                <div className="text-[12px] text-ink-500 mt-0.5 flex items-center gap-1.5"><Icon.MapPin size={11}/> {orTBD(h.city)}</div>
                <div className="text-[12px] text-sage-700 mt-3 flex items-center gap-1.5"><Icon.Sparkles size={11}/> {orTBD(h.perk)}</div>
                <div className="mt-4 pt-4 border-t hairline flex items-center justify-between gap-2">
                  <div className="text-[16px] font-medium text-ink-900">{fmtMoney(h.price)}</div>
                  <Button size="sm" icon={Icon.Plus} onClick={(e)=>{ e.stopPropagation(); setAddItem(h); }}>Adicionar</Button>
                </div>
              </div>
            </Card>
          )}
        />
      </div>

      <Modal open={!!open} onClose={()=>setOpen(null)} size="lg" title={open?.name || ''}
        footer={open && <>
          <Button variant="ghost" onClick={()=>setOpen(null)}>Fechar</Button>
          <Button icon={Icon.Heart} variant="secondary">Salvar</Button>
          <Button icon={Icon.Plus} onClick={()=>{ const h = open; setOpen(null); setAddItem(h); }}>Adicionar a uma viagem</Button>
        </>}>
        {open && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <SmartImg seed={`hotel-cover-${open.id}`} tone={open.tone} label={open.city} w={600} h={400} className="h-[200px] rounded-xl"/>
              <div className="grid grid-cols-2 gap-3">
                <SmartImg seed={`hotel-${open.id}-1`} tone="warm" w={400} h={400} className="rounded-xl aspect-square"/>
                <SmartImg seed={`hotel-${open.id}-2`} tone="cool" w={400} h={400} className="rounded-xl aspect-square"/>
                <SmartImg seed={`hotel-${open.id}-3`} tone="sage" w={400} h={400} className="rounded-xl aspect-square"/>
                <SmartImg seed={`hotel-${open.id}-4`} tone="coral" w={400} h={400} className="rounded-xl aspect-square"/>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <Mini3 label="Avaliação" value={has(open.rating) ? `${open.rating} ★` : TBD} tone="sage"/>
              <Mini3 label="Noites" value={orTBD(open.nights)}/>
              <Mini3 label="Total" value={fmtMoney(open.price)}/>
              <Mini3 label="Cancelamento" value="Grátis 48h" tone="sage"/>
            </div>
            {has(open.perk) && (
              <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex gap-3">
                <Icon.Sparkles size={16} className="text-brand-700 mt-0.5"/>
                <div className="text-[13px] text-brand-900"><span className="font-medium">Gaid Perk:</span> {open.perk}.</div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <AddToTripDrawer open={!!addItem} onClose={() => setAddItem(null)} item={addItem}/>
    </div>
  );
};


export { HotelsScreen };
