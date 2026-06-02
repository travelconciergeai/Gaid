// Mobile Plans — pricing tiers, mobile-first.
//
// Why this layout vs. desktop:
// • Desktop shows 3 plan columns side-by-side. Mobile gets a vertical scroll
//   with each plan as a tall card the user can compare via swipe (segmented
//   "month / year" toggle on top with a Save-20% pill).
// • Recommended tier gets a subtle visual elevation (border + label) instead
//   of being inside a giant overlapping card.
// • FAQ becomes a collapsible accordion at the bottom.

const PlansMobile = ({ goTo, openChat }) => {
  const toast = useToast();
  const [billing, setBilling] = useState('month');

  return (
    <div className="relative pb-[112px]">
      <header className="px-5 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon.Logo size={22} className="text-ink-900"/>
          <span className="text-[15px] font-medium tracking-[-0.01em] text-ink-900">Gaid</span>
        </div>
        <button onClick={() => openChat('Tenho dúvidas sobre os planos')}
          className="h-10 w-10 rounded-full active:bg-ink-100 flex items-center justify-center text-ink-700">
          <Icon.Sparkles size={18}/>
        </button>
      </header>

      <section className="px-5 pt-8 pb-6">
        <div className="label">Planos Gaid</div>
        <h1 className="text-[28px] tracking-[-0.025em] font-medium text-ink-900 leading-[1.06] mt-2">
          Como você quer <span className="serif-i">viajar.</span>
        </h1>
        <p className="text-[13px] text-ink-600 mt-3 leading-relaxed">
          Comece grátis. Cresça quando quiser. Cancelamento simples, sem letrinhas.
        </p>
      </section>

      {/* Billing toggle */}
      <section className="px-5 pb-6">
        <div className="bg-ink-100 rounded-2xl p-1 inline-flex w-full">
          <button onClick={() => setBilling('month')}
            className={`flex-1 h-10 rounded-xl text-[13px] font-medium transition-all
                       ${billing === 'month' ? 'bg-paper text-ink-900 shadow-soft' : 'text-ink-600'}`}>
            Mensal
          </button>
          <button onClick={() => setBilling('year')}
            className={`flex-1 h-10 rounded-xl text-[13px] font-medium transition-all inline-flex items-center justify-center gap-2
                       ${billing === 'year' ? 'bg-paper text-ink-900 shadow-soft' : 'text-ink-600'}`}>
            Anual
            <span className="text-[10px] px-1.5 h-4 rounded-full bg-ink-900 text-paper flex items-center font-medium">−20%</span>
          </button>
        </div>
      </section>

      {/* Plans */}
      <section className="px-5 space-y-4">
        {mockData.plans.map(p => (
          <PlanCard key={p.id} plan={p} billing={billing}
            onSubscribe={() => toast({ title: `${p.cta} ✓`, desc: 'Demonstração', tone: 'success' })}/>
        ))}
      </section>

      {/* FAQ */}
      <section className="px-5 pt-10 pb-6">
        <div className="label mb-3">Dúvidas comuns</div>
        <div className="bg-white border-half rounded-2xl divide-y hairline overflow-hidden">
          <FAQRow q="Posso trocar de plano depois?" a="A qualquer momento. Migrações são proporcionais — você não paga em duplicidade."/>
          <FAQRow q="O que é um concierge humano?" a="Um expert da sua região com nome, telefone e responsabilidade pela sua viagem. Não é call center."/>
          <FAQRow q="Funciona para empresas?" a="Sim, temos Gaid Business com gestão de viagens corporativas e relatórios fiscais."/>
          <FAQRow q="Posso cancelar?" a="Cancela com um clique no app. Mantém o que já pagou no mês."/>
        </div>
      </section>

      {/* Concierge talk CTA */}
      <section className="px-5 pb-8">
        <button onClick={() => openChat('Tenho dúvidas sobre os planos')}
          className="w-full bg-ink-900 text-paper rounded-2xl p-5 flex items-center gap-4 active:scale-[.99] transition-transform">
          <div className="h-10 w-10 rounded-xl bg-paper/10 flex items-center justify-center shrink-0">
            <Icon.Sparkles size={16}/>
          </div>
          <div className="flex-1 text-left">
            <div className="text-[14px] font-medium">Não decidiu ainda?</div>
            <div className="text-[12px] text-paper/70 mt-0.5">A Gaid te ajuda a escolher o plano certo.</div>
          </div>
          <Icon.ArrowRight size={14} className="shrink-0"/>
        </button>
      </section>
    </div>
  );
};

