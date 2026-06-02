// Mobile Home — refined.
// Header is slim and brand-led: just a Gaid wordmark left + bell right.
// Hero greets Helena editorially. Chatbar is pixel-perfect pill that opens the
// chat sheet (lifted to App level so it overlays everything). Section paddings
// unified at 20px (px-5); first card never touches the edge.

const HomeMobile = ({ goTo, openChat }) => {
  const toast = useToast();
  const [inspirationOpen, setInspirationOpen] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="relative pb-[112px]">
      {/* HEADER — slim, just brand + bell. */}
      <header className="px-5 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon.Logo size={22} className="text-ink-900"/>
          <span className="text-[15px] font-medium tracking-[-0.01em] text-ink-900">Gaid</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setSearchOpen(true)}
            className="h-10 w-10 rounded-full active:bg-ink-100 flex items-center justify-center text-ink-700">
            <Icon.Search size={18}/>
          </button>
          <button className="h-10 w-10 rounded-full active:bg-ink-100 flex items-center justify-center text-ink-700 relative">
            <Icon.Bell size={18}/>
            <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-ink-900"/>
          </button>
        </div>
      </header>

      {/* HERO — greeting + chatbar. Generous breathing room. */}
      <section className="px-5 pt-28 pb-16">
        <div className="text-[26px] tracking-[-0.015em] text-ink-700 mb-7 font-normal leading-none">Olá, Helena</div>
        <h1 className="text-[34px] tracking-[-0.025em] font-medium text-ink-900 leading-[1.05]">
          Qual será a sua<br/>
          <span className="serif-i">próxima viagem?</span>
        </h1>

        {/* Tap-to-open chatbar — pixel-perfect pill */}
        <button onClick={() => openChat('')}
          className="mt-12 w-full h-14 pl-5 pr-[6px] rounded-full bg-white border-half shadow-card flex items-center gap-3 active:bg-ink-50 transition-colors">
          <Icon.Sparkles size={16} className="text-ink-700 shrink-0"/>
          <div className="flex-1 text-left text-[14px] text-ink-500 truncate">Quer viajar? A Gaid tem um roteiro…</div>
          <div className="h-11 w-11 rounded-full bg-ink-900 text-paper flex items-center justify-center shrink-0">
            <Icon.Send size={15}/>
          </div>
        </button>
      </section>

      {/* CONTINUAR onde parou */}
      <ContinueCard goTo={goTo}/>

      {/* PISTAS / STARTERS - horizontal */}
      <section className="pt-10 pb-2">
        <div className="flex items-end justify-between mb-4 px-5">
          <div>
            <div className="label mb-1.5">Comece por uma ideia</div>
            <h2 className="text-[19px] tracking-[-0.01em] font-medium text-ink-900">Pistas favoritas</h2>
          </div>
          <button className="text-[12px] text-ink-700 font-medium px-2 py-1 active:bg-ink-100 rounded-md">Ver tudo</button>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pl-5 pr-5 pb-3 snap-x snap-mandatory">
          {mockData.starters.map(s => (
            <button key={s.id} onClick={() => openChat(s.label)}
              className="shrink-0 w-[200px] bg-white border-half rounded-2xl overflow-hidden text-left snap-start active:scale-[.98] transition-transform">
              <SmartImg seed={`starter-mobile-${s.id}`} tone={s.tone} w={400} h={300} className="h-[120px] w-full"/>
              <div className="p-3.5">
                <div className="text-[13.5px] font-medium text-ink-900 leading-tight">{s.label}</div>
                <div className="text-[11px] text-ink-500 mt-1">{s.hint}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* TODAY summary */}
      <section className="px-5 pt-8 pb-2">
        <div className="bg-white border-half rounded-2xl divide-y hairline overflow-hidden">
          <SummaryRow icon={Icon.Coins} label="Milhas" value={mockData.user.miles.toLocaleString('pt-BR')} hint="+12%"/>
          <SummaryRow icon={Icon.Wallet} label="Cartões" value={`${mockData.user.cards} cartões`} hint="2 com bônus"/>
          <SummaryRow icon={Icon.Calendar} label="Viagens" value={`${mockData.user.trips} viagens`} hint="1 ativa"/>
          <SummaryRow icon={Icon.Shield} label="Seguro" value="Ativo" hint="até 22 out" subtle/>
        </div>
      </section>

      {/* INSPIRATION */}
      <section className="pt-10 pb-2">
        <div className="flex items-end justify-between mb-4 px-5">
          <div>
            <div className="label mb-1.5">Inspiração editorial</div>
            <h2 className="text-[19px] tracking-[-0.01em] font-medium text-ink-900">Roteiros que combinam</h2>
          </div>
          <button onClick={() => goTo('explore')} className="text-[12px] text-ink-700 font-medium px-2 py-1 active:bg-ink-100 rounded-md">Explorar</button>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pl-5 pr-5 pb-3 snap-x snap-mandatory">
          {mockData.routes.slice(0,5).map(r => (
            <button key={r.id} onClick={() => setInspirationOpen(r)}
              className="shrink-0 w-[280px] bg-white border-half rounded-2xl overflow-hidden text-left snap-start active:scale-[.98] transition-transform">
              <SmartImg seed={`route-${r.id}`} tone={r.tone} label={r.category} w={500} h={350} className="h-[180px] w-full"/>
              <div className="p-4">
                <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-1">{r.category} · {r.days} dias</div>
                <div className="text-[15px] font-medium text-ink-900 leading-snug line-clamp-2">{r.title}</div>
                <div className="text-[11.5px] text-ink-500 mt-2 flex items-center gap-1.5">
                  <Icon.Sparkles size={11} className="text-ink-900"/>Por {r.expert}
                </div>
                <div className="mt-3 pt-3 border-t hairline flex items-center justify-between text-[12px]">
                  <span className="text-ink-500">desde</span>
                  <span className="text-ink-900 font-medium">{r.from}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Inspiration bottom sheet */}
      <BottomSheet open={!!inspirationOpen} onClose={() => setInspirationOpen(null)}
        title={inspirationOpen?.title || ''}
        height="80vh"
        footer={
          <>
            <Button variant="ghost" onClick={() => setInspirationOpen(null)} className="flex-1">Fechar</Button>
            <Button onClick={() => { setInspirationOpen(null); goTo('plan'); }} className="flex-1" icon={Icon.Sparkles}>Usar como base</Button>
          </>
        }>
        {inspirationOpen && (
          <div>
            <SmartImg seed={`route-cover-${inspirationOpen.id}`} tone={inspirationOpen.tone} label={inspirationOpen.category} w={800} h={500} className="h-[200px] w-full"/>
            <div className="p-5">
              <Tag tone="ink">{inspirationOpen.category} · {inspirationOpen.days} dias</Tag>
              <div className="text-[20px] font-medium tracking-tight text-ink-900 mt-3 leading-snug">{inspirationOpen.title}</div>
              <div className="text-[12.5px] text-ink-500 mt-2">Por {inspirationOpen.expert}</div>
              <div className="grid grid-cols-2 gap-2 mt-5">
                <Mini label="Dias" value={inspirationOpen.days}/>
                <Mini label="A partir" value={inspirationOpen.from}/>
              </div>
              <div className="mt-5">
                <div className="label mb-2">O que está incluído</div>
                <ul className="space-y-1.5 text-[13px] text-ink-700">
                  <li className="flex items-center gap-2"><Icon.Check size={12} className="text-ink-900"/>Hotéis boutique selecionados</li>
                  <li className="flex items-center gap-2"><Icon.Check size={12} className="text-ink-900"/>Transporte entre cidades</li>
                  <li className="flex items-center gap-2"><Icon.Check size={12} className="text-ink-900"/>Jantares com reserva</li>
                  <li className="flex items-center gap-2"><Icon.Check size={12} className="text-ink-900"/>Suporte 24/7</li>
                </ul>
              </div>
              <div className="mt-5 bg-ink-50 border-half rounded-xl p-3 text-[12.5px] text-ink-700">
                <Icon.Sparkles size={13} className="inline text-ink-900 mr-1.5 -mt-0.5"/>
                A Gaid adapta este roteiro às suas datas e ritmo.
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
      {/* Search/Explore overlay */}
      {searchOpen && (
        <SearchExploreMobile
          onClose={() => setSearchOpen(false)}
          goTo={goTo}
          openChat={(seed) => { setSearchOpen(false); openChat(seed); }}
        />
      )}
    </div>
  );
};

const SummaryRow = ({ icon: Ic, label, value, hint, subtle }) => (
  <div className="flex items-center gap-3 px-4 py-3.5 active:bg-ink-50 transition-colors">
    <div className="h-9 w-9 rounded-lg bg-ink-100 text-ink-700 flex items-center justify-center"><Ic size={15}/></div>
    <div className="flex-1 min-w-0">
      <div className="text-[10px] text-ink-500 uppercase tracking-wider">{label}</div>
      <div className="text-[14px] font-medium text-ink-900 mt-0.5">{value}</div>
    </div>
    <div className={`text-[11.5px] ${subtle ? 'text-ink-500' : 'text-ink-700'}`}>{hint}</div>
    <Icon.ChevronRight size={14} className="text-ink-400"/>
  </div>
);

const Mini = ({ label, value }) => (
  <div className="bg-ink-50 rounded-xl px-3 py-2.5">
    <div className="label">{label}</div>
    <div className="text-[15px] font-medium text-ink-900 mt-0.5">{value}</div>
  </div>
);

const ContinueCard = ({ goTo }) => {
  const trip = mockData.trip;
  return (
    <section className="px-5">
      <button onClick={() => goTo('plan')}
        className="w-full bg-white border-half rounded-3xl overflow-hidden text-left active:scale-[.99] transition-transform shadow-card">
        <div className="relative">
          <SmartImg seed={trip.coverSeed} tone={trip.cover} label={trip.coverLabel} w={800} h={400} className="h-[160px] w-full"/>
          <div className="absolute top-3 left-3">
            <Tag tone="white"><span className="h-1.5 w-1.5 rounded-full bg-ink-900 animate-pulse"/> Roteiro vivo</Tag>
          </div>
          <div className="absolute top-3 right-3">
            <div className="h-7 px-2.5 rounded-full bg-paper/95 border-half text-[11px] font-medium text-ink-900 flex items-center gap-1.5">
              <Icon.Sparkles size={11}/>{trip.progress}%
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="text-[10.5px] uppercase tracking-wider text-ink-500">Continuar onde parou</div>
          <div className="text-[17px] font-medium tracking-tight text-ink-900 mt-1.5 leading-snug">{trip.title}</div>
          <div className="text-[12px] text-ink-500 mt-1">{trip.dates} · {trip.travelers} viajantes</div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-[12.5px] text-ink-700 flex-1 pr-3">
              <Icon.Sparkles size={12} className="inline mr-1 text-ink-900 -mt-0.5"/>
              {trip.insights?.[0]?.text?.slice(0,46)}…
            </div>
            <div className="h-9 w-9 rounded-full bg-ink-900 text-paper flex items-center justify-center shrink-0">
              <Icon.ArrowRight size={14}/>
            </div>
          </div>
        </div>
      </button>
    </section>
  );
};

// ============ ChatSheet ============
// Full-screen overlay rendered at App level. Refinements:
// • Single "new chat" pencil icon top-right (no redundant back+close)
// • Header: minimal — just Gaid wordmark centered, ChatGPT-style
// • Composer matches Home chatbar exactly
// • Messages scroll BEHIND the composer thanks to a frosted gradient mask
// • Sheet is fully opaque so the home doesn't bleed through on scroll
// • After generation: shows TripReadyCard inline; user taps to open the plan.
const ChatSheet = ({ seed, onClose, onComplete, setActiveTripId }) => {
  const [input, setInput] = useState('');
  const [chat, setChat] = useState([]);
  const [typing, setTyping] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [phase, setPhase] = useState('intro');
  const [targetTripId, setTargetTripId] = useState('trip-lisboa-porto');
  const [flowKey, setFlowKey] = useState('disney');
  const scrollerRef = useRef(null);

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Flow configs — wizard + generation script + target trip per intent.
  const FLOW_CFG = {
    disney: { wizardKey:'disneyWizard', genKey:'genSteps',     tripId:'trip-disney',
      intro:'Disney em família é uma das minhas especialidades. Algumas perguntas rápidas — clica numa opção ou descreve com suas palavras.' },
    kids:   { wizardKey:'kidsWizard',   genKey:'genStepsKids', tripId:'trip-disney',
      intro:'Viajar com crianças tem mil detalhes — documentos, carrinho, ritmo. 3 perguntas e eu penso no resto por você.' },
    dog:    { wizardKey:'dogWizard',    genKey:'genStepsDog',  tripId:'trip-portugal-dog',
      intro:'Viajar com cachorro pra Europa tem prazos que começam ~30 dias antes. 3 perguntas e eu monto tudo — documentos, voo na cabine e lugares pet-friendly.' },
  };
  const cfg = FLOW_CFG[flowKey] || FLOW_CFG.disney;
  const wizard = mockData[cfg.wizardKey];

  const detectFlow = (t) => {
    const s = (t || '').toLowerCase();
    if (/cachorr|c[ãa]o\b|c[ãa]es|pet\b|cadela|cadelo|dog/.test(s)) return 'dog';
    if (/filho|filha|crian|fam[ií]lia|kids|beb[êe]|netos?/.test(s)) return 'kids';
    if (s.includes('disney')) return 'disney';
    return null;
  };

  // Pick which mock trip a free-text request resolves to (so the chatbar
  // always produces a real roteiro, not a dead end).
  const resolveTrip = (text) => {
    const s = (text || '').toLowerCase();
    if (s.includes('disney')) return 'trip-disney';
    if (s.includes('maldiv') || s.includes('lua de mel') || s.includes('praia')) return 'trip-maldivas';
    if (s.includes('jap')) return 'trip-japao';
    return 'trip-lisboa-porto';
  };

  // Run the generation animation then reveal the trip-ready card.
  const startGeneration = (tripId, genKey) => {
    setTargetTripId(tripId);
    setPhase('generating');
    setChat(c => [
      ...c,
      { who: 'agent', text: 'Beleza, tenho o suficiente. Estou montando seu roteiro — leva uns 30 segundos.' },
      { who: 'agent', generating: true, genKey: genKey || 'genSteps' },
    ]);
  };

  useEffect(() => {
    const boot = async () => {
      if (seed) {
        setChat(c => [...c, { who: 'user', text: seed }]);
        await sleep(700);
      }
      const detected = detectFlow(seed || '');
      setTyping(true);
      await sleep(900);
      setTyping(false);

      if (detected) {
        setFlowKey(detected);
        setChat(c => [...c, { who: 'agent', text: FLOW_CFG[detected].intro }]);
        await sleep(400);
        setChat(c => [...c, { who: 'agent', wizardStep: 0 }]);
        setWizardStep(0);
        setPhase('asking');
      } else if (seed) {
        // Free-text request from the home chatbar → confirm then generate.
        setChat(c => [...c, { who: 'agent', text: 'Perfeito. Já consigo desenhar um primeiro esboço disso pra você.' }]);
        await sleep(500);
        startGeneration(resolveTrip(seed), 'genSteps');
      } else {
        setChat(c => [...c, { who: 'agent', text: 'Conta um pouco mais — pra onde, com quem e em que ritmo? Eu monto a primeira versão.' }]);
        setPhase('free');
      }
    };
    boot();
  }, []);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 99999, behavior: 'smooth' });
  }, [chat, typing]);

  const onGenComplete = () => {
    // Set the active trip so the Plano tab and other surfaces reflect it.
    setActiveTripId && setActiveTripId(targetTripId);
    const meta = mockData.trips.find(t => t.id === targetTripId);
    const trip = (meta && mockData[meta.dataKey]) || mockData.disneyTrip;
    setChat(c => [
      ...c.filter(m => !m.generating),
      { who: 'agent', text: trip.prep
          ? `Pronto! Montei o roteiro e — como você vai com ${flowKey === 'dog' ? 'o Théo' : 'as crianças'} — preparei um checklist com tudo que pensei por você.`
          : 'Pronto. Seu roteiro está vivo — com expert dedicado, milhas otimizadas e seguro ativo.' },
      ...(trip.prep ? [{ who: 'agent', prep: flowKey }] : []),
      { who: 'agent', tripReady: true, tripId: targetTripId },
    ]);
    setPhase('ready');
  };

  const send = (text) => {
    const t = (text || input).trim();
    if (!t) return;
    setInput('');
    if (phase === 'asking') {
      answer('custom', t);
    } else {
      setChat(c => [...c, { who: 'user', text: t }]);
      const detected = detectFlow(t);
      if (detected) {
        setFlowKey(detected);
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          setChat(c => [...c, { who: 'agent', text: FLOW_CFG[detected].intro }]);
          setChat(c => [...c, { who: 'agent', wizardStep: 0 }]);
          setWizardStep(0);
          setPhase('asking');
        }, 800);
      } else {
        // Any free-text travel request → confirm then generate a roteiro.
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          setChat(c => [...c, { who: 'agent', text: 'Boa — já consigo montar um primeiro esboço disso.' }]);
          setTimeout(() => startGeneration(resolveTrip(t), 'genSteps'), 500);
        }, 800);
      }
    }
  };

  const answer = (optId, label) => {
    setChat(c => [
      ...c.map(m => (m.wizardStep === wizardStep ? { ...m, answered: { optId, label } } : m)),
      { who: 'user', text: label },
    ]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      if (wizardStep < wizard.length - 1) {
        const next = wizardStep + 1;
        setWizardStep(next);
        setChat(c => [...c, { who: 'agent', wizardStep: next }]);
      } else {
        startGeneration(cfg.tripId, cfg.genKey);
      }
    }, 700);
  };

  const newChat = () => {
    setChat([]);
    setTyping(false);
    setWizardStep(0);
    setPhase('intro');
    setInput('');
    // Re-boot with no seed
    setTimeout(async () => {
      setTyping(true);
      await sleep(800);
      setTyping(false);
      setChat([{ who: 'agent', text: 'Novo plano. O que você está pensando?' }]);
      setPhase('free');
    }, 100);
  };

  return (
    <div className="absolute inset-0 z-40 bg-canvas flex flex-col slide-up overflow-hidden">
      {/* Top status spacer (don't overlap status bar) */}
      <div className="h-[44px] shrink-0"/>

      {/* Header — ChatGPT-style: minimal, centered wordmark, single action */}
      <header className="relative h-12 px-3 flex items-center justify-between bg-paper/80 backdrop-blur-xl shrink-0 z-10">
        <button onClick={onClose}
          className="h-10 w-10 rounded-full active:bg-ink-100 flex items-center justify-center text-ink-700">
          <Icon.ChevronLeft size={20}/>
        </button>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5">
          <Icon.Logo size={14} className="text-ink-900"/>
          <span className="text-[14px] font-medium tracking-[-0.01em] text-ink-900">Gaid</span>
        </div>
        <button onClick={newChat} title="Novo chat"
          className="h-10 w-10 rounded-full active:bg-ink-100 flex items-center justify-center text-ink-700">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16.5 3.5 20.5 7.5 9 19l-5 1 1-5 11.5-11.5z"/>
            <path d="M14.5 5.5 18.5 9.5"/>
          </svg>
        </button>
      </header>

      {/* Messages — scroll BEHIND the composer. Bottom padding accounts for
          composer height (~92px) + safe-area. */}
      <div ref={scrollerRef} className="flex-1 overflow-y-auto no-scrollbar px-4 pt-4 pb-[112px] space-y-4">
        {chat.map((m, i) => (
          <ChatBubble key={i} m={m}
            wizard={wizard}
            onAnswer={answer}
            onGenDone={onGenComplete}
            onOpenTrip={onComplete}/>
        ))}
        {typing && (
          <div className="flex gap-1 pl-1">
            <span className="dot h-1.5 w-1.5 rounded-full bg-ink-400"/>
            <span className="dot h-1.5 w-1.5 rounded-full bg-ink-400"/>
            <span className="dot h-1.5 w-1.5 rounded-full bg-ink-400"/>
          </div>
        )}
      </div>

      {/* Composer — same chatbar as Home, frosted backdrop so messages
          pass behind it elegantly. No border on top — just a gradient mask. */}
      <div className="absolute left-0 right-0 bottom-0 z-20 pointer-events-none">
        <div className="h-10 bg-gradient-to-t from-canvas via-canvas/80 to-transparent"/>
        <div className="bg-canvas/85 backdrop-blur-xl pt-1 pb-[34px] px-4 pointer-events-auto">
          <div className="bg-white border-half shadow-card rounded-full h-14 pl-5 pr-[6px] flex items-center gap-3">
            <Icon.Sparkles size={16} className="text-ink-700 shrink-0"/>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder={
                phase === 'generating' ? 'Aguarde a Gaid terminar…' :
                phase === 'ready' ? 'Quer ajustar algo do roteiro?' :
                'Responda ou pergunte…'}
              disabled={phase === 'generating'}
              className="flex-1 h-full text-[14px] bg-transparent placeholder:text-ink-400 disabled:opacity-50"/>
            <button onClick={() => send()} disabled={phase === 'generating'}
              className="h-11 w-11 rounded-full bg-ink-900 text-paper active:bg-ink-800 flex items-center justify-center shrink-0 disabled:opacity-40">
              <Icon.Send size={15}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatBubble = ({ m, wizard, onAnswer, onGenDone, onOpenTrip }) => {
  if (m.who === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-ink-900 text-paper rounded-2xl rounded-tr-md px-3.5 py-2 text-[14px] max-w-[80%] leading-relaxed">
          {m.text}
        </div>
      </div>
    );
  }
  if (typeof m.wizardStep === 'number') {
    return <InlineWizardMobile stepIdx={m.wizardStep} wizard={wizard} step={(wizard || mockData.disneyWizard)[m.wizardStep]} answered={m.answered} onPick={onAnswer}/>;
  }
  if (m.generating) {
    return <GenCardMobile steps={mockData[m.genKey] || mockData.genSteps} totalDuration={30000} onDone={onGenDone} onSkip={onGenDone}/>;
  }
  if (m.prep) {
    return <PrepBriefingMobile flowKey={m.prep}/>;
  }
  if (m.tripReady) {
    return <TripReadyCard tripId={m.tripId} onOpen={onOpenTrip}/>;
  }
  return (
    <div className="text-[14px] text-ink-900 leading-relaxed max-w-[88%]">{m.text}</div>
  );
};

