import React, { useState, useCallback } from 'react';
import { Icon } from '../components/icons.jsx';
import { Button, Tag, Card, SmartImg, Topbar, AddToTripDrawer } from '../components/ui.jsx';
import { EmptyState } from './EmptyStates.jsx';
import { CatalogCarousel } from '../core/states.jsx';
import { useCatalog } from '../core/store.jsx';
import { has, orTBD, fmtDuration, fmtMoney } from '../core/contracts.jsx';

const ToursScreen = ({ setRoute }) => {
  const [city, setCity] = useState('');
  const [query, setQuery] = useState('passeios e experiências');
  const [searchParams, setSearchParams] = useState(null);
  const [addItem, setAddItem] = useState(null);

  const q = useCatalog('tours', searchParams);

  const handleSearch = useCallback(() => {
    if (!city.trim()) return;
    setSearchParams({ city: city.trim(), query: query.trim() || 'passeios' });
  }, [city, query]);

  return (
    <div className="min-h-screen">
      <Topbar subtitle="Voia · Passeios" title="Experiências em tempo real"
        right={<Button variant="secondary" icon={Icon.Sparkles} onClick={() => setRoute('home')}>Pedir personalizado</Button>}/>

      <div className="px-10 pb-4">
        <Card className="p-2 mb-6">
          <div className="grid grid-cols-[1fr_2fr_auto] divide-x hairline">
            <SearchCell label="Cidade" value={city} onChange={setCity} placeholder="Paris, Tóquio, Salvador…"/>
            <SearchCell label="Tipo" value={query} onChange={setQuery} placeholder="museus, gastronomia, aventura…"/>
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
            ? <EmptyState icon={Icon.Ticket} eyebrow="Passeios"
                title="Busque experiências reais"
                desc="Escolha uma cidade — a Voia busca passeios com notas reais via Google Places ou TripAdvisor."
                primary={<Button icon={Icon.Sparkles} onClick={() => setRoute('home')}>Conversar com a Voia</Button>}/>
            : <EmptyState icon={Icon.Ticket} eyebrow="Passeios"
                title="Nenhuma experiência encontrada"
                desc="Tente outro tipo ou cidade. A Voia também pode sugerir pelo chat com dicas de experts."
                primary={<Button icon={Icon.Sparkles} onClick={() => setRoute('home')}>Conversar com a Voia</Button>}/>}
          render={(t) => (
            <Card key={t.id} hover className="overflow-hidden h-full">
              <SmartImg seed={`tour-${t.id}`} tone={t.tone} label={t.city} w={600} h={400} className="h-[180px]"/>
              <div className="p-5">
                <Tag tone="brand"><Icon.Sparkles size={10}/> {t.rating ? `★ ${t.rating}` : 'curado'}</Tag>
                <div className="text-[15.5px] font-medium text-ink-900 mt-3 leading-snug">{orTBD(t.name)}</div>
                <div className="text-[12px] text-ink-500 mt-1 flex items-center gap-2">
                  <Icon.MapPin size={11}/>{orTBD(t.city)}<span className="text-ink-300">·</span>
                  <Icon.Clock size={11}/>{fmtDuration(t.dur)}
                </div>
                {has(t.host) && (
                  <div className="mt-3 text-[12px] text-ink-700">Fonte: {t.host}</div>
                )}
                <div className="mt-4 pt-4 border-t hairline flex items-center justify-between">
                  <div className="text-[16px] font-medium text-ink-900">{typeof t.price === 'string' ? t.price : fmtMoney(t.price)}</div>
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

const SearchCell = ({ label, value, onChange, placeholder }) => (
  <label className="px-4 py-2.5 text-left hover:bg-ink-50 transition-colors cursor-text block">
    <div className="label mb-0.5">{label}</div>
    <input
      type="text"
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      className="w-full text-[13.5px] text-ink-900 font-medium bg-transparent outline-none placeholder:text-ink-400"
    />
  </label>
);

export { ToursScreen };
