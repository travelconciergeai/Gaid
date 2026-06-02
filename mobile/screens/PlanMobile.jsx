// Mobile Plan (Roteiro ativo) — rethought for vertical timeline + bottom chat.
//
// Why this layout:
// • On desktop the chat and timeline sit side-by-side. On mobile we put the
//   timeline as the primary surface (what the user came to see) with a small
//   floating "Concierge" pill they tap to talk to the agent.
// • Trip header collapses into a sticky compact band when you scroll past the
//   hero (so the user always knows which trip / progress / dates).
// • Day-by-day is vertical with sticky day labels.
// • Each item card is tappable → opens an EditItemSheet with alternatives.
// • "Otimizar roteiro" lives in a single FAB action menu at the top right.

const PlanMobile = ({ goTo, trip, openChat, seedMessage, clearSeed }) => {
  const toast = useToast();
  const tripData = trip || mockData.trip;
  const [view, setView] = useState('roteiro'); // roteiro | conversa
  const [days, setDays] = useState(() => JSON.parse(JSON.stringify(tripData.days)));
  const [editItem, setEditItem] = useState(null);
  const [activeMode, setActiveMode] = useState(null);
  const [optimizeOpen, setOptimizeOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [prep, setPrep] = useState(() => tripData.prep ? JSON.parse(JSON.stringify(tripData.prep)) : null);

  useEffect(() => {
    setDays(JSON.parse(JSON.stringify(tripData.days)));
    setActiveMode(null);
    setPrep(tripData.prep ? JSON.parse(JSON.stringify(tripData.prep)) : null);
  }, [tripData.id]);

  const togglePrep = (gi, ii) => {
    setPrep(p => p && p.map((g, gx) => gx !== gi ? g : ({
      ...g, items: g.items.map((it, ix) => ix !== ii ? it : { ...it, done: !it.done })
    })));
  };
  // Resolve a prep item from free text (chat). Returns matched label or null.
  const resolvePrep = (text) => {
    if (!prep) return null;
    const s = text.toLowerCase();
    const WORDS = ['passaporte','visto','certid','seguro','autoriza','microchip','chip','antirr','vacina','raiva','cvi','veterin','atestado','bolsa','caixa','ração','racao','carrinho','protetor','solar','pulseira','refei'];
    let res = null;
    prep.forEach((g, gi) => g.items.forEach((it, ii) => {
      if (it.done || res) return;
      const label = it.label.toLowerCase();
      if (WORDS.some(w => s.includes(w) && label.includes(w.slice(0,5)))) {
        togglePrep(gi, ii); res = it.label;
      }
    }));
    return res;
  };

  // If we arrived via the chatbar with a seed message, jump to Conversa.
  useEffect(() => { if (seedMessage) setView('conversa'); }, [seedMessage]);

  const total = days.reduce((s, d) => s + d.items.length, 0);
  const confirmed = days.reduce((s, d) => s + d.items.filter(i => i.conf).length, 0);
  const pct = total ? Math.round((confirmed / total) * 100) : 0;

  const updateItem = (dayIdx, itemIdx, patch) => {
    setDays(ds => ds.map((d, i) => i === dayIdx
      ? { ...d, items: d.items.map((it, j) => j === itemIdx ? { ...it, ...patch } : it) }
      : d));
  };
  const removeItem = (dayIdx, itemIdx) => {
    setDays(ds => ds.map((d, i) => i === dayIdx ? { ...d, items: d.items.filter((_, j) => j !== itemIdx) } : d));
    toast({ title: 'Item removido' });
  };
  const confirmAll = () => {
    setDays(ds => ds.map(d => ({ ...d, items: d.items.map(it => ({ ...it, conf: true })) })));
    toast({ title: 'Tudo confirmado', tone: 'success' });
  };
  const applyMode = (m) => {
    setActiveMode(m);
    setOptimizeOpen(false);
    toast({ title: `Modo "${m.label}" aplicado`, desc: m.delta, tone: 'success' });
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-canvas">
      {/* Status bar spacer */}
      <div className="h-[44px] shrink-0"/>
      {/* STICKY HEADER */}
      <header className="shrink-0 bg-paper/90 backdrop-blur-xl border-b hairline">
        <div className="px-3 h-14 flex items-center gap-1">
          <button onClick={() => goTo('trips')}
            className="h-10 w-10 rounded-full active:bg-ink-100 flex items-center justify-center text-ink-700 shrink-0">
            <Icon.ChevronLeft size={20}/>
          </button>
          <div className="flex-1 min-w-0 text-center px-1">
            <div className="text-[14.5px] font-medium text-ink-900 tracking-tight truncate leading-tight">{tripData.title}</div>
            <div className="text-[10.5px] text-ink-500 leading-tight mt-0.5">{tripData.dates} · {pct}% pronto</div>
          </div>
          <button onClick={() => setActionsOpen(true)}
            className="h-10 w-10 rounded-full active:bg-ink-100 flex items-center justify-center text-ink-700 shrink-0">
            <Icon.MoreH size={18}/>
          </button>
        </div>
        {/* Tabs */}
        <div className="px-4 pb-3.5 pt-1">
          <div className="bg-ink-100 rounded-2xl p-1 grid grid-cols-2 gap-0.5">
            <button onClick={() => setView('conversa')}
              className={`h-9 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[.98]
                          ${view === 'conversa' ? 'bg-paper text-ink-900 shadow-soft' : 'text-ink-600'}`}>
              <Icon.Sparkles size={14}/><span className="text-[13px] font-medium">Conversa</span>
            </button>
            <button onClick={() => setView('roteiro')}
              className={`h-9 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[.98]
                          ${view === 'roteiro' ? 'bg-paper text-ink-900 shadow-soft' : 'text-ink-600'}`}>
              <Icon.Map size={14}/><span className="text-[13px] font-medium">Roteiro</span>
            </button>
          </div>
        </div>
      </header>

      {/* ROTEIRO VIEW */}
      {view === 'roteiro' && (
        <div className="flex-1 overflow-y-auto no-scrollbar pb-[112px]">
          {/* Compact hero — mirrors desktop: thumbnail + meta + actions */}
          <section className="px-5 pt-6 pb-5">
            <div className="flex items-center gap-3">
              <SmartImg seed={tripData.coverSeed} tone={tripData.cover} label="" w={240} h={180} className="h-[64px] w-[88px] rounded-xl shrink-0"/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-ink-900 animate-pulse"/>
                  <span className="label">Roteiro vivo · {tripData.expert ? tripData.expert.split(' ')[0] : 'Inês'}</span>
                </div>
                <div className="text-[13px] text-ink-700 mt-1 leading-snug line-clamp-2">{tripData.blurb}</div>
              </div>
            </div>

            {/* Meta row */}
            <div className="mt-4 flex items-center gap-x-3 gap-y-1 text-[12px] text-ink-600 flex-wrap">
              <span className="inline-flex items-center gap-1.5"><Icon.Calendar size={12}/>{tripData.dates}</span>
              <span className="text-ink-300">·</span>
              <span className="inline-flex items-center gap-1.5"><Icon.Coins size={12}/>{tripData.budget.split(' ').slice(0,2).join(' ')}</span>
              <span className="text-ink-300">·</span>
              <span className="inline-flex items-center gap-1.5"><Icon.Check size={12} className="text-ink-900"/>{confirmed}/{total}</span>
            </div>

            {/* Action row */}
            <div className="mt-4 flex items-center gap-2">
              <button onClick={() => setOptimizeOpen(true)}
                className="flex-1 h-10 rounded-xl bg-ink-900 text-paper text-[12.5px] font-medium flex items-center justify-center gap-1.5 active:scale-[.98] transition-transform">
                <Icon.Sparkles size={13}/>Otimizar
              </button>
              <button onClick={() => toast({ title: '12 eventos sincronizados', tone: 'success' })}
                className="h-10 w-10 rounded-xl border-half bg-white text-ink-700 flex items-center justify-center active:bg-ink-100"><Icon.Calendar size={15}/></button>
              <button onClick={() => toast({ title: 'Link copiado' })}
                className="h-10 w-10 rounded-xl border-half bg-white text-ink-700 flex items-center justify-center active:bg-ink-100"><Icon.Share size={15}/></button>
            </div>

            {activeMode && (
              <div className="mt-3 bg-ink-50 border-half rounded-xl px-3 py-2 flex items-center gap-2">
                <Icon.Sparkles size={13} className="text-ink-900"/>
                <span className="text-[12px] text-ink-700 flex-1">Modo: <span className="font-medium text-ink-900">{activeMode.label}</span></span>
                <button onClick={() => setActiveMode(null)} className="text-[11px] text-ink-500 active:text-ink-900">Reverter</button>
              </div>
            )}
          </section>

          {/* Progress bar */}
          <section className="px-5 pb-5">
            <div className="flex items-center justify-between text-[11px] text-ink-500 mb-1.5">
              <span>Progresso do roteiro</span><span>{pct}%</span>
            </div>
            <div className="h-1 rounded-full bg-ink-100 overflow-hidden">
              <div className="h-full bg-ink-900 transition-all" style={{ width: `${pct}%` }}/>
            </div>
          </section>

          {/* Insights pill */}
          <section className="px-5 pb-5">
            <button onClick={() => setInsightsOpen(true)}
              className="w-full bg-white border-half rounded-2xl p-3.5 flex items-start gap-3 active:bg-ink-50 text-left transition-colors">
              <div className="h-9 w-9 rounded-lg bg-ink-100 text-ink-900 flex items-center justify-center shrink-0">
                <Icon.Sparkles size={15}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10.5px] uppercase tracking-wider text-ink-500">Insights da Gaid</div>
                <div className="text-[13px] text-ink-800 mt-0.5 line-clamp-1">{tripData.insights?.[0]?.text}</div>
              </div>
              <div className="text-[11px] text-ink-500 shrink-0">{tripData.insights?.length || 0}</div>
              <Icon.ChevronRight size={14} className="text-ink-400 shrink-0"/>
            </button>
          </section>

          {/* Prep panel (kids / pet) */}
          {prep && (
            <section className="px-5 pb-5">
              <PrepBriefingMobile trip={tripData} groups={prep} onToggle={togglePrep} />
            </section>
          )}

          {/* Days */}
          <section className="px-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="label">Cronograma</div>
                <h2 className="text-[18px] font-medium tracking-[-0.01em] text-ink-900 mt-1">{days.length} dias</h2>
              </div>
              <button className="text-[12px] text-ink-700 font-medium px-2 py-1 active:bg-ink-100 rounded-md">Mapa</button>
            </div>
            <div className="space-y-6">
              {days.map((day, di) => (
                <DayBlock key={day.d} day={day} dayIdx={di}
                  onTapItem={(itemIdx) => setEditItem({ dayIdx: di, itemIdx })}
                  onTogglePin={(itemIdx) => updateItem(di, itemIdx, { conf: !day.items[itemIdx].conf })}/>
              ))}
            </div>
          </section>

          {/* Floating chatbar (switches to Conversa) */}
          <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ bottom: '96px' }}>
            <div className="px-5 pointer-events-auto">
              <button onClick={() => setView('conversa')}
                className="w-full bg-white border-half shadow-lift rounded-full h-14 pl-5 pr-[6px] flex items-center gap-3 active:scale-[.99] transition-transform">
                <Icon.Sparkles size={16} className="text-ink-700 shrink-0"/>
                <span className="flex-1 text-left text-[13.5px] text-ink-500 truncate">Editar pelo chat — "tira o jantar de domingo"…</span>
                <div className="h-11 w-11 rounded-full bg-ink-900 text-paper flex items-center justify-center shrink-0">
                  <Icon.Send size={15}/>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONVERSA VIEW */}
      {view === 'conversa' && (
        <PlanChat tripData={tripData} days={days}
          seedMessage={seedMessage} clearSeed={clearSeed}
          resolvePrep={resolvePrep}
          onConfirmAll={confirmAll}
          onOptimize={() => setOptimizeOpen(true)}
          onGoRoteiro={() => setView('roteiro')}/>
      )}

      {/* Sheets (shared by both views) */}
      <EditItemSheet
        editing={editItem}
        days={days}
        onClose={() => setEditItem(null)}
        onSave={(patch) => { if (editItem) updateItem(editItem.dayIdx, editItem.itemIdx, patch); setEditItem(null); toast({ title:'Atualizado', tone:'success' }); }}
        onReplace={(payload) => { if (editItem) updateItem(editItem.dayIdx, editItem.itemIdx, { ...payload, conf: false }); setEditItem(null); toast({ title: 'Atividade trocada', desc: payload.title, tone: 'success' }); }}
        onRemove={() => { if (editItem) { removeItem(editItem.dayIdx, editItem.itemIdx); setEditItem(null); } }}/>

      <OptimizeSheet open={optimizeOpen} onClose={() => setOptimizeOpen(false)} onApply={applyMode}/>

      <ActionsSheet open={actionsOpen} onClose={() => setActionsOpen(false)}
        onPick={(id) => {
          setActionsOpen(false);
          if (id === 'share') toast({ title: 'Link copiado' });
          if (id === 'pdf')   toast({ title: 'PDF gerado' });
          if (id === 'cal')   toast({ title: '12 eventos sincronizados', tone:'success' });
        }}/>

      <BottomSheet open={insightsOpen} onClose={() => setInsightsOpen(false)} title="Insights da Gaid" height="70vh">
        <div className="px-5 py-4 space-y-3">
          {tripData.insights?.map((ins, i) => (
            <div key={i} className="bg-white border-half rounded-xl p-4 flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-ink-100 text-ink-900 flex items-center justify-center shrink-0">
                {ins.kind === 'benefit' ? <Icon.Shield size={14}/> :
                 ins.kind === 'miles' ? <Icon.Coins size={14}/> : <Icon.Sparkles size={14}/>}
              </div>
              <div className="flex-1">
                <div className="label">{ins.kind === 'benefit' ? 'Benefício' : ins.kind === 'miles' ? 'Milhas' : 'Sugestão'}</div>
                <div className="text-[13px] text-ink-800 mt-1 leading-relaxed">{ins.text}</div>
              </div>
            </div>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
};

// ============ PlanChat — embedded chat that edits the roteiro ============
const PlanChat = ({ tripData, seedMessage, clearSeed, resolvePrep, onConfirmAll, onOptimize, onGoRoteiro }) => {
  const toast = useToast();
  const [input, setInput] = useState('');
  const [chat, setChat] = useState([
    { who: 'agent', text: `Estou cuidando do seu roteiro "${tripData.title}". Posso trocar atividades, ajustar ritmo, otimizar custos ou confirmar reservas — é só pedir.` },
  ]);
  const [typing, setTyping] = useState(false);
  const scrollerRef = useRef(null);

  const quick = ['Mais barato', 'Mais um dia de descanso', 'Confirmar tudo', 'Mais gastronomia'];

  useEffect(() => { scrollerRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }); }, [chat, typing]);

  // If arrived with a seed message from the chatbar, send it automatically.
  useEffect(() => {
    if (seedMessage) { handleSend(seedMessage); clearSeed && clearSeed(); }
  }, []);

  const replyFor = (t) => {
    const s = t.toLowerCase();
    if (s.includes('barato') || s.includes('custo') || s.includes('econom')) {
      return { text: 'Posso aplicar o modo "Melhor custo-benefício" — troco 1 hotel e 1 jantar, economia estimada de R$ 3.200 sem perder a essência. Quer aplicar?', cta: [{ label: 'Aplicar custo-benefício', act: 'optimize' }] };
    }
    if (s.includes('descanso') || s.includes('respiro') || s.includes('relax')) {
      return { text: 'Boa — adicionei uma manhã livre e reduzi o ritmo da tarde seguinte. O roteiro ficou mais respirado. Veja na aba Roteiro.', cta: [{ label: 'Ver no roteiro', act: 'roteiro' }] };
    }
    if (s.includes('confirm')) {
      return { text: 'Confirmei todas as reservas pendentes. Seu roteiro está 100% travado.', cta: [{ label: 'Confirmar tudo', act: 'confirmAll' }] };
    }
    if (s.includes('gastronom') || s.includes('comida') || s.includes('restaurante')) {
      return { text: 'Adicionei 2 reservas autorais e uma experiência de mercado com chef local. Quer ver as opções?', cta: [{ label: 'Ver no roteiro', act: 'roteiro' }] };
    }
    if (s.includes('jantar') && (s.includes('tira') || s.includes('remov'))) {
      return { text: 'Removi o jantar e deixei a noite livre. Posso sugerir uma alternativa mais leve se quiser.', cta: [{ label: 'Ver no roteiro', act: 'roteiro' }] };
    }
    return { text: 'Anotado — ajustei o roteiro com base nisso. Dá uma olhada na aba Roteiro pra ver as mudanças.', cta: [{ label: 'Ver no roteiro', act: 'roteiro' }] };
  };

  const handleSend = (text) => {
    const t = (text || input).trim();
    if (!t) return;
    setChat(c => [...c, { who: 'user', text: t }]);
    setInput('');
    const resolved = resolvePrep && resolvePrep(t);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      if (resolved) {
        toast({ title: 'Atualizei seu checklist', desc: resolved, tone: 'success' });
        setChat(c => [...c, { who: 'agent', text: `Maravilha! Marquei “${resolved}” como resolvido. Pode contar comigo pro resto.` }]);
      } else {
        setChat(c => [...c, { who: 'agent', ...replyFor(t) }]);
      }
    }, 900);
  };

  const onCta = (act) => {
    if (act === 'optimize') onOptimize && onOptimize();
    if (act === 'confirmAll') onConfirmAll && onConfirmAll();
    if (act === 'roteiro') onGoRoteiro && onGoRoteiro();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div ref={scrollerRef} className="flex-1 overflow-y-auto no-scrollbar px-4 pt-4 pb-[170px] space-y-4">
        {chat.map((m, i) => (
          m.who === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="bg-ink-900 text-paper rounded-2xl rounded-tr-md px-3.5 py-2 text-[14px] max-w-[80%] leading-relaxed">{m.text}</div>
            </div>
          ) : (
            <div key={i} className="max-w-[88%]">
              <div className="text-[14px] text-ink-900 leading-relaxed">{m.text}</div>
              {m.cta && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.cta.map((c, j) => (
                    <button key={j} onClick={() => onCta(c.act)}
                      className="h-8 px-3 rounded-full border-half bg-white text-[12.5px] text-ink-900 active:bg-ink-50 inline-flex items-center gap-1.5">
                      <Icon.Sparkles size={11} className="text-ink-900"/>{c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        ))}
        {typing && (
          <div className="flex gap-1 pl-1">
            <span className="dot h-1.5 w-1.5 rounded-full bg-ink-400"/>
            <span className="dot h-1.5 w-1.5 rounded-full bg-ink-400"/>
            <span className="dot h-1.5 w-1.5 rounded-full bg-ink-400"/>
          </div>
        )}
      </div>

      {/* Composer + quick chips, pinned above tab bar */}
      <div className="absolute left-0 right-0 bottom-0 z-20 pointer-events-none">
        <div className="h-10 bg-gradient-to-t from-canvas via-canvas/80 to-transparent"/>
        <div className="bg-canvas/85 backdrop-blur-xl pt-1 pb-[96px] px-4 pointer-events-auto">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {quick.map(q => (
              <button key={q} onClick={() => handleSend(q)}
                className="shrink-0 h-8 px-3 rounded-full bg-white border-half text-[12px] text-ink-700 active:bg-ink-100 whitespace-nowrap">{q}</button>
            ))}
          </div>
          <div className="bg-white border-half shadow-card rounded-full h-14 pl-5 pr-[6px] flex items-center gap-3">
            <Icon.Sparkles size={16} className="text-ink-700 shrink-0"/>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Peça uma mudança no roteiro…"
              className="flex-1 h-full text-[14px] bg-transparent placeholder:text-ink-400 outline-none"/>
            <button onClick={() => handleSend()}
              className="h-11 w-11 rounded-full bg-ink-900 text-paper active:bg-ink-800 flex items-center justify-center shrink-0">
              <Icon.Send size={15}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ Sub-components ============
const QuickStat = ({ label, value }) => (
  <div className="py-3 px-2 text-center">
    <div className="text-[10px] text-ink-500 uppercase tracking-wider">{label}</div>
    <div className="text-[13.5px] font-medium text-ink-900 mt-1 truncate">{value}</div>
  </div>
);

const ActionBtn = ({ icon: Ic, label, onClick }) => (
  <button onClick={onClick}
    className="flex-1 h-10 rounded-xl active:bg-ink-100 flex items-center justify-center gap-1.5 text-ink-700 transition-colors">
    <Ic size={14}/>
    <span className="text-[12.5px] font-medium">{label}</span>
  </button>
);

const slotIcon = { 'manhã': Icon.Sun, 'tarde': Icon.Sunset, 'noite': Icon.Moon };
const slotLabel = { 'manhã':'Manhã','tarde':'Tarde','noite':'Noite' };

const DayBlock = ({ day, dayIdx, onTapItem, onTogglePin }) => {
  return (
    <div>
      {/* Day header */}
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="text-[28px] font-medium text-ink-900 tracking-tight leading-none">{String(day.d).padStart(2,'0')}</div>
          <div className="text-[11.5px] text-ink-500 mt-1">{day.date} · {day.city}</div>
        </div>
        {day.flight && <Tag tone="ink"><Icon.Plane size={11}/> Voo</Tag>}
      </div>

      {/* Items list */}
      <div className="space-y-2.5">
        {day.items.map((it, idx) => {
          const SI = slotIcon[it.t] || Icon.Sun;
          return (
            <div key={idx} className="bg-white border-half rounded-2xl p-3.5 flex gap-3 active:scale-[.99] transition-transform">
              <button onClick={() => onTapItem(idx)} className="flex-1 text-left flex gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-ink-100 text-ink-700 flex items-center justify-center shrink-0">
                  <SI size={15}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-ink-500">{slotLabel[it.t]} · {it.dur}</div>
                  <div className="text-[14px] font-medium text-ink-900 leading-snug mt-0.5">{it.title}</div>
                  <div className="text-[11.5px] text-ink-500 mt-0.5 flex items-center gap-1.5">
                    <Icon.MapPin size={10}/>{it.place}
                    <span className="text-ink-300">·</span>
                    <span className="italic">{it.vibe}</span>
                  </div>
                </div>
              </button>
              <button onClick={() => onTogglePin(idx)}
                className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-colors
                            ${it.conf ? 'bg-ink-900 text-paper' : 'bg-ink-100 text-ink-500 active:bg-ink-200'}`}
                title="Confirmar">
                <Icon.Check size={12}/>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============ Edit item sheet ============
const EditItemSheet = ({ editing, days, onClose, onSave, onReplace, onRemove }) => {
  const item = (editing && days[editing.dayIdx]?.items[editing.itemIdx]) || null;
  const day  = (editing && days[editing.dayIdx]) || null;
  const [tab, setTab] = useState('alts');
  const [q, setQ] = useState('');

  useEffect(() => { setQ(''); setTab('alts'); }, [editing]);
  if (!item) return null;

  const alts = (mockData.itemAlternatives[item.tag] || []).filter(a => {
    if (!q) return true;
    return (a.title + ' ' + a.place + ' ' + a.vibe).toLowerCase().includes(q.toLowerCase());
  });

  return (
    <BottomSheet open={!!editing} onClose={onClose} height="92vh"
      title={item.title}>
      <div className="px-5 pt-4">
        <div className="text-[11px] text-ink-500">{day && `Dia ${day.d} · ${day.date} · ${slotLabel[item.t] || ''}`}</div>
        <SmartImg seed={`item-${item.tag}-${item.title}`} tone="warm" w={800} h={400} className="h-[160px] w-full rounded-2xl mt-3"/>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <Mini label="Local" value={item.place}/>
          <Mini label="Duração" value={item.dur}/>
          <Mini label="Vibe" value={item.vibe}/>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 bg-paper px-5 pt-4 pb-3 border-b hairline mt-4">
        <div className="flex gap-2 mb-3">
          <button onClick={() => setTab('alts')}
            className={`h-8 px-3 rounded-lg text-[12.5px] font-medium transition-colors
                       ${tab === 'alts' ? 'bg-ink-900 text-paper' : 'text-ink-600 active:bg-ink-100'}`}>
            <Icon.Sparkles size={11} className="inline -mt-0.5 mr-1"/>Alternativas
          </button>
          <button onClick={() => setTab('edit')}
            className={`h-8 px-3 rounded-lg text-[12.5px] font-medium transition-colors
                       ${tab === 'edit' ? 'bg-ink-900 text-paper' : 'text-ink-600 active:bg-ink-100'}`}>
            <Icon.Edit size={11} className="inline -mt-0.5 mr-1"/>Editar
          </button>
        </div>
        {tab === 'alts' && (
          <div className="bg-white border-half rounded-lg h-9 flex items-center gap-2 px-3">
            <Icon.Search size={13} className="text-ink-500"/>
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder={`Buscar ${item.tag}…`}
              className="flex-1 outline-none text-[12.5px] bg-transparent"/>
          </div>
        )}
      </div>

      {tab === 'alts' ? (
        <div className="px-5 py-4 space-y-2.5">
          {alts.length === 0 ? (
            <div className="bg-ink-50 rounded-xl p-4 text-[13px] text-ink-600 text-center">
              Nada nessa busca. Pergunte à Gaid pelo chat.
            </div>
          ) : alts.map((a, i) => (
            <button key={i} onClick={() => onReplace(a)}
              className="w-full bg-white border-half rounded-xl overflow-hidden flex active:scale-[.99] transition-transform">
              <SmartImg seed={a.seed || a.title} tone="warm" w={200} h={200} className="w-[80px] h-[80px] shrink-0"/>
              <div className="flex-1 p-3 text-left min-w-0">
                <div className="text-[13px] font-medium text-ink-900 leading-tight">{a.title}</div>
                <div className="text-[11px] text-ink-500 mt-1">{a.place} · {a.dur}</div>
                <div className="text-[11px] text-ink-600 mt-1.5 leading-snug line-clamp-2 flex items-start gap-1">
                  <Icon.Sparkles size={10} className="mt-0.5 text-ink-900 shrink-0"/>
                  <span>{a.why}</span>
                </div>
              </div>
              <div className="flex items-center pr-3">
                <div className="h-7 w-7 rounded-md bg-ink-100 text-ink-700 flex items-center justify-center">
                  <Icon.Check size={12}/>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EditTab item={item} onSave={onSave} onRemove={onRemove}/>
      )}
    </BottomSheet>
  );
};

const EditTab = ({ item, onSave, onRemove }) => {
  const [form, setForm] = useState(item);
  useEffect(() => setForm(item), [item]);
  return (
    <div className="px-5 py-4 space-y-3">
      <Field label="Atividade">
        <input value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          className="w-full h-11 px-3 rounded-xl border-half text-[14px] bg-white"/>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Local">
          <input value={form.place || ''} onChange={e => setForm(f => ({ ...f, place: e.target.value }))}
            className="w-full h-11 px-3 rounded-xl border-half text-[14px] bg-white"/>
        </Field>
        <Field label="Duração">
          <input value={form.dur || ''} onChange={e => setForm(f => ({ ...f, dur: e.target.value }))}
            className="w-full h-11 px-3 rounded-xl border-half text-[14px] bg-white"/>
        </Field>
      </div>
      <Field label="Vibe">
        <input value={form.vibe || ''} onChange={e => setForm(f => ({ ...f, vibe: e.target.value }))}
          className="w-full h-11 px-3 rounded-xl border-half text-[14px] bg-white"/>
      </Field>
      <div className="pt-3 grid grid-cols-[1fr_auto] gap-2">
        <Button onClick={() => onSave(form)} icon={Icon.Check} className="w-full">Salvar</Button>
        <Button variant="ghost" icon={Icon.Trash} onClick={onRemove} className="!text-ink-700"/>
      </div>
    </div>
  );
};

const Field = ({ label, children }) => (
  <label className="block">
    <div className="label mb-1.5">{label}</div>
    {children}
  </label>
);

const Mini = ({ label, value }) => (
  <div className="bg-ink-50 rounded-xl px-3 py-2.5">
    <div className="label">{label}</div>
    <div className="text-[13px] font-medium text-ink-900 mt-0.5 truncate">{value}</div>
  </div>
);

// ============ Optimize sheet ============
const OPTIMIZE_MODES = [
  { id: 'value', label: 'Melhor custo-benefício', desc: 'Mantém a essência, corta gordura nos extras.', delta: '−R$ 3.200', icon: Icon.Coins },
  { id: 'luxury', label: 'Modo luxo', desc: 'Hotéis signature, jantares estrelados.', delta: '+R$ 6.800', icon: Icon.Award },
  { id: 'experience', label: 'Foco em experiência', desc: 'Menos turistão, mais autoral.', delta: '4 trocas', icon: Icon.Sparkles },
  { id: 'breath', label: 'Mais respiro', desc: 'Menos atividades por dia.', delta: '−5 itens', icon: Icon.Coffee },
  { id: 'food', label: 'Gastronomia em foco', desc: 'Restaurantes autorais e mercados.', delta: '+4 reservas', icon: Icon.Utensils },
  { id: 'romance', label: 'Romântico', desc: 'Íntimo, jantares com vista.', delta: 'Casal · spa', icon: Icon.Heart },
  { id: 'miles', label: 'Maximizar milhas', desc: 'Paga tudo em pontos.', delta: '−R$ 7.400', icon: Icon.Sparkles },
];

const OptimizeSheet = ({ open, onClose, onApply }) => (
  <BottomSheet open={open} onClose={onClose} title="Otimizar roteiro" height="82vh">
    <div className="px-5 pt-3 pb-2 text-[12.5px] text-ink-600">
      Escolha um foco e a Gaid recompõe tudo em segundos. Você pode desfazer.
    </div>
    <div className="px-3 pb-6 space-y-1.5">
      {OPTIMIZE_MODES.map(m => {
        const Ic = m.icon;
        return (
          <button key={m.id} onClick={() => onApply(m)}
            className="w-full bg-white border-half rounded-2xl px-3.5 py-3 flex items-start gap-3 active:bg-ink-50 transition-colors text-left">
            <div className="h-9 w-9 rounded-lg bg-ink-100 text-ink-900 flex items-center justify-center shrink-0">
              <Ic size={14}/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-medium text-ink-900 leading-tight">{m.label}</div>
              <div className="text-[11.5px] text-ink-600 mt-0.5 leading-snug">{m.desc}</div>
              <div className="text-[10.5px] mono text-ink-500 mt-1.5">{m.delta}</div>
            </div>
            <Icon.ArrowRight size={13} className="text-ink-400 mt-2 shrink-0"/>
          </button>
        );
      })}
    </div>
  </BottomSheet>
);

// ============ Actions sheet ============
const ActionsSheet = ({ open, onClose, onPick }) => (
  <BottomSheet open={open} onClose={onClose} title="Ações do roteiro" height="55vh">
    <div className="px-3 pt-2 pb-6 space-y-1">
      <ActionRow icon={Icon.Share} label="Compartilhar link" sub="Copia link privado do roteiro" onClick={() => onPick('share')}/>
      <ActionRow icon={Icon.Calendar} label="Adicionar à agenda" sub="Sincroniza 12 eventos" onClick={() => onPick('cal')}/>
      <ActionRow icon={Icon.Download} label="Exportar PDF" sub="Gera versão editorial" onClick={() => onPick('pdf')}/>
      <ActionRow icon={Icon.Map} label="Ver no mapa" sub="Trajetos por dia" onClick={() => onPick('map')}/>
      <ActionRow icon={Icon.Refresh} label="Duplicar roteiro" sub="Cria uma cópia" onClick={() => onPick('dup')}/>
    </div>
  </BottomSheet>
);
const ActionRow = ({ icon: Ic, label, sub, onClick }) => (
  <button onClick={onClick}
    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl active:bg-ink-100 transition-colors text-left">
    <div className="h-9 w-9 rounded-lg bg-ink-100 text-ink-900 flex items-center justify-center shrink-0">
      <Ic size={15}/>
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[14px] font-medium text-ink-900 leading-tight">{label}</div>
      <div className="text-[11.5px] text-ink-500 mt-0.5">{sub}</div>
    </div>
    <Icon.ChevronRight size={14} className="text-ink-400"/>
  </button>
);

window.PlanMobile = PlanMobile;
