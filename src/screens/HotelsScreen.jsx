import React, { useState, useCallback } from 'react';
import { Icon } from '../components/icons.jsx';
import { Button, Tag, Card, Modal, SmartImg, Topbar, AddToTripDrawer } from '../components/ui.jsx';
import { EmptyState } from './EmptyStates.jsx';
import { CatalogCarousel } from '../core/states.jsx';
import { useCatalog } from '../core/store.jsx';
import { has, orTBD, fmtMoney } from '../core/contracts.jsx';

function defaultDates() {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 30);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 3);
  return {
    checkIn: checkIn.toISOString().slice(0, 10),
    checkOut: checkOut.toISOString().slice(0, 10),
  };
}

const HotelsScreen = ({ setRoute }) => {
  const dates = defaultDates();
  const [city, setCity] = useState('');
  const [checkIn, setCheckIn] = useState(dates.checkIn);
  const [checkOut, setCheckOut] = useState(dates.checkOut);
  const [searchParams, setSearchParams] = useState(null);
  const [open, setOpen] = useState(null);
  const [addItem, setAddItem] = useState(null);

  const q = useCatalog('hotels', searchParams);

  const handleSearch = useCallback(() => {
    if (!city.trim()) return;
    setSearchParams({ city: city.trim(), checkIn, checkOut, adults: 2 });
  }, [city, checkIn, checkOut]);

  return (
    <div className="min-h-screen">
      <Topbar subtitle="Voia · Hotéis" title="Hotéis em tempo real"
        right={<><Button variant="ghost" icon={Icon.Filter}>Filtros</Button>
                  <Button variant="secondary" icon={Icon.MapPin}>Mapa</Button></>}/>

      <div className="px-10 pb-4">
        <Card className="p-2 mb-6">
          <div className="grid grid-cols-[2fr_1fr_1fr_auto] divide-x hairline">
            <SearchCell label="Destino" value={city} onChange={setCity} placeholder="Paris, Orlando, Lisboa…"/>
            <SearchCell label="Check-in" value={checkIn} onChange={setCheckIn} type="date"/>
            <SearchCell label="Check-out" value={checkOut} onChange={setCheckOut} type="date"/>
            <div className="flex items-center pl-2 pr-1">
              <Button icon={Icon.Search} onClick={handleSearch} disabled={!city.trim()}>Buscar</Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="px-10 pb-12">
        <CatalogCarousel
          query={q}
          itemClass="w-[320px]"
          empty={!searchParams
            ? <EmptyState icon={Icon.Bed} eyebrow="Hotéis"
                title="Busque hotéis reais"
                desc="Defina destino e datas — a Voia busca opções com preços reais via Amadeus."
                primary={<Button icon={Icon.Sparkles} onClick={() => setRoute('home')}>Conversar com a Voia</Button>}/>
            : <EmptyState icon={Icon.Bed} eyebrow="Hotéis"
                title="Nenhum hotel encontrado"
                desc="Tente outras datas ou destino. A Voia também pode ajudar pelo chat."
                primary={<Button icon={Icon.Sparkles} onClick={() => setRoute('home')}>Conversar com a Voia</Button>}/>}
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
            <div className="grid grid-cols-4 gap-3">
              <Mini3 label="Avaliação" value={has(open.rating) ? `${open.rating} ★` : '—'} tone="sage"/>
              <Mini3 label="Noites" value={orTBD(open.nights)}/>
              <Mini3 label="Total" value={fmtMoney(open.price)}/>
              <Mini3 label="Cancelamento" value="Consultar" tone="sage"/>
            </div>
          </div>
        )}
      </Modal>

      <AddToTripDrawer open={!!addItem} onClose={() => setAddItem(null)} item={addItem}/>
    </div>
  );
};

const SearchCell = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <label className="px-4 py-2.5 text-left hover:bg-ink-50 transition-colors cursor-text block">
    <div className="label mb-0.5">{label}</div>
    <input
      type={type}
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      className="w-full text-[13.5px] text-ink-900 font-medium bg-transparent outline-none placeholder:text-ink-400"
    />
  </label>
);

const Mini3 = ({ label, value, tone }) => (
  <div className="bg-ink-50 rounded-xl p-3">
    <div className="label">{label}</div>
    <div className={`text-[14px] font-medium mt-0.5 ${tone==='sage'?'text-sage-700':'text-ink-900'}`}>{value}</div>
  </div>
);

export { HotelsScreen };
