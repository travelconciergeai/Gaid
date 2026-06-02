// Plans — pricing. Production: plans come from tripApi (empty-first). No mockData.

const PlansScreen = ({ setRoute }) => {
  const toast = useToast();
  const q = useCatalog('plans');
  return (
    <div className="min-h-screen">
      <Topbar subtitle="Gaid · Planos" title="Como você quer viajar com a Gaid"
        right={<Button variant="ghost">Falar com o time</Button>}/>

      <div className="px-10 pb-16">
        <div className="text-center max-w-[640px] mx-auto mb-10">
          <p className="text-[15px] text-ink-600 leading-relaxed">
            Comece grátis. <span className="serif-i text-ink-700">Cresça quando quiser.</span> Cancelamento simples,
            sem letrinhas, e o concierge da Gaid cuidando do que você não tem tempo de fazer.
          </p>
        </div>

        <Async
          query={q}
          skeleton={<div className="grid grid-cols-3 gap-5 max-w-[1100px] mx-auto">{[0,1,2].map(i=><CardSkeleton key={i}/>)}</div>}
          empty={<EmptyState icon={Icon.Award} eyebrow="Planos"
            title="Os planos aparecem aqui quando o catálogo carregar"
            desc="A Gaid está pronta para receber os planos do backend — nada é exibido antes de existir de verdade."/>}>
          {(plans) => (
            <div className="grid grid-cols-3 gap-5 max-w-[1100px] mx-auto">
              {plans.map(p => (
                <Card key={p.id} className={`p-7 flex flex-col relative ${p.highlight ? 'ring-2 ring-ink-900 shadow-lift' : ''}`}>
                  {p.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Tag tone="ink"><Icon.Sparkles size={11}/> {p.tag}</Tag></div>
                  )}
                  <div className="flex items-baseline justify-between">
                    <div className="text-[18px] font-medium text-ink-900">{orTBD(p.name)}</div>
                    {!p.highlight && <Tag tone={p.id==='signature'?'gold':'ink'}>{orTBD(p.tag)}</Tag>}
                  </div>
                  <div className="text-[12px] text-ink-500 mt-1">{orTBD(p.desc)}</div>
                  <div className="mt-5 flex items-baseline gap-1">
                    <div className="text-[40px] tracking-tight font-medium text-ink-900 leading-none">{fmtMoney(p.price)}</div>
                    {p.period && <div className="text-[14px] text-ink-500">{p.period}</div>}
                  </div>
                  <ul className="space-y-2.5 mt-6 flex-1">
                    {(p.features || []).map(f => (
                      <li key={f} className="flex items-start gap-2 text-[13px] text-ink-800">
                        <Icon.Check size={14} className="text-sage-700 mt-0.5 shrink-0"/> {f}
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-7"
                    variant={p.highlight?'primary':p.id==='signature'?'accent':'secondary'}
                    onClick={() => toast({title:`${p.cta || 'Selecionado'} ✓`, tone:'success', desc:'Pronto para o backend confirmar.'})}>
                    {orTBD(p.cta, 'Escolher')}
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </Async>

        <div className="max-w-[1100px] mx-auto mt-10">
          <Card className="p-7 grid grid-cols-[1fr_1fr_1fr_1fr] gap-6">
            <FAQ q="Posso trocar de plano depois?" a="Sim, a qualquer momento. Migrações são proporcionais."/>
            <FAQ q="Concierge humano significa o quê?" a="Um expert da sua região com nome, telefone e responsabilidade pela sua viagem."/>
            <FAQ q="Funciona para empresas?" a="Sim — temos Gaid Business com gestão de viagens corporativas."/>
            <FAQ q="Posso cancelar?" a="Sem letrinhas. Cancela com um clique, mantém o que já pagou no mês."/>
          </Card>
        </div>
      </div>
    </div>
  );
};

const FAQ = ({ q, a }) => (
  <div>
    <div className="text-[13px] font-medium text-ink-900">{q}</div>
    <div className="text-[12.5px] text-ink-600 mt-1.5 leading-relaxed">{a}</div>
  </div>
);

window.PlansScreen = PlansScreen;
