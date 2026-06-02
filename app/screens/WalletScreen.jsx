// Wallet — cards, miles overview, benefits. Must NOT feel like a bank.
// Style: editorial premium, generous spacing, sophisticated cards as objects.

const WalletScreen = ({ setRoute }) => {
  const acct = useAccount();
  const cards = acct.cards || [];
  const benefits = acct.benefits || [];
  const [activeCard, setActiveCard] = useState(cards[0]?.id);
  const [openBenefit, setOpenBenefit] = useState(null);
  const card = cards.find(c => c.id === activeCard) || cards[0];
  const toast = useToast();

  if (cards.length === 0) {
    return (
      <div className="min-h-screen">
        <Topbar subtitle="Gaid Wallet" title="Sua carteira de viagem"
          right={<Button variant="secondary" icon={Icon.Plus}>Adicionar cartão</Button>}/>
        <div className="px-10 pb-16">
          <EmptyState
            icon={Icon.Wallet}
            eyebrow="Carteira vazia"
            title="Adicione seus cartões e a Gaid cuida do resto"
            desc="Conecte seus cartões de viagem e, em cada gasto da viagem, a Gaid indica qual usar para render mais pontos, milhas e seguros — automaticamente."
            primary={<Button icon={Icon.Plus} onClick={() => toast({ title: 'Adicionar cartão', desc: 'Em breve você conecta seus cartões aqui.' })}>Adicionar primeiro cartão</Button>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Topbar
        subtitle="Gaid Wallet"
        title="Sua carteira de viagem"
        right={
          <>
            <Button variant="ghost" icon={Icon.Refresh}>Sincronizar</Button>
            <Button variant="secondary" icon={Icon.Plus}>Adicionar cartão</Button>
          </>
        }
      />

      <div className="px-10 pb-12 grid grid-cols-[1.1fr_1fr] gap-6">
        {/* ---- left: cards stack + details ---- */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <SectionHeader eyebrow="Seus cartões" title={`${cards.length} ${cards.length === 1 ? 'cartão' : 'cartões'} · 1 ativo na viagem`}/>
              <Tag tone="brand"><Icon.Sparkles size={12}/> Otimizado pela IA</Tag>
            </div>

            {/* fanned cards display */}
            <div className="relative h-[280px] flex items-end justify-center mb-2">
              {cards.map((c, i) => {
                const active = c.id === activeCard;
                const offset = (i - cards.findIndex(x => x.id === activeCard)) * 36;
                const isLast = i === cards.length - 1;
                return (
                  <button key={c.id} onClick={() => setActiveCard(c.id)}
                    style={{ transform: `translateX(${offset}px) translateY(${active ? 0 : 32}px) rotate(${active ? 0 : (offset/8)}deg)`, zIndex: active ? 10 : 5 - Math.abs(i) }}
                    className="absolute transition-all duration-300 ease-out">
                    <CardObject card={c} active={active}/>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-center gap-1.5 mt-4">
              {cards.map(c => (
                <button key={c.id} onClick={() => setActiveCard(c.id)}
                  className={`h-1.5 rounded-full transition-all ${c.id === activeCard ? 'w-6 bg-ink-900' : 'w-1.5 bg-ink-300 hover:bg-ink-400'}`}/>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="label">Para esta viagem · Portugal</div>
                <div className="text-[19px] font-medium tracking-tight text-ink-900 mt-1">Melhor cartão por compra</div>
                <div className="text-[12.5px] text-ink-500 mt-1">A Gaid escolhe o cartão ideal para cada gasto da sua viagem.</div>
              </div>
              <Button variant="ghost" size="sm" iconRight={Icon.ArrowRight}>Regras</Button>
            </div>
            <div className="space-y-2">
              <BestRow icon={Icon.Plane}    label="Voos (TAP/Star Alliance)"  card="TAP Miles & Go · Infinite"  perk="3× milhas TAP · seguro inclusa"/>
              <BestRow icon={Icon.Bed}      label="Hotéis Gaid Collection"    card="Gaid Signature"             perk="5× pts · upgrade automático"/>
              <BestRow icon={Icon.Utensils} label="Restaurantes premium"      card="Gaid Signature"             perk="5× pts · concierge reservas"/>
              <BestRow icon={Icon.Ticket}   label="Passeios e experiências"   card="Latam Pass Black"           perk="4× pts · seguro evento"/>
              <BestRow icon={Icon.Coffee}   label="Compras do dia a dia"      card="TAP Miles & Go · Infinite"  perk="2× milhas · sem IOF Europa"/>
            </div>
          </Card>
        </div>

        {/* ---- right: details + benefits ---- */}
        <div className="space-y-6">
          {/* Active card detail */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="label">Cartão selecionado</div>
                <div className="text-[19px] font-medium tracking-tight text-ink-900 mt-1">{card.brand}</div>
              </div>
              <Tag tone="gold"><Icon.Award size={11}/> {card.type}</Tag>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <Stat label="Final" value={`••${card.last4}`} hint=""/>
              <Stat label="Lounges" value="12/yr" hint={card.lounges}/>
              <Stat label="Seguro" value="Premium" hint={card.insurance} tone="sage"/>
            </div>
            <div className="border-t hairline pt-4">
              <div className="label mb-2">Benefícios deste cartão</div>
              <ul className="space-y-1.5">
                {card.perks.map(p => (
                  <li key={p} className="text-[13px] text-ink-800 flex items-center gap-2">
                    <Icon.Check size={13} className="text-sage-700"/> {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t hairline pt-4 mt-4">
              <div className="label mb-2">Melhor uso</div>
              <div className="text-[13px] text-ink-800">{card.best}</div>
            </div>
          </Card>

          {/* Benefits grid */}
          <Card className="p-6">
            <SectionHeader eyebrow="Gaid · Benefícios" title="O que está ativo agora"/>
            <div className="grid grid-cols-2 gap-3">
              {benefits.map(b => {
                const Ic = Icon[b.icon] || Icon.Sparkles;
                return (
                  <button key={b.id} onClick={() => setOpenBenefit(b)}
                    className="text-left bg-white border hairline rounded-xl p-4 card-h">
                    <div className="h-9 w-9 rounded-lg bg-ink-100 text-ink-700 flex items-center justify-center mb-3"><Ic size={15}/></div>
                    <div className="text-[13.5px] font-medium text-ink-900">{b.title}</div>
                    <div className="text-[11.5px] text-ink-500 mt-0.5 line-clamp-2">{b.desc}</div>
                    <div className="text-[11px] text-sage-700 mt-2 font-medium">{b.state}</div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-ink-900 to-ink-800 text-paper border-ink-900">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-paper/10 flex items-center justify-center"><Icon.Sparkles size={18}/></div>
              <div className="flex-1">
                <div className="text-[11px] tracking-wider uppercase opacity-70">Otimização ao vivo</div>
                <div className="text-[16px] font-medium mt-1">Transferir 20.000 pts Gaid → TudoAzul agora</div>
                <div className="text-[12.5px] opacity-80 mt-1">Bônus de 140% acaba em 4 dias. Vira 48.000 milhas — economia estimada R$ 1.220 nesta viagem.</div>
                <div className="mt-4 flex items-center gap-2">
                  <Button variant="accent" onClick={() => toast({title:'Transferência iniciada', desc:'140% bônus aplicado', tone:'success'})}>Transferir agora</Button>
                  <Button variant="ghost" className="text-paper hover:bg-paper/10">Depois</Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Benefit detail modal */}
      <Modal open={!!openBenefit} onClose={() => setOpenBenefit(null)} title={openBenefit?.title || ''}
        footer={<><Button variant="ghost" onClick={() => setOpenBenefit(null)}>Fechar</Button>
                   <Button icon={Icon.ArrowUpRight}>Acionar</Button></>}>
        {openBenefit && (
          <div className="space-y-4">
            <Placeholder tone="cool" label={openBenefit.title} className="h-[140px] rounded-xl"/>
            <div className="text-[14px] text-ink-800 leading-relaxed">{openBenefit.desc}</div>
            <div className="bg-sage-50 border border-sage-50 rounded-xl p-3 flex items-center gap-2 text-[13px] text-sage-700">
              <Icon.Check size={14}/> {openBenefit.state}
            </div>
            <div className="bg-ink-50 rounded-xl p-3 text-[12.5px] text-ink-600">
              Gaid cuida de tudo automaticamente. Você não precisa enviar nenhum comprovante — se acontecer algo, a Gaid já está dentro.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const CardObject = ({ card, active }) => {
  const tones = {
    ink:   'bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 text-paper',
    cool:  'bg-gradient-to-br from-brand-700 via-brand-600 to-brand-900 text-white',
    coral: 'bg-gradient-to-br from-coral-700 via-coral-500 to-coral-700 text-white',
  }[card.tone] || 'bg-ink-900 text-paper';
  return (
    <div className={`w-[380px] h-[230px] rounded-2xl ${tones} p-6 flex flex-col shadow-pop relative overflow-hidden
                     ${active ? '' : 'opacity-80'}`}>
      {/* abstract texture lines */}
      <svg className="absolute inset-0 opacity-20" viewBox="0 0 380 230" preserveAspectRatio="none">
        <path d="M-20 200 Q 100 80 200 140 T 420 60" stroke="currentColor" strokeWidth="0.8" fill="none"/>
        <path d="M-20 230 Q 100 110 200 170 T 420 90" stroke="currentColor" strokeWidth="0.8" fill="none"/>
        <path d="M-20 260 Q 100 140 200 200 T 420 120" stroke="currentColor" strokeWidth="0.8" fill="none"/>
      </svg>

      <div className="flex items-start justify-between relative">
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase opacity-70">Gaid</div>
          <div className="text-[15px] font-medium tracking-tight mt-1">{card.brand}</div>
        </div>
        <div className="text-[10px] tracking-wider uppercase opacity-70">{card.type}</div>
      </div>

      <div className="mt-auto flex items-end justify-between relative">
        <div className="mono text-[15px] tracking-[0.2em]">•••• {card.last4}</div>
        <div className="text-right">
          <div className="text-[9.5px] opacity-60 uppercase tracking-wider">Pontos / mês</div>
          <div className="mono text-[14px] tracking-tight">+{(8420 + card.last4.charCodeAt(0)*10).toLocaleString('pt-BR')}</div>
        </div>
      </div>
    </div>
  );
};

const BestRow = ({ icon: Ic, label, card, perk }) => (
  <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-ink-50 transition-colors">
    <div className="h-9 w-9 rounded-lg bg-ink-100 text-ink-700 flex items-center justify-center shrink-0"><Ic size={15}/></div>
    <div className="flex-1 min-w-0">
      <div className="text-[13px] text-ink-900 font-medium">{label}</div>
      <div className="text-[11.5px] text-ink-500">{perk}</div>
    </div>
    <div className="text-[12px] text-ink-700 text-right shrink-0 max-w-[180px]">
      <span className="font-medium">{card}</span>
    </div>
  </div>
);

window.WalletScreen = WalletScreen;