// ============ TripReadyCard ============
// Final handoff card shown in the chat after the generation animation
// completes. Previews the resulting Disney trip and gives a single big
// "Abrir roteiro" CTA. Tap anywhere on the card to navigate.
const TripReadyCard = ({ tripId = 'trip-disney', onOpen }) => {
  const meta = mockData.trips.find(t => t.id === tripId);
  const trip = (meta && mockData[meta.dataKey]) || mockData.disneyTrip;
  const confirmed = trip.days.reduce((s, d) => s + d.items.filter(i => i.conf).length, 0);
  const total = trip.days.reduce((s, d) => s + d.items.length, 0);
  return (
    <button onClick={onOpen}
      className="w-full bg-white border-half rounded-3xl overflow-hidden text-left active:scale-[.99] transition-transform shadow-card fade-up">
      <div className="relative">
        <SmartImg seed={trip.coverSeed} tone={trip.cover} label={trip.coverLabel} w={800} h={400} className="h-[160px] w-full"/>
        <div className="absolute top-3 left-3">
          <Tag tone="white"><span className="h-1.5 w-1.5 rounded-full bg-ink-900 animate-pulse"/> Pronto</Tag>
        </div>
        <div className="absolute top-3 right-3">
          <div className="h-7 px-2.5 rounded-full bg-paper/95 border-half text-[11px] font-medium text-ink-900 flex items-center gap-1.5">
            <Icon.Sparkles size={11}/>{trip.progress}%
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="text-[10.5px] uppercase tracking-wider text-ink-500">Roteiro gerado</div>
        <div className="text-[18px] font-medium tracking-tight text-ink-900 mt-1.5 leading-snug">{trip.title}</div>
        <div className="text-[12px] text-ink-500 mt-1">{trip.dates} · {trip.travelers} viajantes · {trip.nights} noites</div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <Mini label="Dias" value={trip.days.length}/>
          <Mini label="Reservados" value={`${confirmed}/${total}`}/>
          <Mini label="Orçamento" value={trip.budget.split(' ').slice(0,2).join(' ')}/>
        </div>

        <div className="mt-4 pt-4 border-t hairline flex items-center justify-between">
          <div className="text-[12.5px] text-ink-700 flex-1 pr-3">
            <Icon.Sparkles size={12} className="inline mr-1 text-ink-900 -mt-0.5"/>
            Expert: {trip.expert}
          </div>
          <div className="h-10 px-3 rounded-full bg-ink-900 text-paper text-[12.5px] font-medium flex items-center gap-1.5 shrink-0">
            Abrir roteiro <Icon.ArrowRight size={13}/>
          </div>
        </div>
      </div>
    </button>
  );
};

