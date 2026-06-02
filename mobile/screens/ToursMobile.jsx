// Mobile Tours (Passeios) — curated experiences in a Pinterest-style scroll.
//
// Why this layout vs. desktop:
// • Desktop is a 3-column grid; mobile is a vertical magazine layout where each
//   tour gets a tall photo + host info row + duration/price footer.
// • Filters as scrollable chips (Lisboa / Porto / Douro / categorias).
// • A "Curado pra você" rail surfaces 3 picks based on the active trip.
// • Each tour opens a bottom sheet with description, host, what's included
//   and a quick add-to-itinerary CTA.

const ToursMobile = ({ goTo, openChat, embedded = false }) => {
  const toast = useToast();
  const [open, setOpen] = useState(null);
  const [filter, setFilter] = useState('todos');
  const [addItem, setAddItem] = useState(null);

  const filters = [
    { id: 'todos',   label: 'Todos' },
    { id: 'Lisboa',  label: 'Lisboa' },
    { id: 'Porto',   label: 'Porto' },
    { id: 'Douro',   label: 'Vale do Douro' },
    { id: 'foodie',  label: 'Gastronômico' },
    { id: 'cultural',label: 'Cultural' },
    { id: 'autoral', label: 'Autoral' },
  ];

  const list = mockData.tours.filter(t => {
    if (filter === 'todos') return true;
    return t.city === filter || t.name.toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <div className="relative pb-[112px]">
      {!embedded && (
        <>
          <header className="px-5 pt-6 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon.Logo size={22} className="text-ink-900"/>
              <span className="text-[15px] font-medium tracking-[-0.01em] text-ink-900">Gaid</span>
            </div>
            <button onClick={() => openChat('Quero passeios curados pra Portugal')}
              className="h-10 w-10 rounded-full active:bg-ink-100 flex items-center justify-center text-ink-700">
              <Icon.Sparkles size={18}/>
            </button>
          </header>

          <section className="px-5 pt-8 pb-5">
            <div className="label">Passeios curados</div>
            <h1 className="text-[28px] tracking-[-0.025em] font-medium text-ink-900 leading-[1.06] mt-2">
              O que <span className="serif-i">só quem mora ali</span> conhece.
            </h1>
            <p className="text-[13px] text-ink-600 mt-3 leading-relaxed">
              Cada experiência é selecionada por um expert local. Reserve direto.
            </p>
          </section>
        </>
      )}

      {/* Recomendados pra você */}
      <section className="pb-6">
        <div className="flex items-end justify-between mb-3 px-5">
          <div className="label">Curado pra você · Lisboa</div>
          <button onClick={() => openChat('Que outros passeios você sugere?')}
            className="text-[12px] text-ink-700 font-medium px-2 py-1 active:bg-ink-100 rounded-md">Ver mais</button>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pl-5 pr-5 pb-2 snap-x snap-mandatory">
          {mockData.tours.slice(0,3).map(t => (
            <button key={t.id} onClick={() => setOpen(t)}
              className="shrink-0 w-[200px] bg-white border-half rounded-2xl overflow-hidden text-left snap-start active:scale-[.98] transition-transform">
              <SmartImg seed={`tour-${t.id}`} tone={t.tone} w={400} h={300} className="h-[120px] w-full"/>
              <div className="p-3">
                <div className="text-[10px] uppercase tracking-wider text-ink-500">{t.city} · {t.dur}</div>
                <div className="text-[13px] font-medium text-ink-900 leading-tight mt-1 line-clamp-2">{t.name}</div>
                <div className="text-[12px] font-medium text-ink-900 mt-2">{t.price}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Filters */}
      <section className="pb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pl-5 pr-5 pb-2">
          {filters.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`shrink-0 h-9 px-3.5 rounded-full text-[12.5px] font-medium transition-colors border whitespace-nowrap
                          ${filter === f.id ? 'bg-ink-900 text-paper border-ink-900' : 'bg-white text-ink-700 border-half active:bg-ink-100'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* List */}
      <section className="px-5 space-y-4">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[12px] text-ink-500">{list.length} experiências</div>
          <button className="text-[12px] text-ink-700 font-medium px-2 py-1 active:bg-ink-100 rounded-md">
            <Icon.Filter size={12} className="inline -mt-0.5 mr-1"/>Filtros
          </button>
        </div>
        {list.length === 0 ? (
          <div className="bg-white border-half rounded-2xl p-8 text-center">
            <div className="text-[14px] text-ink-700">Nenhum passeio nesse filtro.</div>
          </div>
        ) : list.map(t => (
          <TourCard key={t.id} tour={t} onTap={() => setOpen(t)}/>
        ))}
      </section>

      <TourDetailSheet tour={open} onClose={() => setOpen(null)}
        onAdd={() => { const t = open; setOpen(null); setTimeout(() => setAddItem(t), 250); }}/>

      <AddToTripSheet open={!!addItem} onClose={() => setAddItem(null)} item={addItem}/>
    </div>
  );
};

// ============ Tour card ============
const TourCard = ({ tour, onTap }) => (
  <button onClick={onTap}
    className="w-full bg-white border-half rounded-3xl overflow-hidden text-left active:scale-[.99] transition-transform shadow-soft">
    <div className="relative">
      <SmartImg seed={`tour-${tour.id}`} tone={tour.tone} w={800} h={400} className="h-[200px] w-full"/>
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 via-black/10 to-transparent"/>
      <div className="absolute top-3 left-3">
        <Tag tone="white"><Icon.Sparkles size={10}/> curado</Tag>
      </div>
      <div className="absolute top-3 right-3">
        <div className="h-7 px-2.5 rounded-full bg-paper/95 border-half text-[11px] font-medium text-ink-900 flex items-center gap-1.5">
          <Icon.Clock size={11}/>{tour.dur}
        </div>
      </div>
      <div className="absolute left-4 bottom-3 right-4">
        <div className="text-paper text-[18px] font-medium tracking-tight leading-tight">{tour.name}</div>
        <div className="text-paper/85 text-[11.5px] mt-1 flex items-center gap-1.5">
          <Icon.MapPin size={11}/>{tour.city}
        </div>
      </div>
    </div>

    <div className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <Portrait id={hostPortrait(tour.host)} alt={tour.host} className="h-8 w-8 rounded-full ring-1 ring-ink-200 shrink-0"/>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] text-ink-700">Host</div>
          <div className="text-[13px] font-medium text-ink-900 truncate">{tour.host}</div>
        </div>
        <Tag tone="ink"><Icon.Star size={10}/> 4.9</Tag>
      </div>
      <div className="pt-3 border-t hairline flex items-center justify-between">
        <div className="text-[16px] font-medium text-ink-900">{tour.price}</div>
        <div className="text-[12.5px] text-ink-900 font-medium inline-flex items-center gap-1">
          Ver detalhes <Icon.ArrowRight size={11}/>
        </div>
      </div>
    </div>
  </button>
);

const hostPortrait = (name) => {
  // Deterministic portrait per host name across the app
  const map = {
    'Inês Marçal': 47,
    'Matheus Vidal': 60,
    'Kenji Tanaka': 13,
    'Leila Andrade': 32,
    'Ayla Souza': 25,
    'Pedro Cabral': 53,
  };
  return map[name] || 5;
};

// ============ Tour detail ============
const TourDetailSheet = ({ tour, onClose, onAdd }) => {
  if (!tour) return null;
  return (
    <BottomSheet open={!!tour} onClose={onClose} height="92vh"
      footer={
        <>
          <Button variant="secondary" icon={Icon.Heart} className="flex-1">Salvar</Button>
          <Button onClick={onAdd} icon={Icon.Plus} className="flex-1">Adicionar a uma viagem</Button>
        </>
      }>
      <div className="relative">
        <div className="h-[260px] overflow-hidden">
          <SmartImg seed={`tour-${tour.id}-cover`} tone={tour.tone} w={800} h={500} className="h-full w-full"/>
        </div>
        <div className="grid grid-cols-3 gap-1 px-1 pt-1">
          {[1,2,3].map(i => (
            <SmartImg key={i} seed={`tour-${tour.id}-g${i}`} tone={['warm','cool','sage'][i-1]} w={300} h={200} className="aspect-[4/3] rounded-md"/>
          ))}
        </div>
      </div>

      <div className="px-5 pt-5">
        <Tag tone="ink"><Icon.Sparkles size={10}/> Curado pela Gaid</Tag>
        <div className="text-[22px] font-medium tracking-tight text-ink-900 mt-3 leading-snug">{tour.name}</div>
        <div className="text-[12.5px] text-ink-500 mt-1.5 flex items-center gap-2">
          <span className="flex items-center gap-1"><Icon.MapPin size={11}/>{tour.city}</span>
          <span className="text-ink-300">·</span>
          <span className="flex items-center gap-1"><Icon.Clock size={11}/>{tour.dur}</span>
        </div>

        <p className="text-[13.5px] text-ink-700 leading-relaxed mt-4">
          Uma experiência íntima que sai da rota turística. Pequeno grupo,
          atenção autoral e tempo pra realmente sentir o lugar.
        </p>
      </div>

      {/* Host */}
      <div className="px-5 pt-5">
        <div className="bg-white border-half rounded-2xl p-4 flex items-center gap-3">
          <Portrait id={hostPortrait(tour.host)} alt={tour.host} className="h-12 w-12 rounded-full ring-1 ring-ink-200 shrink-0"/>
          <div className="flex-1 min-w-0">
            <div className="text-[10.5px] uppercase tracking-wider text-ink-500">Host</div>
            <div className="text-[14px] font-medium text-ink-900">{tour.host}</div>
            <div className="text-[11.5px] text-ink-500 mt-0.5">142 viagens · 4.97 ★</div>
          </div>
        </div>
      </div>

      {/* What's included */}
      <div className="px-5 pt-5">
        <div className="label mb-2">O que está incluído</div>
        <ul className="space-y-1.5 text-[13px] text-ink-700">
          <li className="flex items-center gap-2"><Icon.Check size={12} className="text-ink-900"/>Guia local especializado</li>
          <li className="flex items-center gap-2"><Icon.Check size={12} className="text-ink-900"/>Grupo pequeno · até 8 pessoas</li>
          <li className="flex items-center gap-2"><Icon.Check size={12} className="text-ink-900"/>Reservas antecipadas</li>
          <li className="flex items-center gap-2"><Icon.Check size={12} className="text-ink-900"/>Cancelamento flexível 48h</li>
        </ul>
      </div>

      {/* Stats */}
      <div className="px-5 pt-5 grid grid-cols-3 gap-2">
        <DetailTile label="Duração" value={tour.dur}/>
        <DetailTile label="Grupo" value="até 8"/>
        <DetailTile label="Idiomas" value="PT · EN"/>
      </div>

      {/* Gaid tip */}
      <div className="px-5 pt-5 pb-6">
        <div className="bg-ink-50 border-half rounded-xl p-4 flex items-start gap-3">
          <Icon.Sparkles size={15} className="text-ink-900 shrink-0 mt-0.5"/>
          <div className="text-[12.5px] text-ink-700 leading-relaxed">
            <span className="font-medium text-ink-900">Gaid tip:</span> reserve esta experiência com {tour.host.split(' ')[0]} com 30 dias de antecedência. Vagas íntimas voam.
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="px-5 pb-6">
        <div className="bg-ink-900 text-paper rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-paper/60">Total</div>
            <div className="text-[20px] font-medium mt-0.5">{tour.price}</div>
            <div className="text-[11px] text-paper/70 mt-0.5">por pessoa</div>
          </div>
          <Tag tone="white"><Icon.Sparkles size={10}/> 4× pts</Tag>
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

window.ToursMobile = ToursMobile;
