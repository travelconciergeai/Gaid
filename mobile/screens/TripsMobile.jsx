// Mobile Trips (Minhas viagens) — vertical list with segmented filters.
//
// Why this layout vs. desktop:
// • Desktop has a 2-column grid; mobile gets a single-column vertical list with
//   tall image-led cards (Airbnb-style) since image scanning is how people
//   recall their own trips.
// • Filter chips are a segmented horizontal scroller (no tab bar; chips
//   feel more like a "filter" than navigation).
// • Each card is fully tappable → sets the active trip and goes to Plan tab.
// • An "Idéia" trip surfaces a different CTA copy because there's no plan yet.

const TripsMobile = ({ goTo, openChat, setActiveTripId }) => {
  const toast = useToast();
  const [filter, setFilter] = useState('todas');

  const filters = [
    { id: 'todas',  label: 'Todas' },
    { id: 'ativas', label: 'Ativas' },
    { id: 'plan',   label: 'Em planejamento' },
    { id: 'ideias', label: 'Ideias' },
    { id: 'feitas', label: 'Concluídas' },
  ];

  const stateMap = (s) => {
    if (s === 'Roteiro vivo') return 'ativas';
    if (s === 'Em planejamento') return 'plan';
    if (s === 'Idéia') return 'ideias';
    if (s === 'Concluído') return 'feitas';
    return 'todas';
  };
  const list = mockData.trips.filter(t => filter === 'todas' || stateMap(t.state) === filter);

  const openTrip = (t) => {
    if (!mockData[t.dataKey]) {
      toast({ title: 'Esta viagem ainda é uma ideia', desc: 'Pergunte à Gaid pra começar' });
      openChat(`Quero começar a planejar ${t.title}`);
      return;
    }
    setActiveTripId && setActiveTripId(t.id);
    goTo('plan');
  };

  return (
    <div className="relative pb-[112px]">
      {/* HEADER */}
      <header className="px-5 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon.Logo size={22} className="text-ink-900"/>
          <span className="text-[15px] font-medium tracking-[-0.01em] text-ink-900">Gaid</span>
        </div>
        <button onClick={() => openChat('')}
          className="h-10 w-10 rounded-full active:bg-ink-100 flex items-center justify-center text-ink-700">
          <Icon.Plus size={20}/>
        </button>
      </header>

      {/* TITLE */}
      <section className="px-5 pt-8 pb-7">
        <div className="label">Minhas viagens</div>
        <h1 className="text-[28px] tracking-[-0.025em] font-medium text-ink-900 leading-[1.06] mt-2">
          Suas próximas <span className="serif-i">aventuras.</span>
        </h1>
        <div className="text-[13px] text-ink-600 mt-3 leading-relaxed">
          {mockData.trips.length} viagens · {list.filter(t => stateMap(t.state) === 'ativas').length} em andamento
        </div>
      </section>

      {/* Filter chips */}
      <section className="pb-5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pl-5 pr-5 pb-2">
          {filters.map(f => {
            const count = f.id === 'todas'
              ? mockData.trips.length
              : mockData.trips.filter(t => stateMap(t.state) === f.id).length;
            const active = filter === f.id;
            return (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`shrink-0 h-9 px-3.5 rounded-full text-[12.5px] font-medium transition-colors border whitespace-nowrap inline-flex items-center gap-1.5
                            ${active ? 'bg-ink-900 text-paper border-ink-900' : 'bg-white text-ink-700 border-half active:bg-ink-100'}`}>
                {f.label}
                <span className={`text-[10.5px] mono ${active ? 'text-paper/60' : 'text-ink-400'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* List */}
      <section className="px-5 space-y-4">
        {list.length === 0 ? (
          <div className="bg-white border-half rounded-2xl p-8 text-center">
            <div className="text-[14px] text-ink-700">Nenhuma viagem por aqui ainda.</div>
            <div className="text-[12px] text-ink-500 mt-1">Tente outro filtro.</div>
          </div>
        ) : list.map(t => (
          <TripCard key={t.id} trip={t} onOpen={() => openTrip(t)}/>
        ))}
      </section>

      {/* Surprise me CTA */}
      <section className="px-5 pt-6">
        <button onClick={() => openChat('Surpreenda-me com uma viagem para 2027')}
          className="w-full bg-white border-half border-dashed rounded-2xl p-4 flex items-center gap-3 text-left active:bg-ink-50 transition-colors">
          <div className="h-11 w-11 rounded-xl bg-ink-900 text-paper flex items-center justify-center shrink-0">
            <Icon.Sparkles size={16}/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-medium text-ink-900 leading-tight">Gaid pode planejar uma viagem-surpresa</div>
            <div className="text-[11.5px] text-ink-500 mt-0.5">3 propostas curadas em 24h</div>
          </div>
          <Icon.ArrowRight size={14} className="text-ink-400 shrink-0"/>
        </button>
      </section>
    </div>
  );
};

// ============ Trip card ============
const TripCard = ({ trip, onOpen }) => {
  const stateTone = {
    'Roteiro vivo': 'live',
    'Em planejamento': 'plan',
    'Idéia': 'idea',
    'Concluído': 'done',
  }[trip.state] || 'plan';

  return (
    <button onClick={onOpen}
      className="w-full bg-white border-half rounded-3xl overflow-hidden text-left active:scale-[.99] transition-transform shadow-soft">
      <div className="relative">
        <SmartImg seed={`trip-${trip.id}`} tone={trip.tone} label={trip.cover} w={800} h={400} className="h-[180px] w-full"/>
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 via-black/10 to-transparent"/>

        {/* State badge */}
        <div className="absolute top-3 left-3">
          <StateBadge state={trip.state} tone={stateTone}/>
        </div>

        {/* Progress / completion badge */}
        <div className="absolute top-3 right-3">
          {stateTone === 'done' ? (
            <div className="h-7 px-2.5 rounded-full bg-paper/95 border-half text-[11px] font-medium text-ink-900 flex items-center gap-1.5">
              <Icon.Check size={11}/>Concluída
            </div>
          ) : (
            <div className="h-7 px-2.5 rounded-full bg-paper/95 border-half text-[11px] font-medium text-ink-900 flex items-center gap-1.5">
              <Icon.Sparkles size={11}/>{trip.progress}%
            </div>
          )}
        </div>

        {/* Title overlay */}
        <div className="absolute left-4 bottom-3 right-4">
          <div className="text-paper text-[19px] font-medium tracking-tight leading-tight drop-shadow-sm">{trip.title}</div>
          <div className="text-paper/85 text-[11.5px] mt-1">{trip.dates} · {trip.travelers} viajantes</div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3.5">
        {stateTone === 'done' ? (
          <div className="flex items-center justify-between">
            <div className="text-[12px] text-ink-700">Reviva as memórias desta viagem</div>
            <Icon.ArrowRight size={13} className="text-ink-900"/>
          </div>
        ) : stateTone === 'idea' ? (
          <div className="flex items-center justify-between">
            <div className="text-[12px] text-ink-700">
              <Icon.Sparkles size={12} className="inline mr-1 text-ink-900 -mt-0.5"/>
              Pergunte à Gaid para começar
            </div>
            <Icon.ArrowRight size={13} className="text-ink-900"/>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="flex items-center justify-between text-[11px] text-ink-500 mb-1.5">
              <span>Progresso</span>
              <span className="mono">{trip.progress}%</span>
            </div>
            <div className="h-1 rounded-full bg-ink-100 overflow-hidden">
              <div className="h-full bg-ink-900 transition-all" style={{ width: `${trip.progress}%` }}/>
            </div>
            <div className="mt-3 flex items-center justify-between text-[12px]">
              <span className="text-ink-500">{trip.progress < 50 ? 'em construção' : 'quase pronto'}</span>
              <span className="text-ink-900 font-medium inline-flex items-center gap-1">
                Abrir <Icon.ArrowRight size={11}/>
              </span>
            </div>
          </>
        )}
      </div>
    </button>
  );
};

const StateBadge = ({ state, tone }) => {
  const cfg = {
    live: { bg: 'bg-paper/95', dotCls: 'bg-ink-900 animate-pulse' },
    plan: { bg: 'bg-paper/95', dotCls: 'bg-ink-500' },
    idea: { bg: 'bg-paper/95', dotCls: 'bg-ink-400' },
    done: { bg: 'bg-ink-900/85', dotCls: 'bg-paper' },
  }[tone];
  const isDone = tone === 'done';
  return (
    <div className={`h-6 px-2 rounded-full ${cfg.bg} border-half flex items-center gap-1.5 backdrop-blur ${isDone ? 'text-paper' : 'text-ink-900'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotCls}`}/>
      <span className="text-[10.5px] font-medium whitespace-nowrap">{state}</span>
    </div>
  );
};

window.TripsMobile = TripsMobile;