const InlineWizardMobile = ({ stepIdx, step, wizard, answered, onPick }) => {
  const [custom, setCustom] = useState('');
  if (!step) return null;
  const total = (wizard || mockData.disneyWizard).length;
  if (answered) {
    return (
      <div className="text-[11.5px] text-ink-500 flex items-center gap-2 pl-1">
        <Icon.Check size={12} className="text-ink-900"/>
        <span>{step.q.replace('?','')} → <span className="text-ink-900 font-medium">{answered.label}</span></span>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[15px] text-ink-900 font-medium leading-snug">{step.q}</div>
        <div className="text-[12px] text-ink-500 mt-1">{step.sub}</div>
      </div>
      <ul className="space-y-1.5">
        {step.options.map(o => (
          <li key={o.id}>
            <button onClick={() => onPick(o.id, o.label)}
              className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border-half active:bg-ink-100 transition-colors">
              <div className="h-6 w-6 rounded-full border-half flex items-center justify-center text-ink-400 shrink-0">
                <Icon.ChevronRight size={11}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-ink-900 leading-tight">{o.label}</div>
                <div className="text-[11px] text-ink-500 mt-0.5">{o.hint}</div>
              </div>
              {o.recommended && (
                <span className="text-[9.5px] font-medium px-1.5 h-5 rounded-full bg-ink-900 text-paper flex items-center whitespace-nowrap shrink-0">recomendado</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <div className="bg-paper border-half border-dashed rounded-xl px-3 py-2 flex items-center gap-2">
        <Icon.Edit size={12} className="text-ink-500"/>
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && custom.trim()) { onPick('custom', custom.trim()); setCustom(''); } }}
          placeholder="Outra opção…"
          className="flex-1 outline-none text-[12.5px] bg-transparent placeholder:text-ink-500"/>
        {custom.trim() && (
          <button onClick={() => { onPick('custom', custom.trim()); setCustom(''); }}
            className="h-6 px-2 rounded-md bg-ink-900 text-paper text-[10.5px] font-medium">
            Enviar
          </button>
        )}
      </div>
      <div className="text-[10px] mono uppercase tracking-wider text-ink-400">pergunta {String(stepIdx+1).padStart(2,'0')} de {String(total).padStart(2,'0')}</div>
    </div>
  );
};

const GenCardMobile = ({ steps, totalDuration = 30000, onDone, onSkip }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [substepIdx, setSubstepIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const stepDuration = totalDuration / steps.length;

  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      const e = Date.now() - start;
      setElapsed(e);
      const newStep = Math.min(steps.length - 1, Math.floor(e / stepDuration));
      setStepIdx(newStep);
      if (e >= totalDuration) { clearInterval(tick); onDone && onDone(); }
    }, 200);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    setSubstepIdx(0);
    const subs = steps[stepIdx]?.sub || [''];
    if (subs.length <= 1) return;
    const rot = setInterval(() => { setSubstepIdx(i => (i + 1) % subs.length); }, 2200);
    return () => clearInterval(rot);
  }, [stepIdx]);

  const pct = Math.min(100, Math.round((elapsed / totalDuration) * 100));
  const current = steps[stepIdx];
  const sub = (current?.sub || [''])[substepIdx % (current?.sub?.length || 1)];

  return (
    <div className="bg-white border-half rounded-2xl shadow-lift p-5 relative">
      <button onClick={onSkip}
        className="absolute top-3 right-3 h-7 px-2 rounded-md text-[11px] text-ink-500 active:bg-ink-100 inline-flex items-center gap-1">
        Ir agora <Icon.ArrowRight size={10}/>
      </button>
      <div className="flex items-start gap-3">
        <div className="relative h-10 w-10 shrink-0">
          <div className="absolute inset-0 rounded-full bg-ink-900 text-paper flex items-center justify-center"><Icon.Logo size={16}/></div>
          <div className="absolute inset-0 rounded-full ring-2 ring-ink-900/30 animate-ping"/>
        </div>
        <div className="flex-1">
          <div className="label">Gaid está montando seu roteiro</div>
          <div className="text-[15px] font-medium text-ink-900 mt-0.5">{current?.label}</div>
          <div className="text-[11.5px] text-ink-500 mt-1" key={sub}>
            <span className="shimmer-text">{sub}</span>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <div className="h-1 rounded-full bg-ink-100 overflow-hidden">
          <div className="h-full bg-ink-900 transition-all duration-200" style={{ width: `${pct}%` }}/>
        </div>
        <div className="flex items-center justify-between text-[10.5px] mono text-ink-500 mt-1.5">
          <span>{pct}%</span>
          <span>{Math.max(0, Math.ceil((totalDuration - elapsed) / 1000))}s</span>
        </div>
      </div>
      <div className="mt-4 space-y-1">
        {steps.map((s, i) => {
          const done = i < stepIdx;
          const active = i === stepIdx;
          return (
            <div key={s.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${active ? 'bg-ink-50' : ''}`}>
              <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
                done ? 'bg-ink-900 text-paper' : active ? 'bg-white border-half' : 'bg-ink-100'}`}>
                {done ? <Icon.Check size={10}/> : active ? <span className="h-1 w-1 rounded-full bg-ink-900"/> : <span className="h-0.5 w-0.5 rounded-full bg-ink-400"/>}
              </div>
              <div className={`text-[12px] flex-1 ${done ? 'text-ink-500 line-through decoration-ink-400' : active ? 'text-ink-900 font-medium' : 'text-ink-400'}`}>{s.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============ Prep briefing (mobile) — "Tudo que pensei por você" ============
// Self-contained when used in chat (manages own state); accepts controlled
// `groups`/`onToggle` when embedded in the Plano tab.
const PrepBriefingMobile = ({ flowKey, groups: gExt, onToggle: onToggleExt, trip: tripExt }) => {
  const trip = tripExt || (flowKey === 'dog' ? mockData.dogTrip : mockData.disneyTrip);
  const [localGroups, setLocalGroups] = useState(() => gExt || JSON.parse(JSON.stringify(trip.prep || [])));
  useEffect(() => { if (gExt) setLocalGroups(gExt); }, [gExt]);
  const groups = gExt || localGroups;
  const [gi, setGi] = useState(0);
  const totalItems = groups.reduce((s, g) => s + g.items.length, 0);
  const doneItems = groups.reduce((s, g) => s + g.items.filter(i => i.done).length, 0);
  const pct = totalItems ? Math.round((doneItems/totalItems)*100) : 0;
  const active = groups[gi] || groups[0];
  const ActiveIc = Icon[active?.icon] || Icon.Check;

  const toggle = (ii) => {
    if (onToggleExt) { onToggleExt(gi, ii); return; }
    setLocalGroups(gs => gs.map((g, gx) => gx !== gi ? g : ({
      ...g, items: g.items.map((it, ix) => ix !== ii ? it : { ...it, done: !it.done })
    })));
  };

  return (
    <div className="bg-white border-half rounded-3xl shadow-card overflow-hidden">
      <div className="p-4 border-b hairline">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-ink-900 text-paper flex items-center justify-center"><Icon.Sparkles size={13}/></div>
          <div className="label">Concierge proativo</div>
        </div>
        <div className="text-[15px] font-medium tracking-tight text-ink-900 mt-2.5">{trip.prepTitle}</div>
        <div className="text-[12.5px] text-ink-600 mt-1 leading-relaxed">{trip.prepIntro}</div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
            <div className="h-full bg-ink-900 transition-all duration-300" style={{ width: `${pct}%` }}/>
          </div>
          <div className="text-[10.5px] text-ink-500 shrink-0"><span className="font-medium text-ink-900">{doneItems}</span>/{totalItems}</div>
        </div>
      </div>

      {/* Chat hint */}
      <div className="mx-4 mt-3 bg-ink-50 border-half rounded-lg px-3 py-2 flex items-start gap-2 text-[11.5px] text-ink-600">
        <Icon.Sparkles size={12} className="text-ink-900 shrink-0 mt-0.5"/>
        Toque para marcar, ou avise a Gaid: "já peguei o passaporte".
      </div>

      {/* Group tabs */}
      <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
        {groups.map((g, idx) => {
          const Ic = Icon[g.icon] || Icon.Check;
          const gDone = g.items.filter(i => i.done).length;
          const isActive = idx === gi;
          const allDone = gDone === g.items.length;
          return (
            <button key={idx} onClick={() => setGi(idx)}
              className={`shrink-0 h-8 pl-2 pr-2.5 rounded-lg border-half flex items-center gap-1.5 transition-colors
                          ${isActive ? 'bg-ink-900 text-paper border-ink-900' : 'bg-white text-ink-700'}`}>
              <Ic size={13}/>
              <span className="text-[11.5px] font-medium">{g.title}</span>
              {g.urgent && !allDone && <span className="h-1.5 w-1.5 rounded-full bg-coral-500"/>}
              <span className={`text-[10.5px] tabular-nums ${isActive ? 'text-paper/70' : 'text-ink-400'}`}>{gDone}/{g.items.length}</span>
            </button>
          );
        })}
      </div>

      {/* Active group items */}
      <div className="border-t hairline divide-y hairline">
        {active?.items.map((it, ii) => (
          <button key={ii} onClick={() => toggle(ii)}
            className="w-full flex items-start gap-2.5 px-4 py-3 text-left active:bg-ink-50">
            <div className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${it.done ? 'bg-ink-900 text-paper' : 'border-half bg-white'}`}>
              {it.done && <Icon.Check size={11}/>}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-[12.5px] leading-snug ${it.done ? 'text-ink-400 line-through decoration-ink-300' : 'text-ink-900 font-medium'}`}>{it.label}</div>
              {it.note && <div className={`text-[11px] mt-0.5 leading-snug ${it.done ? 'text-ink-400' : 'text-ink-500'}`}>{it.note}</div>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

window.HomeMobile = HomeMobile;
window.ChatSheet = ChatSheet;