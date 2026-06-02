// Mobile Search/Explore — full-screen overlay triggered by the Home search icon.
//
// Why this layout:
// • Search is the entry point to discovery (Explorar). When user taps the
//   search icon on Home, this overlay slides in with the searchbar focused at
//   the top and the explore content below.
// • The body has 3 sections: featured collection, expert avatars rail
//   (explorar por experts), and the route grid by category.
// • Typing in the searchbar filters routes/experts inline.

const SearchExploreMobile = ({ onClose, goTo, openChat }) => {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Todos');
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  const cats = ['Todos','Disney','Europa','Família','Premium','Econômico','Gastronomia','Lua de mel','Aventura','Japão','Praia'];

  // Filter routes by search query and category
  const filteredRoutes = mockData.routes.filter(r => {
    const matchCat = cat === 'Todos' || r.category === cat || r.title.toLowerCase().includes(cat.toLowerCase());
    if (!q.trim()) return matchCat;
    const s = q.toLowerCase();
    return matchCat && (
      r.title.toLowerCase().includes(s) ||
      r.category.toLowerCase().includes(s) ||
      r.expert.toLowerCase().includes(s)
    );
  });

  // Filter experts when searching
  const matchingExperts = q.trim() === '' ? [] : mockData.experts.filter(e => {
    const s = q.toLowerCase();
    return e.name.toLowerCase().includes(s) ||
           e.region.toLowerCase().includes(s) ||
           e.specs.some(spec => spec.toLowerCase().includes(s));
  }).slice(0, 4);

  return (
    <div className="absolute inset-0 z-40 bg-canvas flex flex-col slide-up overflow-hidden">
      <div className="h-[44px] shrink-0"/>

      {/* Searchbar header */}
      <header className="px-3 pt-2 pb-3 flex items-center gap-2 bg-paper/85 backdrop-blur-xl shrink-0 z-10">
        <div className="flex-1 bg-canvas border-half rounded-full h-11 pl-4 pr-2 flex items-center gap-2 shadow-soft">
          <Icon.Search size={15} className="text-ink-500 shrink-0"/>
          <input ref={inputRef}
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Destino, experiência, expert…"
            className="flex-1 outline-none text-[14px] bg-transparent placeholder:text-ink-400"/>
          {q && (
            <button onClick={() => setQ('')}
              className="h-7 w-7 rounded-full active:bg-ink-100 text-ink-500 flex items-center justify-center">
              <Icon.X size={12}/>
            </button>
          )}
        </div>
        <button onClick={onClose}
          className="text-[14px] text-ink-700 font-medium px-2 py-1 active:opacity-60 whitespace-nowrap">
          Cancelar
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-[120px]">
        {q.trim() === '' ? (
          <>
            {/* Hero feature */}
            <section className="px-5 pt-4 pb-7">
              <div className="bg-white border-half rounded-3xl overflow-hidden">
                <SmartImg seed="explore-mobile-hero" tone="warm" label="Sul da Itália · outubro" w={800} h={500} className="h-[180px] w-full"/>
                <div className="p-5">
                  <Tag tone="ink"><Icon.Sparkles size={11}/> em destaque</Tag>
                  <h2 className="text-[22px] tracking-tight font-medium text-ink-900 leading-[1.1] mt-3">
                    Outono no <span className="serif-i">Mediterrâneo</span>, sem multidão.
                  </h2>
                  <p className="text-[13px] text-ink-600 mt-2.5 leading-relaxed">
                    7 roteiros autorais. Itália, Grécia, Croácia e sul de Portugal.
                  </p>
                </div>
              </div>
            </section>

            {/* Explorar por experts */}
            <section className="pb-7">
              <div className="flex items-end justify-between mb-3 px-5">
                <div>
                  <div className="label">Quem assina seus roteiros</div>
                  <h2 className="text-[17px] font-medium tracking-[-0.01em] text-ink-900 mt-1">Explorar por experts</h2>
                </div>
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pl-5 pr-5 pb-2">
                {mockData.experts.map(e => (
                  <button key={e.id}
                    onClick={() => { onClose(); setTimeout(() => goTo('experts'), 50); }}
                    className="flex flex-col items-center gap-2 shrink-0 w-[80px] active:scale-[.95] transition-transform">
                    <div className="relative">
                      <Portrait id={e.portrait} alt={e.name} className="h-[72px] w-[72px] rounded-full ring-1 ring-ink-200"/>
                      <div className="absolute -bottom-1 -right-1 bg-paper border-half rounded-full h-5 px-1.5 flex items-center gap-0.5 text-[9.5px] font-medium text-ink-900 shadow-soft">
                        <Icon.Star size={8}/> {e.rating}
                      </div>
                    </div>
                    <div className="text-center w-full">
                      <div className="text-[11.5px] font-medium text-ink-900 leading-tight truncate">{e.name.split(' ')[0]}</div>
                      <div className="text-[9.5px] text-ink-500 mt-0.5 truncate">{e.region.split(' & ')[0]}</div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Categorias */}
            <section className="pb-4">
              <div className="px-5 mb-3">
                <div className="label">Categorias</div>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pl-5 pr-5 pb-2">
                {cats.map(c => (
                  <button key={c} onClick={() => setCat(c)}
                    className={`shrink-0 h-9 px-3.5 rounded-full text-[12.5px] font-medium border whitespace-nowrap transition-colors
                                ${cat === c ? 'bg-ink-900 text-paper border-ink-900' : 'bg-white text-ink-700 border-half active:bg-ink-100'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : (
          <>
            {/* Experts results */}
            {matchingExperts.length > 0 && (
              <section className="px-3 pt-4">
                <div className="label px-3 mb-2">Experts</div>
                <div className="space-y-1">
                  {matchingExperts.map(e => (
                    <button key={e.id}
                      onClick={() => { onClose(); setTimeout(() => goTo('experts'), 50); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl active:bg-ink-100 transition-colors text-left">
                      <Portrait id={e.portrait} alt={e.name} className="h-10 w-10 rounded-full ring-1 ring-ink-200 shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] font-medium text-ink-900 truncate">{e.name}</div>
                        <div className="text-[11px] text-ink-500 truncate">{e.region} · {e.trips} viagens</div>
                      </div>
                      <Icon.ArrowRight size={14} className="text-ink-400 shrink-0"/>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {/* Categoria filter even when searching */}
            <section className="pt-3 pb-2">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pl-5 pr-5 pb-2">
                {cats.map(c => (
                  <button key={c} onClick={() => setCat(c)}
                    className={`shrink-0 h-9 px-3.5 rounded-full text-[12.5px] font-medium border whitespace-nowrap transition-colors
                                ${cat === c ? 'bg-ink-900 text-paper border-ink-900' : 'bg-white text-ink-700 border-half active:bg-ink-100'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Routes grid */}
        <section className="px-5 pt-3 pb-6">
          <div className="flex items-end justify-between mb-3">
            <div className="label">Roteiros{q.trim() ? ` · "${q}"` : ''}</div>
            <div className="text-[11px] text-ink-500">{filteredRoutes.length}</div>
          </div>
          {filteredRoutes.length === 0 ? (
            <div className="bg-white border-half rounded-2xl p-8 text-center">
              <div className="text-[13.5px] text-ink-700">Nenhum roteiro encontrado.</div>
              <button onClick={() => { onClose(); openChat(q ? `Encontrar roteiro: ${q}` : ''); }}
                className="text-[12px] text-ink-900 font-medium mt-2 inline-flex items-center gap-1">
                Perguntar à Gaid <Icon.ArrowRight size={11}/>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRoutes.map(r => (
                <button key={r.id}
                  onClick={() => { onClose(); openChat(`Quero saber mais sobre: ${r.title}`); }}
                  className="w-full bg-white border-half rounded-2xl overflow-hidden text-left active:scale-[.99] transition-transform flex">
                  <SmartImg seed={`route-${r.id}`} tone={r.tone} w={300} h={300} className="w-[100px] shrink-0"/>
                  <div className="flex-1 p-3 min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-ink-500">{r.category} · {r.days} dias</div>
                    <div className="text-[13.5px] font-medium text-ink-900 leading-snug mt-1 line-clamp-2">{r.title}</div>
                    <div className="text-[11px] text-ink-500 mt-1.5 truncate">Por {r.expert}</div>
                    <div className="text-[12px] text-ink-900 font-medium mt-1.5">desde {r.from}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

window.SearchExploreMobile = SearchExploreMobile;
