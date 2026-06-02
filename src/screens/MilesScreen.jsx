import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '../components/icons.jsx';
import { Placeholder, Button, Tag, Card, Modal, Drawer, SmartImg, Portrait, useToast, Topbar, SectionHeader, Stat, TabRow, OptimizeMenu, AddToTripDrawer } from '../components/ui.jsx';
import { EmptyState, EmptyInline } from './EmptyStates.jsx';
import { Async, CardSkeleton, CatalogCarousel, Carousel, Skeleton, ErrorState, CarouselSkeleton } from '../core/states.jsx';
import { useAccount, useTrips, useCatalog, deriveTraits, profileCompletion } from '../core/store.jsx';
import { TBD, has, orTBD, fmtDuration, fmtMoney } from '../core/contracts.jsx';
// Miles — programs + transfer planner + opportunities.

const MilesScreen = ({ setRoute }) => {
  const acct = useAccount();
  const toast = useToast();
  const [amount, setAmount] = useState(20000);
  const [from, setFrom] = useState('gaid');
  const [to, setTo] = useState('tudo');
  const programs = acct.milesPrograms || [];
  const total = programs.reduce((s, p) => s + p.points, 0);

  if (programs.length === 0) {
    return (
      <div className="min-h-screen">
        <Topbar subtitle="Gaid · Milhas" title="Otimizador de milhas"
          right={<Button variant="secondary" icon={Icon.Refresh}>Sincronizar programas</Button>}/>
        <div className="px-10 pb-16">
          <EmptyState
            icon={Icon.Coins}
            eyebrow="Nenhum programa conectado"
            title="Junte suas milhas e a Gaid acha as melhores trocas"
            desc="Conecte seus programas de fidelidade para ver tudo num só lugar. A Gaid monitora bônus de transferência, expirações e a melhor forma de emitir cada trecho."
            primary={<Button icon={Icon.Plus} onClick={() => toast({ title: 'Conectar programa', desc: 'Em breve você liga TudoAzul, TAP, Latam Pass e mais.' })}>Conectar primeiro programa</Button>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Topbar subtitle="Gaid · Milhas" title="Otimizador de milhas"
        right={<Button variant="secondary" icon={Icon.Refresh}>Sincronizar programas</Button>}/>

      <div className="px-10 pb-12 space-y-6">
        {/* hero */}
        <Card className="p-7 bg-gradient-to-br from-ink-50 to-paper">
          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="label">Patrimônio em milhas</div>
              <div className="text-[44px] tracking-tight font-medium text-ink-900 leading-none mt-1">
                {total.toLocaleString('pt-BR')} <span className="text-ink-500 text-[24px]">pts/milhas</span>
              </div>
              <div className="text-[13px] text-ink-600 mt-2">≈ R$ <span className="font-medium text-ink-900">8.420</span> em emissões otimizadas · próxima expiração em 60 dias</div>
            </div>
            <div className="grid grid-cols-2 gap-3 w-[420px]">
              <Stat label="Bônus ativos" value="3" hint="até 30 nov" tone="sage"/>
              <Stat label="Recomendações" value="4" hint="Gaid analisou hoje"/>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-[1.3fr_1fr] gap-6">
          {/* programs */}
          <Card className="p-6">
            <SectionHeader eyebrow="Programas" title="Seus saldos"/>
            <div className="grid grid-cols-2 gap-3">
              {programs.map(p => (
                <div key={p.id} className="bg-white border hairline rounded-xl p-4 card-h">
                  <div className="flex items-center gap-3">
                    <Placeholder tone={p.tone} className="h-10 w-10 rounded-lg"/>
                    <div className="flex-1">
                      <div className="text-[13px] font-medium text-ink-900">{p.name}</div>
                      <div className="text-[11px] text-ink-500">{p.trend}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-[24px] tracking-tight font-medium text-ink-900 leading-none">
                    {p.points.toLocaleString('pt-BR')}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11.5px]">
                    <span className={p.expiring === '—' ? 'text-ink-500' : 'text-coral-700'}>
                      {p.expiring === '—' ? 'sem expiração próxima' : `Expira: ${p.expiring}`}
                    </span>
                    <button className="text-ink-700 hover:underline">Ver</button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* transfer planner */}
          <Card className="p-6">
            <SectionHeader eyebrow="Transferir" title="Simule um movimento"/>
            <div className="space-y-3">
              <div>
                <div className="label mb-1.5">De</div>
                <select value={from} onChange={e=>setFrom(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border hairline bg-white text-[13.5px]">
                  <option value="gaid">Pontos Gaid · 124.300</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name} · {p.points.toLocaleString('pt-BR')}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-center">
                <div className="h-8 w-8 rounded-full border hairline bg-paper flex items-center justify-center text-ink-500">
                  <Icon.ArrowRight size={14} className="-rotate-90"/>
                </div>
              </div>
              <div>
                <div className="label mb-1.5">Para</div>
                <select value={to} onChange={e=>setTo(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border hairline bg-white text-[13.5px]">
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <div className="label mb-1.5">Quantidade</div>
                <input type="range" min="1000" max="100000" step="500" value={amount}
                  onChange={e=>setAmount(+e.target.value)}
                  className="w-full accent-ink-900"/>
                <div className="flex items-center justify-between text-[12px] mt-1">
                  <span className="text-ink-500">1.000</span>
                  <span className="mono text-ink-900 font-medium">{amount.toLocaleString('pt-BR')} pts</span>
                  <span className="text-ink-500">100.000</span>
                </div>
              </div>
              <div className="bg-sage-50 border border-sage-50 rounded-xl p-3">
                <div className="text-[12px] text-sage-700">Você recebe (com bônus 140%)</div>
                <div className="mono text-[20px] text-sage-700 mt-0.5">{Math.round(amount * 2.4).toLocaleString('pt-BR')}</div>
                <div className="text-[11.5px] text-sage-700/80 mt-1">≈ economia R$ {Math.round(amount*0.041).toLocaleString('pt-BR')} em emissões</div>
              </div>
              <Button className="w-full" icon={Icon.Sparkles}
                onClick={() => toast({title:'Transferência simulada', tone:'success', desc:'Gaid guardou esta estratégia.'})}>
                Aplicar estratégia
              </Button>
            </div>
          </Card>
        </div>

        {/* opportunities */}
        <Card className="p-6">
          <SectionHeader eyebrow="Gaid recomenda" title="Oportunidades para esta semana"
            action={<Button variant="ghost" iconRight={Icon.ArrowRight}>Ver todas</Button>}/>
          <div className="grid grid-cols-3 gap-3">
            <Opp tone="brand" title="Bônus 140% Gaid → TudoAzul" desc="Acaba em 4 dias. Estimativa de economia: R$ 1.220 na sua viagem a Portugal."/>
            <Opp tone="coral" title="LP Black · 4× em hotéis" desc="Reservar o Memmo Alfama no Gaid garante 4× pts Latam Pass — 18.000 pts a mais."/>
            <Opp tone="sage" title="TAP: emissão LIS↔OPO" desc="4.500 milhas vs. R$ 380 pago. Vale a pena no trecho doméstico."/>
          </div>
        </Card>
      </div>
    </div>
  );
};

const Opp = ({ tone, title, desc }) => (
  <div className={`rounded-xl border p-4 ${
    tone==='brand' ? 'bg-brand-50 border-brand-100 text-brand-900' :
    tone==='coral' ? 'bg-coral-50 border-coral-50 text-coral-700' :
    'bg-sage-50 border-sage-50 text-sage-700'}`}>
    <Icon.Sparkles size={14}/>
    <div className="text-[13.5px] font-medium mt-2 leading-snug">{title}</div>
    <div className="text-[12px] opacity-80 mt-1 leading-relaxed">{desc}</div>
  </div>
);


export { MilesScreen };
