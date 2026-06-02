// Flights — search + results as a horizontal carousel. Production: results from
// tripApi (empty-first). No mockData. Original layout (no copyrighted airline UI).

const FlightsScreen = ({ setRoute }) => {
  const [sort, setSort] = useState('best');
  const [picked, setPicked] = useState(null);
  const [addItem, setAddItem] = useState(null);
  const q = useCatalog('flights');

  // Sort using the raw numeric value the projection provides (no string parsing).
  const data = (q.data || []).slice().sort((a, b) => {
    if (sort === 'price') return (a.priceValue ?? 0) - (b.priceValue ?? 0);
    if (sort === 'time') return String(a.dep).localeCompare(String(b.dep));
    return 0;
  });
  const sortedQuery = { ...q, data };

  return (
    <div className="min-h-screen">
      <Topbar subtitle="Gaid · Voos" title="Sugestões para sua viagem"
        right={<Button variant="ghost" icon={Icon.Filter}>Filtros</Button>}/>

      <div className="px-10">
        <Card className="p-2 mb-6">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] divide-x hairline">
            <SearchCell label="De"        value={TBD} icon={Icon.Plane}/>
            <SearchCell label="Para"      value={TBD} icon={Icon.MapPin}/>
            <SearchCell label="Datas"     value={TBD} icon={Icon.Calendar}/>
            <SearchCell label="Viajantes" value={TBD} icon={Icon.Users}/>
            <div className="flex items-center pl-2 pr-1"><Button icon={Icon.Search}>Buscar</Button></div>
          </div>
        </Card>

        <div className="flex items-center justify-between mb-4">
          <TabRow value={sort} onChange={setSort} tabs={[
            { id: 'best', label: 'Melhores' },
            { id: 'price', label: 'Mais barato' },
            { id: 'time', label: 'Por horário' },
          ]}/>
          <div className="text-[12px] text-ink-500">{data.length ? `${data.length} resultados · trecho ida` : 'trecho ida'}</div>
        </div>
      </div>

      <div className="px-10 pb-10">
        <CatalogCarousel
          query={sortedQuery}
          itemClass="w-[300px]"
          empty={<EmptyState icon={Icon.Plane} eyebrow="Voos"
            title="Nenhum voo para mostrar ainda"
            desc="Informe origem, destino e datas — a Gaid compara tarifas e milhas e mostra as melhores opções aqui em carrossel."
            primary={<Button icon={Icon.Sparkles} onClick={() => setRoute('home')}>Conversar com a Gaid</Button>}/>}
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
              <Mini3 label="Seguro Gaid" value="Ativo" tone="sage"/>
              <Mini3 label="Trecho" value={`${orTBD(picked.from)} → ${orTBD(picked.to)}`}/>
            </div>
            {data.length > 1 && (
              <div>
                <div className="label mb-2">Mesma rota — comparar</div>
                <div className="space-y-1.5">
                  {data.filter(x=>x.id!==picked.id).map(x => (
                    <div key={x.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-ink-50">
                      <Placeholder tone={x.tone} className="h-7 w-7 rounded-md"/>
                      <div className="flex-1 text-[12.5px] text-ink-700">{orTBD(x.airline)} · {orTBD(x.dep)} → {orTBD(x.arr)} · {orTBD(x.stops)}</div>
                      <div className="text-[12.5px] font-medium">{fmtMoney(x.price)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <AddToTripDrawer open={!!addItem} onClose={() => setAddItem(null)} item={addItem}/>
    </div>
  );
};

const SearchCell = ({ label, value, icon: Ic }) => (
  <button className="px-4 py-2.5 text-left hover:bg-ink-50 transition-colors">
    <div className="label mb-0.5">{label}</div>
    <div className="text-[13.5px] text-ink-900 font-medium truncate">{value}</div>
  </button>
);
const Mini3 = ({ label, value, tone }) => (
  <div className="bg-ink-50 rounded-xl p-3">
    <div className="label">{label}</div>
    <div className={`text-[14px] font-medium mt-0.5 ${tone==='sage'?'text-sage-700':'text-ink-900'}`}>{value}</div>
  </div>
);

window.FlightsScreen = FlightsScreen;
