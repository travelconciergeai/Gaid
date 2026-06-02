// Mobile Miles (Milhas) — points strategy in a tactile, single-thumb flow.
//
// Why this layout vs. desktop:
// • Desktop has a 2-column grid of programs + transfer simulator side-by-side.
// • Mobile leads with a HERO showing total points + R$ equivalent (the number
//   users actually want to see). Programs are a horizontal carousel. Transfer
//   simulator opens as a bottom sheet (action-focused, not always visible).
// • Opportunities (140% bonus, etc.) are vertical cards that take advantage
//   of full-width to communicate urgency.

const MilesMobile = ({ goTo, openChat }) => {
  const toast = useToast();
  const [transferOpen, setTransferOpen] = useState(false);
  const [programOpen, setProgramOpen] = useState(null);
  const programs = mockData.milesPrograms;
  const total = programs.reduce((s, p) => s + p.points, 0);

  return (
    <div className="relative pb-[112px]">
      <header className="px-5 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon.Logo size={22} className="text-ink-900"/>
          <span className="text-[15px] font-medium tracking-[-0.01em] text-ink-900">Gaid</span>
        </div>
        <button onClick={() => openChat('Como otimizar minhas milhas?')}
          className="h-10 w-10 rounded-full active:bg-ink-100 flex items-center justify-center text-ink-700">
          <Icon.Sparkles size={18}/>
        </button>
      </header>

      {/* Hero — total + equivalent */}
      <section className="px-5 pt-8 pb-7">
        <div className="label">Patrimônio em milhas</div>
        <div className="mt-3 flex items-baseline gap-2">
          <div className="text-[44px] tracking-[-0.03em] font-medium text-ink-900 leading-none mono">
            {total.toLocaleString('pt-BR')}
          </div>
          <div className="text-[14px] text-ink-500">pts</div>
        </div>
        <div className="text-[13.5px] text-ink-600 mt-2.5 leading-relaxed">
          ≈ <span className="font-medium text-ink-900">R$ 8.420</span> em emissões otimizadas
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-2 gap-2 mt-5">
          <Mini label="Bônus ativos" value="3" hint="até 30 nov"/>
          <Mini label="Gaid recomenda" value="4" hint="analisado hoje"/>
        </div>
      </section>

      {/* Action row */}
      <section className="px-5 pb-6">
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => setTransferOpen(true)} icon={Icon.Sparkles}>Transferir</Button>
          <Button variant="secondary" onClick={() => toast({ title: 'Programas sincronizados' })} icon={Icon.Refresh}>Sincronizar</Button>
        </div>
      </section>

      {/* Programs carousel */}
      <section className="pb-6">
        <div className="flex items-end justify-between mb-3 px-5">
          <div>
            <div className="label">Programas</div>
            <h2 className="text-[18px] font-medium tracking-[-0.01em] text-ink-900 mt-1">Saldos</h2>
          </div>
          <span className="text-[12px] text-ink-500">{programs.length} ativos</span>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pl-5 pr-5 pb-2 snap-x snap-mandatory">
          {programs.map(p => (
            <button key={p.id} onClick={() => setProgramOpen(p)}
              className="shrink-0 w-[220px] bg-white border-half rounded-2xl p-4 text-left snap-start active:scale-[.98] transition-transform">
              <div className="flex items-center gap-2.5 mb-3">
                <SmartImg seed={`miles-${p.id}`} tone={p.tone} w={100} h={100} className="h-10 w-10 rounded-lg"/>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-ink-900 truncate">{p.name}</div>
                  <div className="text-[10.5px] text-ink-500 mt-0.5 truncate">{p.trend}</div>
                </div>
              </div>
              <div className="text-[24px] font-medium text-ink-900 mono tracking-tight leading-none">
                {p.points.toLocaleString('pt-BR')}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className={p.expiring === '—' ? 'text-ink-500' : 'text-ink-900 font-medium'}>
                  {p.expiring === '—' ? 'sem expiração' : `Expira: ${p.expiring}`}
                </span>
                <Icon.ArrowRight size={11} className="text-ink-400"/>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Opportunities */}
      <section className="px-5 pt-2 pb-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="label">Gaid recomenda</div>
            <h2 className="text-[18px] font-medium tracking-[-0.01em] text-ink-900 mt-1">Oportunidades</h2>
          </div>
        </div>
        <div className="space-y-3">
          <OppCard
            tone="dark"
            tag="Acaba em 4 dias"
            title="Bônus 140% Gaid → TudoAzul"
            desc="Você tem 20.000 pts Gaid. Vira 48.000 milhas TudoAzul."
            delta="−R$ 1.220 na sua viagem a Portugal"
            cta="Aplicar agora"
            onCta={() => { setTransferOpen(true); }}/>
          <OppCard
            tone="light"
            tag="Bônus ativo"
            title="LP Black · 4× pontos em hotéis"
            desc="Reservar o Memmo Alfama pelo cartão Gaid dá 4× pts Latam."
            delta="+18.000 pts Latam Pass"
            cta="Ver hotel"/>
          <OppCard
            tone="light"
            tag="Voo doméstico"
            title="TAP: emissão LIS↔OPO"
            desc="4.500 milhas vs. R$ 380 pago."
            delta="Vale a pena no trecho doméstico"
            cta="Emitir"/>
        </div>
      </section>

      {/* Equivalência educacional */}
      <section className="px-5 pb-6">
        <div className="bg-white border-half rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Icon.Info size={15} className="text-ink-700 mt-0.5 shrink-0"/>
            <div className="text-[12.5px] text-ink-700 leading-relaxed">
              <span className="font-medium text-ink-900">Como a Gaid calcula:</span> média ponderada dos preços de emissão dos seus destinos favoritos, descontando taxas. Atualizado semanalmente.
            </div>
          </div>
        </div>
      </section>

      <TransferSheet open={transferOpen} onClose={() => setTransferOpen(false)} programs={programs}/>
      <ProgramSheet program={programOpen} onClose={() => setProgramOpen(null)}/>
    </div>
  );
};

// ============ Opportunity card ============
const OppCard = ({ tone, tag, title, desc, delta, cta, onCta }) => {
  const isDark = tone === 'dark';
  return (
    <div className={`rounded-2xl p-4 ${isDark ? 'bg-ink-900 text-paper' : 'bg-white border-half text-ink-900'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon.Sparkles size={12}/>
        <span className={`text-[10.5px] uppercase tracking-wider ${isDark ? 'text-paper/70' : 'text-ink-500'}`}>{tag}</span>
      </div>
      <div className="text-[15px] font-medium tracking-tight leading-snug">{title}</div>
      <div className={`text-[12.5px] mt-1.5 leading-relaxed ${isDark ? 'text-paper/80' : 'text-ink-600'}`}>{desc}</div>
      <div className={`text-[11.5px] mono mt-3 ${isDark ? 'text-paper/90' : 'text-ink-900 font-medium'}`}>{delta}</div>
      {cta && (
        <div className="mt-4">
          <Button size="sm" onClick={onCta}
            variant={isDark ? 'accent' : 'primary'}
            className={isDark ? '!bg-paper !text-ink-900 !w-full' : '!w-full'}>{cta}</Button>
        </div>
      )}
    </div>
  );
};

// ============ Transfer sheet ============
const TransferSheet = ({ open, onClose, programs }) => {
  const toast = useToast();
  const [amount, setAmount] = useState(20000);
  const [from, setFrom] = useState('gaid');
  const [to, setTo] = useState('tudo');
  const bonus = 2.4;
  const receive = Math.round(amount * bonus);
  const saved = Math.round(amount * 0.041);

  return (
    <BottomSheet open={open} onClose={onClose} title="Transferir milhas" height="85vh"
      footer={<Button icon={Icon.Sparkles} className="flex-1"
        onClick={() => { onClose(); toast({ title:`+${receive.toLocaleString('pt-BR')} milhas`, desc:'Bônus 140% aplicado', tone:'success' }); }}>
        Aplicar transferência
      </Button>}>
      <div className="px-5 pt-3 space-y-4">
        {/* From */}
        <div>
          <div className="label mb-2">De</div>
          <div className="bg-white border-half rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-ink-100 text-ink-900 flex items-center justify-center"><Icon.Wallet size={15}/></div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium text-ink-900">Pontos Gaid</div>
              <div className="text-[11.5px] text-ink-500 mt-0.5">124.300 pts disponíveis</div>
            </div>
            <Icon.ChevronDown size={14} className="text-ink-500"/>
          </div>
        </div>

        {/* Connector */}
        <div className="flex justify-center">
          <div className="h-9 w-9 rounded-full bg-ink-100 border-half flex items-center justify-center">
            <Icon.ArrowRight size={14} className="text-ink-700 rotate-90"/>
          </div>
        </div>

        {/* To */}
        <div>
          <div className="label mb-2">Para</div>
          <div className="space-y-1.5">
            {programs.map(p => (
              <button key={p.id} onClick={() => setTo(p.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors border
                            ${to === p.id ? 'bg-ink-900 text-paper border-ink-900' : 'bg-white text-ink-900 border-half active:bg-ink-50'}`}>
                <SmartImg seed={`miles-${p.id}`} tone={p.tone} w={100} h={100} className="h-9 w-9 rounded-md"/>
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-medium leading-tight">{p.name}</div>
                  <div className={`text-[10.5px] mt-0.5 ${to === p.id ? 'text-paper/70' : 'text-ink-500'}`}>{p.points.toLocaleString('pt-BR')} atuais</div>
                </div>
                {to === p.id && <Icon.Check size={14}/>}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="label">Quantidade</div>
            <div className="mono text-[13px] font-medium text-ink-900">{amount.toLocaleString('pt-BR')}</div>
          </div>
          <input type="range" min="1000" max="100000" step="500" value={amount}
            onChange={e => setAmount(+e.target.value)}
            className="w-full accent-ink-900"/>
          <div className="flex items-center justify-between text-[10.5px] text-ink-500 mt-1">
            <span>1.000</span>
            <span>100.000</span>
          </div>
        </div>

        {/* Result */}
        <div className="bg-ink-900 text-paper rounded-2xl p-4">
          <div className="text-[10.5px] uppercase tracking-wider text-paper/60">Você recebe (140% bônus)</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <div className="text-[28px] font-medium tracking-tight mono leading-none">{receive.toLocaleString('pt-BR')}</div>
            <div className="text-[12px] text-paper/70">milhas</div>
          </div>
          <div className="text-[12px] text-paper/80 mt-2">≈ economia R$ {saved.toLocaleString('pt-BR')} em emissões</div>
        </div>
      </div>
    </BottomSheet>
  );
};

// ============ Program detail sheet ============
const ProgramSheet = ({ program, onClose }) => {
  if (!program) return null;
  return (
    <BottomSheet open={!!program} onClose={onClose} title={program.name} height="62vh"
      footer={<Button icon={Icon.ArrowUpRight} variant="secondary" className="flex-1">Abrir programa</Button>}>
      <div className="px-5 pt-3">
        <SmartImg seed={`miles-cover-${program.id}`} tone={program.tone} w={800} h={400} className="h-[140px] rounded-2xl w-full"/>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Mini label="Saldo" value={program.points.toLocaleString('pt-BR')}/>
          <Mini label="Tendência" value={program.trend}/>
          <Mini label="Expiração" value={program.expiring === '—' ? 'sem prazo' : program.expiring}/>
          <Mini label="Equivalente" value={`R$ ${Math.round(program.points * 0.04).toLocaleString('pt-BR')}`}/>
        </div>
        <div className="mt-5 bg-ink-50 border-half rounded-xl p-4 text-[12.5px] text-ink-700 leading-relaxed">
          <Icon.Sparkles size={13} className="inline mr-1.5 text-ink-900 -mt-0.5"/>
          <span className="font-medium text-ink-900">Gaid tip:</span> use estes pontos em voos domésticos dentro dos próximos 6 meses pra extrair o melhor valor.
        </div>
      </div>
    </BottomSheet>
  );
};

const Mini = ({ label, value, hint }) => (
  <div className="bg-ink-50 rounded-xl px-3 py-2.5">
    <div className="label">{label}</div>
    <div className="text-[16px] font-medium text-ink-900 mt-0.5 truncate">{value}</div>
    {hint && <div className="text-[10.5px] text-ink-500 mt-0.5">{hint}</div>}
  </div>
);

window.MilesMobile = MilesMobile;
