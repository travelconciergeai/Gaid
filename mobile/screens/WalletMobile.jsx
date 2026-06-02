// Mobile Wallet — concierge wallet, not a bank app.
//
// Why this layout vs. desktop:
// • Desktop shows a fanned-card stack with details next to it. Mobile gets a
//   single immersive card stack at the top (Apple Wallet inspired but original)
//   with horizontal swipe to switch cards, and detail content below adapting
//   to the selected card.
// • "Melhor cartão por compra" rules condense to a list of tappable rows.
// • Active benefits surface as a 2-column tactile grid.
// • Gaid-pulse card (transferência bonus) lives as a sticky CTA banner.

const WalletMobile = ({ goTo, openChat }) => {
  const toast = useToast();
  const [activeCard, setActiveCard] = useState(mockData.cards[0].id);
  const [openBenefit, setOpenBenefit] = useState(null);
  const [openCard, setOpenCard] = useState(null);
  const card = mockData.cards.find(c => c.id === activeCard);

  return (
    <div className="relative pb-[112px]">
      <header className="px-5 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon.Logo size={22} className="text-ink-900"/>
          <span className="text-[15px] font-medium tracking-[-0.01em] text-ink-900">Gaid</span>
        </div>
        <button onClick={() => openChat('Quero dicas pra usar melhor minha wallet')}
          className="h-10 w-10 rounded-full active:bg-ink-100 flex items-center justify-center text-ink-700">
          <Icon.Plus size={20}/>
        </button>
      </header>

      <section className="px-5 pt-8 pb-5">
        <div className="label">Gaid Wallet</div>
        <h1 className="text-[28px] tracking-[-0.025em] font-medium text-ink-900 leading-[1.06] mt-2">
          Sua <span className="serif-i">carteira de viagem.</span>
        </h1>
        <p className="text-[13px] text-ink-600 mt-3 leading-relaxed">
          A IA escolhe o cartão certo em cada compra. Você só viaja.
        </p>
      </section>

      {/* Card carousel */}
      <CardCarousel cards={mockData.cards} activeId={activeCard} setActive={setActiveCard} onOpen={(c) => setOpenCard(c)}/>

      {/* Card stats */}
      <section className="px-5 pt-5">
        <div className="bg-white border-half rounded-2xl divide-y hairline overflow-hidden">
          <CardStat icon={Icon.Award} label="Categoria" value={card.type}/>
          <CardStat icon={Icon.Users} label="Lounges" value={card.lounges}/>
          <CardStat icon={Icon.Shield} label="Seguro" value={card.insurance}/>
          <CardStat icon={Icon.Sparkles} label="Melhor uso" value={card.best}/>
        </div>
      </section>

      {/* Gaid-pulse: smart transfer */}
      <section className="px-5 pt-5">
        <div className="bg-ink-900 text-paper rounded-3xl p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-paper/10 flex items-center justify-center shrink-0">
              <Icon.Sparkles size={16}/>
            </div>
            <div className="flex-1">
              <div className="text-[10.5px] uppercase tracking-wider text-paper/60">Otimização ao vivo</div>
              <div className="text-[15px] font-medium mt-1 leading-snug">Transferir 20k pts → TudoAzul com 140% bônus</div>
              <div className="text-[12px] text-paper/80 mt-1.5 leading-relaxed">Acaba em 4 dias · economia estimada R$ 1.220 na sua viagem.</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
            <Button variant="accent" className="!bg-paper !text-ink-900 w-full"
              onClick={() => toast({ title: 'Transferência aplicada', desc: '+28.000 milhas', tone: 'success' })}>
              Transferir agora
            </Button>
            <Button variant="ghost" className="!text-paper" onClick={() => toast({ title: 'Avisaremos antes de expirar' })}>
              Depois
            </Button>
          </div>
        </div>
      </section>

      {/* Best card per category */}
      <section className="px-5 pt-7">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="label">Para esta viagem</div>
            <h2 className="text-[18px] font-medium tracking-[-0.01em] text-ink-900 mt-1">Melhor cartão por compra</h2>
          </div>
        </div>
        <div className="bg-white border-half rounded-2xl divide-y hairline overflow-hidden">
          <BestRow icon={Icon.Plane}    label="Voos TAP"           card="TAP Miles & Go Infinite" perk="3× milhas + seguro"/>
          <BestRow icon={Icon.Bed}      label="Hotéis Collection"  card="Gaid Signature"          perk="5× pts + upgrade"/>
          <BestRow icon={Icon.Utensils} label="Restaurantes"       card="Gaid Signature"          perk="5× pts + concierge"/>
          <BestRow icon={Icon.Ticket}   label="Passeios"           card="Latam Pass Black"        perk="4× pts + seguro"/>
          <BestRow icon={Icon.Coffee}   label="Dia a dia Europa"   card="TAP Miles & Go"          perk="2× milhas · sem IOF"/>
        </div>
      </section>

      {/* Active benefits */}
      <section className="px-5 pt-7">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="label">Gaid Benefícios</div>
            <h2 className="text-[18px] font-medium tracking-[-0.01em] text-ink-900 mt-1">Ativos agora</h2>
          </div>
          <Tag tone="ink">{mockData.benefits.length} ativos</Tag>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {mockData.benefits.map(b => {
            const Ic = Icon[b.icon] || Icon.Sparkles;
            return (
              <button key={b.id} onClick={() => setOpenBenefit(b)}
                className="bg-white border-half rounded-2xl p-4 text-left active:bg-ink-50 transition-colors">
                <div className="h-9 w-9 rounded-lg bg-ink-100 text-ink-900 flex items-center justify-center mb-3"><Ic size={14}/></div>
                <div className="text-[13px] font-medium text-ink-900 leading-tight">{b.title}</div>
                <div className="text-[11px] text-ink-500 mt-1 line-clamp-2">{b.desc}</div>
                <div className="text-[10.5px] text-ink-700 mt-2.5 font-medium uppercase tracking-wider">{b.state}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Benefit sheet */}
      <BenefitSheet benefit={openBenefit} onClose={() => setOpenBenefit(null)}/>
      {/* Card detail sheet */}
      <CardDetailSheet card={openCard} onClose={() => setOpenCard(null)}/>
    </div>
  );
};

// ============ Card carousel ============
const CardCarousel = ({ cards, activeId, setActive, onOpen }) => {
  const scrollerRef = useRef(null);
  const idx = cards.findIndex(c => c.id === activeId);

  return (
    <section className="pb-2">
      <div ref={scrollerRef}
        className="flex gap-3 overflow-x-auto no-scrollbar pl-5 pr-5 pb-3 snap-x snap-mandatory">
        {cards.map((c) => (
          <button key={c.id}
            onClick={() => { setActive(c.id); if (c.id === activeId) onOpen(c); }}
            className={`shrink-0 snap-center active:scale-[.97] transition-transform`}>
            <CardObject card={c} active={c.id === activeId}/>
          </button>
        ))}
      </div>
      {/* Dots */}
      <div className="flex justify-center gap-1.5">
        {cards.map((c, i) => (
          <button key={c.id} onClick={() => setActive(c.id)}
            className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-ink-900' : 'w-1.5 bg-ink-300'}`}/>
        ))}
      </div>
    </section>
  );
};

const CardObject = ({ card, active }) => {
  const tones = {
    ink:   'bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 text-paper',
    cool:  'bg-gradient-to-br from-ink-700 via-ink-600 to-ink-900 text-paper',
    coral: 'bg-gradient-to-br from-ink-800 via-ink-700 to-ink-900 text-paper',
  }[card.tone] || 'bg-ink-900 text-paper';
  return (
    <div className={`w-[280px] h-[170px] rounded-2xl ${tones} p-5 flex flex-col shadow-lift relative overflow-hidden
                    ${active ? '' : 'opacity-70 scale-95'} transition-all`}>
      <svg className="absolute inset-0 opacity-20" viewBox="0 0 280 170" preserveAspectRatio="none">
        <path d="M-20 150 Q 80 60 150 100 T 320 40" stroke="currentColor" strokeWidth="0.6" fill="none"/>
        <path d="M-20 170 Q 80 80 150 120 T 320 60" stroke="currentColor" strokeWidth="0.6" fill="none"/>
        <path d="M-20 190 Q 80 100 150 140 T 320 80" stroke="currentColor" strokeWidth="0.6" fill="none"/>
      </svg>
      <div className="flex items-start justify-between relative">
        <div>
          <div className="text-[8.5px] tracking-[0.2em] uppercase opacity-70">Gaid</div>
          <div className="text-[13px] font-medium tracking-tight mt-0.5">{card.brand}</div>
        </div>
        <div className="text-[8.5px] tracking-wider uppercase opacity-70">{card.type}</div>
      </div>
      <div className="mt-auto flex items-end justify-between relative">
        <div className="mono text-[12px] tracking-[0.18em]">•••• {card.last4}</div>
        <div className="text-right">
          <div className="text-[8px] opacity-60 uppercase tracking-wider">pts/mês</div>
          <div className="mono text-[12px] tracking-tight mt-0.5">+{(8420 + card.last4.charCodeAt(0) * 10).toLocaleString('pt-BR')}</div>
        </div>
      </div>
    </div>
  );
};

const CardStat = ({ icon: Ic, label, value }) => (
  <div className="px-4 py-3 flex items-center gap-3">
    <div className="h-9 w-9 rounded-lg bg-ink-100 text-ink-700 flex items-center justify-center shrink-0"><Ic size={15}/></div>
    <div className="flex-1 min-w-0">
      <div className="text-[10px] text-ink-500 uppercase tracking-wider">{label}</div>
      <div className="text-[13.5px] font-medium text-ink-900 mt-0.5 truncate">{value}</div>
    </div>
  </div>
);

const BestRow = ({ icon: Ic, label, card, perk }) => (
  <div className="px-4 py-3 flex items-center gap-3 active:bg-ink-50 transition-colors">
    <div className="h-9 w-9 rounded-lg bg-ink-100 text-ink-700 flex items-center justify-center shrink-0"><Ic size={15}/></div>
    <div className="flex-1 min-w-0">
      <div className="text-[13px] font-medium text-ink-900 leading-tight truncate">{label}</div>
      <div className="text-[11px] text-ink-500 mt-0.5 truncate">{perk}</div>
    </div>
    <div className="text-[10.5px] text-ink-700 text-right shrink-0 font-medium uppercase tracking-wider max-w-[110px] line-clamp-2 leading-tight">{card}</div>
  </div>
);

// ============ Benefit sheet ============
const BenefitSheet = ({ benefit, onClose }) => {
  if (!benefit) return null;
  const Ic = Icon[benefit.icon] || Icon.Sparkles;
  return (
    <BottomSheet open={!!benefit} onClose={onClose} height="68vh"
      footer={<Button icon={Icon.ArrowUpRight} className="flex-1">Acionar benefício</Button>}>
      <div className="px-5 pt-3">
        <SmartImg seed={`benefit-${benefit.id}`} tone="warm" w={800} h={400} className="h-[140px] rounded-2xl w-full"/>
      </div>
      <div className="px-5 pt-4">
        <div className="h-11 w-11 rounded-xl bg-ink-100 text-ink-900 flex items-center justify-center"><Ic size={18}/></div>
        <div className="text-[20px] font-medium tracking-tight text-ink-900 mt-3">{benefit.title}</div>
        <p className="text-[13.5px] text-ink-700 mt-2 leading-relaxed">{benefit.desc}</p>

        <div className="mt-4 bg-ink-900 text-paper rounded-2xl px-4 py-3 flex items-center gap-2">
          <Icon.Check size={13}/>
          <span className="text-[12.5px]">{benefit.state}</span>
        </div>

        <div className="mt-4 bg-ink-50 border-half rounded-xl p-4 text-[12.5px] text-ink-700 leading-relaxed">
          A Gaid cuida de tudo automaticamente. Você não precisa enviar nenhum comprovante — se acontecer algo, a Gaid já está dentro.
        </div>
      </div>
    </BottomSheet>
  );
};

// ============ Card detail sheet ============
const CardDetailSheet = ({ card, onClose }) => {
  if (!card) return null;
  return (
    <BottomSheet open={!!card} onClose={onClose} height="80vh" title={card.brand}
      footer={<Button icon={Icon.Settings} variant="secondary" className="flex-1">Configurações do cartão</Button>}>
      <div className="px-5 pt-3 pb-2">
        <div className="flex justify-center">
          <CardObject card={card} active/>
        </div>
      </div>
      <div className="px-5 pt-2">
        <div className="grid grid-cols-2 gap-2">
          <DetailTile label="Final" value={`•• ${card.last4}`}/>
          <DetailTile label="Categoria" value={card.type}/>
          <DetailTile label="Lounges" value={card.lounges}/>
          <DetailTile label="Seguro" value={card.insurance}/>
        </div>
      </div>
      <div className="px-5 pt-5 pb-6">
        <div className="label mb-2">Benefícios deste cartão</div>
        <ul className="space-y-1.5 text-[13px] text-ink-700">
          {card.perks.map(p => (
            <li key={p} className="flex items-center gap-2"><Icon.Check size={12} className="text-ink-900"/>{p}</li>
          ))}
        </ul>
        <div className="mt-5 bg-ink-50 border-half rounded-xl p-4">
          <div className="label">Melhor uso</div>
          <div className="text-[13.5px] font-medium text-ink-900 mt-1">{card.best}</div>
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

window.WalletMobile = WalletMobile;
