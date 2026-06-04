import React, { useState, useCallback } from 'react';
import { Icon } from '../components/icons.jsx';
import { Placeholder, Button, Tag, Card, Modal, Topbar, TabRow, AddToTripDrawer } from '../components/ui.jsx';
import { EmptyState } from './EmptyStates.jsx';
import { CatalogCarousel } from '../core/states.jsx';
import { useCatalog } from '../core/store.jsx';
import { TBD, has, orTBD, fmtMoney } from '../core/contracts.jsx';

function defaultDates() {
  const dep = new Date();
  dep.setDate(dep.getDate() + 30);
  const ret = new Date(dep);
  ret.setDate(ret.getDate() + 7);
  return {
    departDate: dep.toISOString().slice(0, 10),
    returnDate: ret.toISOString().slice(0, 10),
  };
}

const FlightsScreen = ({ setRoute }) => {
  const dates = defaultDates();
  const [from, setFrom] = useState('GRU');
  const [to, setTo] = useState('');
  const [departDate, setDepartDate] = useState(dates.departDate);
  const [returnDate, setReturnDate] = useState(dates.returnDate);
  const [adults, setAdults] = useState(1);
  const [searchParams, setSearchParams] = useState(null);
  const [sort, setSort] = useState('best');
  const [picked, setPicked] = useState(null);
  const [addItem, setAddItem] = useState(null);

  const q = useCatalog('flights', searchParams);

  const handleSearch = useCallback(() => {
    if (!from.trim() || !to.trim()) return;
    setSearchParams({ from: from.trim(), to: to.trim(), departDate, returnDate, adults });
  }, [from, to, departDate, returnDate, adults]);

  const data = (q.data || []).slice().sort((a, b) => {
    if (sort === 'price') return (a.priceValue ?? 0) - (b.priceValue ?? 0);
    if (sort === 'time') return String(a.dep).localeCompare(String(b.dep));
    return 0;
  });
  const sortedQuery = { ...q, data };

  return (
    <div className="min-h-screen">
      <Topbar subtitle="Voia · Voos" title="Busca de voos em tempo real"
        right={<Button variant="ghost" icon={Icon.Filter}>Filtros</Button>}/>

      <div className="px-10">
        <Card className="p-2 mb-6">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] divide-x hairline">
            <SearchCell label="De" value={from} onChange={setFrom} placeholder="GRU ou São Paulo"/>
            <SearchCell label="Para" value={to} onChange={setTo} placeholder="CDG ou Paris"/>
            <SearchCell label="Ida" value={departDate} onChange={setDepartDate} type="date"/>
            <SearchCell label="Volta" value={returnDate} onChange={setReturnDate} type="date"/>
            <div className="flex items-center pl-2 pr-1 gap-2">
              <select value={adults} onChange={e => setAdults(Number(e.target.value))}
                className="h-10 px-2 rounded-lg border hairline text-[13px] bg-white">
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} adulto{n>1?'s':''}</option>)}
              </select>
              <Button icon={Icon.Search} onClick={handleSearch} disabled={!from || !to}>Buscar</Button>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between mb-4">
          <TabRow value={sort} onChange={setSort} tabs={[
            { id: 'best', label: 'Melhores' },
            { id: 'price', label: 'Mais barato' },
            { id: 'time', label: 'Por horário' },
          ]}/>
          <div className="text-[12px] text-ink-500">
            {searchParams
              ? (data.length ? `${data.length} resultados · ${searchParams.from} → ${searchParams.to}` : 'Buscando via Amadeus…')
              : 'Informe origem e destino para buscar'}
          </div>
        </div>
      </div>

      <div className="px-10 pb-10">
        <CatalogCarousel
          query={sortedQuery}
          itemClass="w-[300px]"
          empty={!searchParams
            ? <EmptyState icon={Icon.Plane} eyebrow="Voos"
                title="Busque voos reais"
                desc="Informe origem, destino e datas — a Voia busca tarifas reais via Amadeus e mostra as melhores opções."
                primary={<Button icon={Icon.Sparkles} onClick={() => setRoute('home')}>Conversar com a Voia</Button>}/>
            : <EmptyState icon={Icon.Plane} eyebrow="Voos"
                title="Nenhum voo encontrado"
                desc="Tente outras datas ou aeroportos. A Voia também pode ajudar pelo chat."
                primary={<Button icon={Icon.Sparkles} onClick={() => setRoute('home')}>Conversar com a Voia</Button>}/>}
          render={(f) => (
            <Card key={f.id} hover className="p-5 h-full cursor-pointer" onClick={()=>setPicked(f)}>
              <div className="flex items-center justify-between">
                <Placeholder tone={f.tone} className="h-10 w-10 rounded-lg"/>
                {has(f.best) && <Tag tone={f.best==='preço'?'sage':f.best==='milhas'?'brand':'gold'}><Icon.Sparkles size={10}/> melhor {f.best}</Tag>}
              </div>
              <div className="flex items-center gap-3 mt-4">
                <div>
                  <div className="text-[19px] font-medium text-ink-900 leading-none">{orTBD(f.dep)}</div>
                  <div className="text-[11px] text-ink-500 mt-1">{orTBD(f.from)}</div>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <div className="text-[10.5px] text-ink-500">{orTBD(f.dur)}</div>
                  <div className="w-full flex items-center gap-1.5 mt-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-ink-900"/>
                    <div className="flex-1 h-px bg-ink-300"/>
                    <div className="h-1.5 w-1.5 rounded-full bg-ink-900"/>
                  </div>
                  <div className="text-[10.5px] text-ink-500 mt-1">{orTBD(f.stops)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[19px] font-medium text-ink-900 leading-none">{orTBD(f.arr)}</div>
                  <div className="text-[11px] text-ink-500 mt-1">{orTBD(f.to)}</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t hairline flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-wider text-ink-500">{orTBD(f.airline)}</div>
                <div className="text-right">
                  <div className="text-[16px] font-medium text-ink-900">{fmtMoney(f.price)}</div>
                  {has(f.miles) && <div className="text-[11px] text-coral-700">ou {f.miles}</div>}
                </div>
              </div>
            </Card>
          )}
        />
      </div>

      <Modal open={!!picked} onClose={()=>setPicked(null)} size="lg" title="Detalhe do voo"
        footer={picked && <>
          <Button variant="ghost" onClick={()=>setPicked(null)}>Fechar</Button>
          <Button variant="secondary" icon={Icon.Coins}>Usar milhas</Button>
          <Button icon={Icon.Plus} onClick={() => { const f = picked; setPicked(null); setAddItem({ ...f, name: `${f.airline||''} ${f.flight||''}`.trim() }); }}>Adicionar a uma viagem</Button>
        </>}>
        {picked && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Mini3 label="Cabine" value={orTBD(picked.cabin)}/>
              <Mini3 label="Bagagem" value={orTBD(picked.baggage)} tone="sage"/>
              <Mini3 label="Seguro Voia" value="Ativo" tone="sage"/>
              <Mini3 label="Trecho" value={`${orTBD(picked.from)} → ${orTBD(picked.to)}`}/>
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

export { FlightsScreen };