// ============ Plan card ============
const PlanCard = ({ plan, billing, onSubscribe }) => {
  const isHighlight = plan.highlight;
  const yearPrice = plan.price === 'Grátis' ? 'Grátis' :
    `R$ ${Math.round(parseInt(plan.price.replace(/\D/g,'')) * 12 * 0.8).toLocaleString('pt-BR')}`;
  const displayPrice = billing === 'year' ? yearPrice : plan.price;
  const displayPeriod = billing === 'year' && plan.period ? '/ano' : plan.period;

  return (
    <div className={`relative rounded-3xl p-6 transition-all
                    ${isHighlight ? 'bg-ink-900 text-paper border-half border-ink-900' :
                      plan.id === 'signature' ? 'bg-white border-half ring-1 ring-ink-200' :
                      'bg-white border-half'}`}>
      {isHighlight && (
        <div className="absolute -top-3 left-6">
          <div className="h-6 px-2.5 rounded-full bg-paper text-ink-900 border-half flex items-center gap-1.5 text-[10.5px] font-medium tracking-[-0.005em]">
            <Icon.Sparkles size={10}/>{plan.tag}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-baseline justify-between mb-2">
        <div className={`text-[20px] font-medium tracking-tight ${isHighlight ? 'text-paper' : 'text-ink-900'}`}>{plan.name}</div>
        {!isHighlight && plan.id !== 'curiosa' && (
          <span className={`text-[10.5px] uppercase tracking-wider font-medium ${plan.id === 'signature' ? 'text-ink-700' : 'text-ink-500'}`}>{plan.tag}</span>
        )}
      </div>
      <div className={`text-[12.5px] ${isHighlight ? 'text-paper/70' : 'text-ink-500'} mb-5`}>{plan.desc}</div>

      {/* Price */}
      <div className="flex items-baseline gap-1 mb-5">
        <div className={`text-[42px] tracking-[-0.025em] font-medium leading-none ${isHighlight ? 'text-paper' : 'text-ink-900'}`}>{displayPrice}</div>
        {displayPeriod && <div className={`text-[13px] ${isHighlight ? 'text-paper/60' : 'text-ink-500'}`}>{displayPeriod}</div>}
      </div>

      {/* Features */}
      <ul className="space-y-2 mb-6">
        {plan.features.map(f => (
          <li key={f} className={`flex items-start gap-2 text-[13px] ${isHighlight ? 'text-paper/90' : 'text-ink-800'}`}>
            <Icon.Check size={13} className={`mt-0.5 shrink-0 ${isHighlight ? 'text-paper' : 'text-ink-900'}`}/>{f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Button
        variant={isHighlight ? 'accent' : 'primary'}
        className={`w-full ${isHighlight ? '!bg-paper !text-ink-900' : ''}`}
        onClick={onSubscribe}>
        {plan.cta}
      </Button>
    </div>
  );
};

// ============ FAQ ============
const FAQRow = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-ink-50 transition-colors">
        <div className="flex-1 text-[13.5px] font-medium text-ink-900">{q}</div>
        <div className={`h-7 w-7 rounded-full bg-ink-100 flex items-center justify-center transition-transform ${open ? 'rotate-180' : ''}`}>
          <Icon.ChevronDown size={13}/>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 text-[12.5px] text-ink-700 leading-relaxed">{a}</div>
      )}
    </div>
  );
};

window.PlansMobile = PlansMobile;
