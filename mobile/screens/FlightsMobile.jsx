// Mobile Flights (Voos) — rethought for thumb-driven booking.
//
// Why this layout vs. desktop:
// • Desktop has a row-based table with wide columns. On mobile we lead with a
//   compact search summary card on top, then vertical flight cards designed
//   to be scanned quickly and tapped.
// • Search criteria live inside a tappable summary bar; tapping it opens a
//   bottom sheet to edit fields (no inline form clutter).
// • Sort is a horizontal segmented control under search.
// • Each flight card shows the visual route timeline (origin · stops · dest)
//   plus the price + miles alternative — both equally legible.
// • Tap → opens a full-bleed detail sheet with comparison and CTA.

const FlightsMobile = ({ goTo, openChat, embedded = false }) => {
  const toast = useToast();
  const [sort, setSort] = useState('best');
  const [picked, setPicked] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [addItem, setAddItem] = useState(null);
  const [criteria, setCriteria] = useState({
    from: 'GRU · São Paulo',
    to: 'LIS · Lisboa',
    when: '12 out → 22 out',
    pax: '2 adultos · executiva',
  });

  const sortChips = [
    { id: 'best',  label: 'Melhores' },
    { id: 'price', label: 'Mais barato' },
    { id: 'time',  label: 'Por horário' },
    { id: 'miles', label: 'Por milhas' },
  ];

  const ordered = useMemo(() => {
    const arr = [...mockData.flights];
    if (sort === 'price') return arr.sort((a,b) => parseInt(a.price.replace(/\D/g,'')) - parseInt(b.price.replace(/\D/g,'')));
    if (sort === 'time')  return arr.sort((a,b) => a.dep.localeCompare(b.dep));
    if (sort === 'miles') return arr.sort((a,b) => parseInt(a.miles.replace(/\D/g,'')) - parseInt(b.miles.replace(/\D/g,'')));
    return arr;
  }, [sort]);

  return (
    <div className="relative pb-[112px]">
      {!embedded && (
        <>
          <header className="px-5 pt-6 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon.Logo size={22} className="text-ink-900"/>
              <span className="text-[15px] font-medium tracking-[-0.01em] text-ink-900">Gaid</span>
            </div>
            <button onClick={() => openChat('Quero ajuda pra escolher um voo')}
              className="h-10 w-10 rounded-full active:bg-ink-100 flex items-center justify-center text-ink-700">
              <Icon.Sparkles size={18}/>
            </button>
          </header>

          <section className="px-5 pt-8 pb-5">
            <div className="label">Voos</div>
            <h1 className="text-[28px] tracking-[-0.025em] font-medium text-ink-900 leading-[1.06] mt-2">
              O voo certo, no <span className="serif-i">cartão certo.</span>
            </h1>
          </section>
        </>
      )}

      {/* Search summary */}
      <section className="px-5 pb-5">
        <button onClick={() => setSearchOpen(true)}
          className="w-full bg-white border-half rounded-3xl p-4 text-left active:bg-ink-50 transition-colors shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-[17px] font-medium text-ink-900 tracking-tight">
                <span>{criteria.from.split(' · ')[0]}</span>
                <Icon.ArrowRight size={14} className="text-ink-500"/>
                <span>{criteria.to.split(' · ')[0]}</span>
              </div>
              <div className="text-[12px] text-ink-500 mt-1 flex items-center gap-2">
                <Icon.Calendar size={11}/>{criteria.when}
                <span className="text-ink-300">·</span>
                <Icon.Users size={11}/>{criteria.pax.split(' · ')[0]}
              </div>
            </div>
            <Icon.Edit size={14} className="text-ink-500 shrink-0"/>
          </div>
        </button>
      </section>

      {/* Sort */}
      <section className="pb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pl-5 pr-5 pb-2">
          {sortChips.map(s => (
            <button key={s.id} onClick={() => setSort(s.id)}
              className={`shrink-0 h-9 px-3.5 rounded-full text-[12.5px] font-medium transition-colors border whitespace-nowrap
                          ${sort === s.id ? 'bg-ink-900 text-paper border-ink-900' : 'bg-white text-ink-700 border-half active:bg-ink-100'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* Gaid recommendation */}
      <section className="px-5 pb-5">
        <div className="bg-ink-900 text-paper rounded-2xl p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-paper/10 flex items-center justify-center shrink-0">
            <Icon.Sparkles size={15}/>
          </div>
          <div className="flex-1">
            <div className="text-[10.5px] uppercase tracking-wider text-paper/60">Gaid recomenda</div>
            <div className="text-[13px] mt-1 leading-snug">TAP TP 088 com milhas — economia estimada R$ 4.580 e seguro premium incluso pelo cartão.</div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="px-5 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[12px] text-ink-500">{ordered.length} resultados · ida</div>
          <button className="text-[12px] text-ink-700 font-medium px-2 py-1 active:bg-ink-100 rounded-md">
            <Icon.Filter size={12} className="inline -mt-0.5 mr-1"/>Filtros
          </button>
        </div>

        {ordered.map(f => (
          <FlightCard key={f.id} flight={f} onTap={() => setPicked(f)}/>
        ))}
      </section>

      {/* Detail sheet */}
      <FlightDetailSheet flight={picked} onClose={() => setPicked(null)}
        onBook={() => { const f = picked; setPicked(null); setTimeout(() => setAddItem({ ...f, name: `${f.airline} ${f.flight}` }), 250); }}/>

      <AddToTripSheet open={!!addItem} onClose={() => setAddItem(null)} item={addItem}/>

      {/* Search sheet */}
      <SearchSheet open={searchOpen} onClose={() => setSearchOpen(false)}
        criteria={criteria} onSave={(c) => { setCriteria(c); setSearchOpen(false); toast({ title: 'Busca atualizada' }); }}/>
    </div>
  );
};

// ============ Flight card ============
const FlightCard = ({ flight, onTap }) => {
  const isBest = flight.best === 'milhas';
  return (
    <button onClick={onTap}
      className="w-full bg-white border-half rounded-2xl p-4 text-left active:scale-[.99] transition-transform">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SmartImg seed={`airline-${flight.airline}`} tone={flight.tone} w={100} h={100} className="h-7 w-7 rounded-md"/>
          <div className="text-[10.5px] uppercase tracking-wider text-ink-500">{flight.airline} · {flight.flight}</div>
        </div>
        <Tag tone="ink"><Icon.Sparkles size={10}/> melhor {flight.best}</Tag>
      </div>

      {/* Route visualization */}
      <div className="flex items-center gap-3">
        <div className="text-center">
          <div className="text-[20px] font-medium text-ink-900 tracking-tight leading-none">{flight.dep}</div>
          <div className="text-[10.5px] text-ink-500 mt-1">{flight.from}</div>
        </div>
        <div className="flex-1 flex flex-col items-center pt-1">
          <div className="text-[10.5px] text-ink-500 mb-1">{flight.dur}</div>
          <div className="w-full flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-ink-900"/>
            <div className="flex-1 h-px bg-ink-300 relative">
              {flight.stops !== 'Direto' && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-ink-500"/>}
            </div>
            <div className="h-1.5 w-1.5 rounded-full bg-ink-900"/>
          </div>
          <div className="text-[10.5px] text-ink-500 mt-1">{flight.stops}</div>
        </div>
        <div className="text-center">
          <div className="text-[20px] font-medium text-ink-900 tracking-tight leading-none">{flight.arr}</div>
          <div className="text-[10.5px] text-ink-500 mt-1">{flight.to}</div>
        </div>
      </div>

      {/* Price row */}
      <div className="mt-4 pt-3 border-t hairline flex items-center justify-between">
        <div>
          <div className="text-[10.5px] text-ink-500 uppercase tracking-wider">Pagar</div>
          <div className="text-[16px] font-medium text-ink-900 leading-none mt-1">{flight.price}</div>
        </div>
        <div className="text-center">
          <div className="text-[10.5px] text-ink-500 uppercase tracking-wider">Ou milhas</div>
          <div className="text-[13.5px] font-medium text-ink-900 mt-1">{flight.miles}</div>
        </div>
        <div className="h-9 px-3 rounded-full bg-ink-900 text-paper text-[12.5px] font-medium flex items-center gap-1.5">
          Ver
          <Icon.ArrowRight size={11}/>
        </div>
      </div>
    </button>
  );
};

// ============ Flight detail sheet ============
const FlightDetailSheet = ({ flight, onClose, onBook }) => {
  if (!flight) return null;
  return (
    <BottomSheet open={!!flight} onClose={onClose} title="Detalhe do voo" height="90vh"
      footer={
        <>
          <Button variant="secondary" icon={Icon.Coins} className="flex-1">Milhas</Button>
          <Button onClick={onBook} icon={Icon.Plus} className="flex-1">Adicionar a uma viagem</Button>
        </>
      }>
      <div className="px-5 pt-4">
        <div className="bg-white border-half rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <SmartImg seed={`airline-${flight.airline}`} tone={flight.tone} w={100} h={100} className="h-9 w-9 rounded-md"/>
            <div>
              <div className="text-[14px] font-medium text-ink-900">{flight.airline}</div>
              <div className="text-[11px] text-ink-500">{flight.flight}</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <div className="text-[26px] font-medium text-ink-900 tracking-tight leading-none">{flight.dep}</div>
              <div className="text-[11px] text-ink-500 mt-1">{flight.from}</div>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <div className="text-[11px] text-ink-500 mb-1">{flight.dur}</div>
              <div className="w-full flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-ink-900"/>
                <div className="flex-1 h-px bg-ink-300"/>
                <Icon.Plane size={11} className="text-ink-500"/>
                <div className="flex-1 h-px bg-ink-300"/>
                <div className="h-2 w-2 rounded-full bg-ink-900"/>
              </div>
              <div className="text-[11px] text-ink-500 mt-1">{flight.stops}</div>
            </div>
            <div>
              <div className="text-[26px] font-medium text-ink-900 tracking-tight leading-none">{flight.arr}</div>
              <div className="text-[11px] text-ink-500 mt-1">{flight.to}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="px-5 pt-4 grid grid-cols-2 gap-2">
        <DetailTile label="Cabine" value="Executiva"/>
        <DetailTile label="Bagagem" value="2 × 32 kg"/>
        <DetailTile label="Refeição" value="Premium"/>
        <DetailTile label="Seguro Gaid" value="Ativo"/>
      </div>

      {/* Gaid tip */}
      <div className="px-5 pt-4">
        <div className="bg-ink-50 border-half rounded-xl p-4 flex items-start gap-3">
          <Icon.Sparkles size={15} className="text-ink-900 shrink-0 mt-0.5"/>
          <div className="text-[12.5px] text-ink-700 leading-relaxed">
            <span className="font-medium text-ink-900">Gaid recomenda:</span> pagar com TAP Miles & Go Infinite — +78.000 milhas e seguro premium ativado automaticamente.
          </div>
        </div>
      </div>

      {/* Price options */}
      <div className="px-5 pt-5">
        <div className="label mb-3">Formas de pagamento</div>
        <div className="space-y-2">
          <PayOption icon={Icon.Wallet} title="Pagar com cartão" amount={flight.price} sub="+ 8.420 pts Gaid Signature"/>
          <PayOption icon={Icon.Coins} title="Usar milhas" amount={flight.miles} sub="+ R$ 240 de taxa"/>
          <PayOption icon={Icon.Refresh} title="Misto" amount="50% + 50%" sub="Otimiza milhas e cashback"/>
        </div>
      </div>

      {/* Comparison */}
      <div className="px-5 pt-6 pb-6">
        <div className="label mb-3">Comparar com outras opções</div>
        <div className="space-y-1.5">
          {mockData.flights.filter(x => x.id !== flight.id).map(x => (
            <div key={x.id} className="flex items-center gap-3 px-3 py-2.5 bg-ink-50 rounded-xl">
              <SmartImg seed={`airline-${x.airline}`} tone={x.tone} w={100} h={100} className="h-7 w-7 rounded-md"/>
              <div className="flex-1 text-[12px] text-ink-700">{x.airline} · {x.dep} → {x.arr}</div>
              <div className="text-[12px] font-medium text-ink-900">{x.price}</div>
            </div>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
};

const DetailTile = ({ label, value }) => (
  <div className="bg-ink-50 rounded-xl px-3 py-2.5">
    <div className="label">{label}</div>
    <div className="text-[14px] font-medium text-ink-900 mt-0.5 truncate">{value}</div>
  </div>
);

const PayOption = ({ icon: Ic, title, amount, sub }) => (
  <button className="w-full bg-white border-half rounded-xl px-3.5 py-3 flex items-center gap-3 text-left active:bg-ink-50 transition-colors">
    <div className="h-9 w-9 rounded-lg bg-ink-100 text-ink-900 flex items-center justify-center shrink-0"><Ic size={14}/></div>
    <div className="flex-1 min-w-0">
      <div className="text-[13.5px] font-medium text-ink-900 leading-tight">{title}</div>
      <div className="text-[11.5px] text-ink-500 mt-0.5 truncate">{sub}</div>
    </div>
    <div className="text-[13px] font-medium text-ink-900 mono shrink-0">{amount}</div>
  </button>
);

// ============ Search sheet ============
const SearchSheet = ({ open, onClose, criteria, onSave }) => {
  const [c, setC] = useState(criteria);
  useEffect(() => setC(criteria), [criteria]);
  return (
    <BottomSheet open={open} onClose={onClose} title="Editar busca" height="70vh"
      footer={<Button onClick={() => onSave(c)} icon={Icon.Search} className="flex-1">Buscar novamente</Button>}>
      <div className="px-5 pt-3 space-y-3">
        <SearchField icon={Icon.Plane} label="De" value={c.from} onChange={v => setC({...c, from: v})}/>
        <SearchField icon={Icon.MapPin} label="Para" value={c.to} onChange={v => setC({...c, to: v})}/>
        <SearchField icon={Icon.Calendar} label="Datas" value={c.when} onChange={v => setC({...c, when: v})}/>
        <SearchField icon={Icon.Users} label="Viajantes & cabine" value={c.pax} onChange={v => setC({...c, pax: v})}/>
      </div>
    </BottomSheet>
  );
};

const SearchField = ({ icon: Ic, label, value, onChange }) => (
  <label className="block bg-white border-half rounded-2xl px-4 py-3 flex items-center gap-3">
    <Ic size={15} className="text-ink-500 shrink-0"/>
    <div className="flex-1 min-w-0">
      <div className="text-[10.5px] uppercase tracking-wider text-ink-500">{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="w-full text-[14px] font-medium text-ink-900 bg-transparent outline-none mt-0.5"/>
    </div>
  </label>
);

window.FlightsMobile = FlightsMobile;
