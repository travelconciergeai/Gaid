// Mobile Experts — rethought for vertical thumb-flow.
//
// Why this layout vs. desktop:
// • The desktop card is 2-column with portrait left + stats right. On mobile
//   we stack vertically: a tall hero portrait on top, then quote and stats.
//   This makes scanning + tapping comfortable with one thumb.
// • Search is hidden behind an icon to keep the canvas clean. Tap → full
//   overlay with a list of live results (mirrors iOS Mail/Notes pattern).
// • Filters are a horizontal scrollable chip rail.
// • Profile opens as a full bottom sheet (90vh) instead of a modal.

const ExpertsMobile = ({ goTo }) => {
  const [open, setOpen] = useState(null);
  const [routeDetail, setRouteDetail] = useState(null);
  const [filter, setFilter] = useState('todos');
  const [searchOpen, setSearchOpen] = useState(false);

  const filters = [
    { id: 'todos',     label: 'Todos' },
    { id: 'Disney',    label: 'Disney & família' },
    { id: 'Europa',    label: 'Europa' },
    { id: 'Itália',    label: 'Itália' },
    { id: 'Portugal',  label: 'Portugal' },
    { id: 'Japão',     label: 'Japão' },
    { id: 'Caribe',    label: 'Caribe' },
    { id: 'África',    label: 'África & safári' },
    { id: 'Premium',   label: 'Luxo' },
  ];

  const list = mockData.experts.filter(e => {
    if (filter === 'todos') return true;
    return (e.regions || []).includes(filter) || e.specs.includes(filter) || e.region.includes(filter);
  });

  return (
    <div className="relative pb-[112px]">
      {/* Slim header */}
      <header className="px-5 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon.Logo size={22} className="text-ink-900"/>
          <span className="text-[15px] font-medium tracking-[-0.01em] text-ink-900">Gaid</span>
        </div>
        <button onClick={() => setSearchOpen(true)}
          className="h-10 w-10 rounded-full active:bg-ink-100 flex items-center justify-center text-ink-700">
          <Icon.Search size={18}/>
        </button>
      </header>

      {/* Editorial hero */}
      <section className="px-5 pt-10 pb-8">
        <Tag tone="ink" className="whitespace-nowrap"><Icon.Award size={11}/> Gaid Editorial</Tag>
        <h1 className="text-[28px] tracking-[-0.025em] font-medium text-ink-900 leading-[1.06] mt-4">
          IA é só metade.<br/>
          <span className="serif-i">A outra metade tem nome.</span>
        </h1>
        <p className="text-[13.5px] text-ink-600 mt-4 leading-relaxed">
          Nossos experts moram nos destinos. Eles supervisionam pessoalmente o roteiro que a Gaid monta para você.
        </p>
      </section>

      {/* Filter chips — horizontal scroll */}
      <section className="pb-6">
        <div className="flex items-center justify-between mb-3 px-5">
          <div className="label">Filtrar por especialidade</div>
          <div className="text-[11px] text-ink-500">{list.length} de {mockData.experts.length}</div>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pl-5 pr-5 pb-2">
          {filters.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`shrink-0 h-9 px-3.5 rounded-full text-[12.5px] transition-colors border whitespace-nowrap
                          ${filter === f.id ? 'bg-ink-900 text-paper border-ink-900' : 'bg-white text-ink-700 border-half active:bg-ink-100'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* Expert cards — vertical list */}
      <section className="px-5 space-y-4">
        {list.map(e => (
          <ExpertCardMobile key={e.id} expert={e} onOpen={() => setOpen(e)}/>
        ))}
        {list.length === 0 && (
          <div className="bg-white border-half rounded-2xl p-8 text-center">
            <div className="text-[14px] text-ink-700">Nenhum expert para esse filtro.</div>
            <div className="text-[12px] text-ink-500 mt-1">Tente outra especialidade.</div>
          </div>
        )}
      </section>

      {/* Expert profile sheet */}
      <ExpertProfileSheet
        expert={open}
        onClose={() => setOpen(null)}
        onUseRoute={(r) => { setOpen(null); setRouteDetail(r); }}/>

      {/* Route detail sheet (signed route) */}
      <RouteDetailSheet
        route={routeDetail}
        onClose={() => setRouteDetail(null)}
        onUse={() => { setRouteDetail(null); goTo('plan'); }}/>

      {/* Search overlay */}
      {searchOpen && (
        <SearchOverlay
          onClose={() => setSearchOpen(false)}
          onPick={(e) => { setSearchOpen(false); setOpen(e); }}/>
      )}
    </div>
  );
};

// ============ Expert card ============
const ExpertCardMobile = ({ expert, onOpen }) => {
  return (
    <button onClick={onOpen}
      className="w-full bg-white border-half rounded-3xl text-left active:scale-[.99] transition-transform shadow-soft p-5 flex flex-col">
      {/* Header row: circular portrait + name (matches desktop) */}
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <Portrait id={expert.portrait} alt={expert.name} className="h-[72px] w-[72px] rounded-full ring-1 ring-ink-200"/>
          <div className="absolute -bottom-1 -right-1 bg-paper border-half rounded-full h-6 px-2 flex items-center gap-1 text-[10.5px] font-medium text-ink-900 shadow-soft">
            <Icon.Star size={9}/> {expert.rating}
          </div>
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <div className="text-[17px] font-medium text-ink-900 tracking-tight leading-tight">{expert.name}</div>
          <div className="text-[12px] text-ink-500 mt-0.5">{expert.region}</div>
          <div className="text-[11.5px] text-ink-500 mt-2">{expert.years} anos no destino</div>
        </div>
      </div>

      {/* Quote */}
      <div className="serif-i text-[14px] text-ink-700 mt-4 leading-snug line-clamp-2">"{expert.quote}"</div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <StatTile value={expert.trips}    label="viagens"/>
        <StatTile value={expert.routes}   label="roteiros"/>
        <StatTile value={expert.years}    label="anos"/>
      </div>

      {/* Specs */}
      <div className="mt-4 flex items-center gap-1.5 flex-wrap">
        {expert.specs.slice(0,3).map(s => (
          <span key={s} className="text-[10.5px] px-2 h-5 rounded-full bg-ink-100 text-ink-700 flex items-center whitespace-nowrap">{s}</span>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t hairline flex items-center justify-between text-[12px]">
        <span className="text-ink-500">Idiomas · PT · EN · ES</span>
        <span className="text-ink-900 font-medium inline-flex items-center gap-1 whitespace-nowrap">Ver perfil <Icon.ArrowRight size={11}/></span>
      </div>
    </button>
  );
};

const StatTile = ({ value, label }) => (
  <div className="bg-ink-50 rounded-lg px-2.5 py-2">
    <div className="text-[15px] font-medium text-ink-900 leading-none">{value}</div>
    <div className="text-[10px] text-ink-500 mt-1.5 uppercase tracking-wider">{label}</div>
  </div>
);

// ============ Expert profile sheet ============
const ExpertProfileSheet = ({ expert, onClose, onUseRoute }) => {
  const toast = useToast();
  if (!expert) return null;
  const signedRoutes = mockData.routes.filter(r => r.expert === expert.name);

  return (
    <BottomSheet open={!!expert} onClose={onClose} height="92vh"
      footer={
        <Button className="flex-1" icon={Icon.Sparkles}
          onClick={() => { onClose(); toast({ title: `${expert.name.split(' ')[0]} vai assinar seu próximo roteiro`, tone:'success' }); }}>
          Usar {expert.name.split(' ')[0]} no meu roteiro
        </Button>
      }>
      {/* Cover portrait */}
      <div className="relative h-[280px] bg-ink-100">
        <Portrait id={expert.portrait} alt={expert.name} className="absolute inset-0 w-full h-full object-cover"/>
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/20 to-transparent"/>
        <div className="absolute top-3 right-3">
          <div className="h-7 px-2.5 rounded-full bg-paper/95 border-half text-[11.5px] font-medium text-ink-900 flex items-center gap-1.5">
            <Icon.Star size={11}/> {expert.rating} · {expert.trips} viagens
          </div>
        </div>
        <div className="absolute left-5 bottom-4 right-5">
          <div className="text-paper text-[26px] font-medium tracking-tight leading-tight">{expert.name}</div>
          <div className="text-paper/85 text-[13px] mt-1">{expert.region}</div>
        </div>
      </div>

      {/* Quote */}
      <div className="px-5 pt-5">
        <div className="serif-i text-[18px] text-ink-700 leading-snug">"{expert.quote}"</div>
      </div>

      {/* About */}
      <div className="px-5 pt-5">
        <div className="label mb-2">Sobre</div>
        <p className="text-[13.5px] text-ink-700 leading-relaxed">{expert.bio}</p>
      </div>

      {/* Stats */}
      <div className="px-5 pt-5 grid grid-cols-3 gap-2">
        <StatTile value={expert.trips}    label="viagens"/>
        <StatTile value={expert.routes}   label="roteiros"/>
        <StatTile value={expert.years}    label="anos"/>
      </div>

      {/* Specs */}
      <div className="px-5 pt-4 flex items-center gap-1.5 flex-wrap">
        {expert.specs.map(s => (
          <span key={s} className="text-[11px] px-2.5 h-6 rounded-full bg-ink-100 text-ink-700 flex items-center whitespace-nowrap">{s}</span>
        ))}
      </div>

      {/* Signed routes */}
      <div className="px-5 pt-6 pb-4">
        <div className="label mb-3">Roteiros assinados</div>
        {signedRoutes.length === 0 ? (
          <div className="text-[12.5px] text-ink-500 bg-ink-50 rounded-xl p-4">
            Sem roteiros publicados ainda — esta expert trabalha sob medida.
          </div>
        ) : (
          <div className="space-y-3">
            {signedRoutes.map(r => (
              <button key={r.id} onClick={() => onUseRoute(r)}
                className="w-full bg-white border-half rounded-2xl overflow-hidden flex active:scale-[.99] transition-transform">
                <SmartImg seed={`route-${r.id}`} tone={r.tone} label={r.category} w={300} h={300} className="w-[100px] shrink-0"/>
                <div className="flex-1 p-3 text-left min-w-0">
                  <div className="text-[13px] font-medium text-ink-900 leading-snug line-clamp-2">{r.title}</div>
                  <div className="text-[11px] text-ink-500 mt-1">{r.days} dias · {r.from}</div>
                  <div className="mt-2 text-[11.5px] text-ink-900 font-medium inline-flex items-center gap-1">
                    Ver dia a dia <Icon.ArrowRight size={11}/>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-4"/>
    </BottomSheet>
  );
};

// ============ Route detail sheet (when tapping a signed route) ============
const RouteDetailSheet = ({ route, onClose, onUse }) => {
  if (!route) return null;
  const detail = mockData.routeDetails[route.id];
  return (
    <BottomSheet open={!!route} onClose={onClose} height="92vh"
      footer={<Button className="flex-1" icon={Icon.Sparkles} onClick={onUse}>Usar este roteiro</Button>}>
      <SmartImg seed={`route-cover-${route.id}`} tone={route.tone} label={route.category} w={800} h={400} className="h-[200px] w-full"/>

      <div className="px-5 pt-5 pb-3">
        <div className="text-[10.5px] uppercase tracking-wider text-ink-500">{route.category} · {route.days} dias</div>
        <div className="text-[22px] font-medium tracking-tight text-ink-900 mt-2 leading-snug">{detail?.title || route.title}</div>
        <div className="text-[12.5px] text-ink-500 mt-1.5">Assinado por {route.expert}</div>
        <p className="text-[13.5px] text-ink-700 leading-relaxed mt-3">{detail?.blurb}</p>
      </div>

      <div className="px-5 pb-4 grid grid-cols-3 gap-2">
        <Mini label="Dias" value={route.days}/>
        <Mini label="A partir" value={route.from}/>
        <Mini label="Expert" value={route.expert.split(' ')[0]}/>
      </div>

      {/* Includes */}
      <div className="px-5 pb-5">
        <div className="label mb-2">O que está incluído</div>
        <div className="space-y-1.5">
          {(detail?.includes || ['Hotéis selecionados','Transportes','Reservas','Suporte 24/7']).map((inc, i) => (
            <div key={i} className="flex items-center gap-2 text-[13px] text-ink-800">
              <Icon.Check size={12} className="text-ink-900"/>{inc}
            </div>
          ))}
        </div>
      </div>

      {/* Day by day */}
      <div className="px-5 pb-6">
        <div className="label mb-3">Dia a dia</div>
        <div className="space-y-3">
          {(detail?.days || []).map(d => (
            <div key={d.d} className="bg-white border-half rounded-xl p-3.5">
              <div className="flex items-baseline justify-between mb-2">
                <div className="text-[15px] font-medium text-ink-900">Dia {String(d.d).padStart(2,'0')}</div>
                <div className="text-[11px] text-ink-500">{d.city}</div>
              </div>
              <div className="text-[11.5px] text-ink-600 italic mb-2">{d.theme}</div>
              <ul className="space-y-1">
                {d.items.map((it, i) => (
                  <li key={i} className="text-[12.5px] text-ink-800 flex items-start gap-2">
                    <div className="h-1 w-1 rounded-full bg-ink-400 mt-2 shrink-0"/>{it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="bg-ink-50 border-half rounded-xl p-4 text-[12.5px] text-ink-700 leading-relaxed">
          <Icon.Sparkles size={13} className="inline mr-1.5 text-ink-900 -mt-0.5"/>
          A Gaid adapta este roteiro às suas datas, orçamento e ritmo.
        </div>
      </div>
    </BottomSheet>
  );
};

const Mini = ({ label, value }) => (
  <div className="bg-ink-50 rounded-xl px-3 py-2.5">
    <div className="label">{label}</div>
    <div className="text-[15px] font-medium text-ink-900 mt-0.5 truncate">{value}</div>
  </div>
);

// ============ Search overlay ============
// Full-screen overlay with search input on top + live results.
const SearchOverlay = ({ onClose, onPick }) => {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = q.trim() === '' ? [] : mockData.experts.filter(e => {
    const s = q.toLowerCase();
    return e.name.toLowerCase().includes(s) ||
           e.region.toLowerCase().includes(s) ||
           (e.regions || []).some(r => r.toLowerCase().includes(s)) ||
           e.specs.some(spec => spec.toLowerCase().includes(s)) ||
           e.bio.toLowerCase().includes(s);
  });

  return (
    <div className="absolute inset-0 z-40 bg-canvas flex flex-col slide-up overflow-hidden">
      <div className="h-[44px] shrink-0"/>
      <header className="px-3 py-2 flex items-center gap-2 border-b hairline bg-paper/80 backdrop-blur-xl shrink-0">
        <div className="flex-1 bg-canvas border-half rounded-full h-11 pl-4 pr-2 flex items-center gap-2">
          <Icon.Search size={15} className="text-ink-500 shrink-0"/>
          <input ref={inputRef}
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Nome, destino, especialidade…"
            className="flex-1 outline-none text-[14px] bg-transparent placeholder:text-ink-400"/>
          {q && (
            <button onClick={() => setQ('')}
              className="h-7 w-7 rounded-full active:bg-ink-100 text-ink-500 flex items-center justify-center">
              <Icon.X size={12}/>
            </button>
          )}
        </div>
        <button onClick={onClose} className="text-[14px] text-ink-700 font-medium px-2 py-1 active:opacity-60">Cancelar</button>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {q.trim() === '' ? (
          <div className="px-5 pt-6">
            <div className="label mb-3">Pesquisas recentes</div>
            <div className="space-y-1">
              {['Japão','Itália foodie','Disney'].map(r => (
                <button key={r} onClick={() => setQ(r)}
                  className="w-full text-left flex items-center gap-3 px-3 py-3 rounded-lg active:bg-ink-100 transition-colors">
                  <Icon.Clock size={14} className="text-ink-400"/>
                  <span className="text-[14px] text-ink-700">{r}</span>
                </button>
              ))}
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="px-5 pt-12 text-center">
            <div className="text-[14px] text-ink-700">Nenhum expert para "{q}"</div>
            <div className="text-[12px] text-ink-500 mt-1">Tente outra especialidade ou destino.</div>
          </div>
        ) : (
          <div className="px-3 pt-3 space-y-1">
            <div className="px-3 pb-1 label">{results.length} resultado{results.length === 1 ? '' : 's'}</div>
            {results.map(e => (
              <button key={e.id} onClick={() => onPick(e)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl active:bg-ink-100 transition-colors text-left">
                <Portrait id={e.portrait} alt={e.name} className="h-11 w-11 rounded-full ring-1 ring-ink-200 shrink-0"/>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-ink-900 truncate">{e.name}</div>
                  <div className="text-[12px] text-ink-500 truncate">{e.region} · {e.trips} viagens</div>
                </div>
                <Icon.ArrowRight size={14} className="text-ink-400 shrink-0"/>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

window.ExpertsMobile = ExpertsMobile;
