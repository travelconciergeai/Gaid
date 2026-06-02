// Onboarding — mobile. Consolidated to 7 steps (welcome + 6 question screens
// + finish). Related questions grouped into single screens with conditional
// chip expansions. Selection-first, ~2 min, premium and light.

const { useState } = React;

const ONB_STYLES = ['Cultura','Gastronomia','Praia','Natureza','Compras','Parques','Luxo','Economia','Experiências locais','Aventura','Descanso','Romântico'];
const ONB_DESTS = {
  Brasil:  ['Rio','Nordeste','Gramado','Foz'],
  América: ['Orlando','Buenos Aires','Nova York','Santiago'],
  Europa:  ['Paris','Londres','Roma','Madri','Portugal'],
  Ásia:    ['Japão','Coreia','Tailândia'],
};
const ONB_HOTEL = ['Melhor preço','Localização','Luxo','Resort','Boutique','Espaço para família','Pet friendly','Experiência local'];
const ONB_FLIGHT = ['Menor preço','Menos conexões','Conforto','Melhores horários','Milhas','Classe executiva'];
const ONB_MILES = ['Livelo','Esfera','LATAM Pass','Smiles','Azul'];
const ONB_BUDGET = ['Até R$5 mil','R$5–10 mil','R$10–20 mil','R$20–40 mil','R$40 mil+'];

// welcome + 6 grouped questions + finish
const STEPS = ['welcome','companions','styles','destinations','budgetfreq','prefs','miles','finish'];

const OnboardingMobile = ({ onDone }) => {
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [p, setP] = useState({
    travelCompanions: [], children: false, childrenAges: [], petProfile: [],
    travelStyles: [], favoriteDestinations: [], destinationInterests: false,
    budgetRange: null, tripFrequency: null,
    hotelPreferences: [], flightPreferences: [],
    usesMiles: null, milesPrograms: [],
  });
  const set = (patch) => setP(prev => ({ ...prev, ...patch }));
  const toggle = (key, val, max) => setP(prev => {
    const arr = prev[key]; const has = arr.includes(val);
    let next = has ? arr.filter(x => x !== val) : [...arr, val];
    if (max && next.length > max) next = next.slice(1);
    return { ...prev, [key]: next };
  });

  const cur = STEPS[step];
  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const canNext = (() => {
    switch (cur) {
      case 'companions': return p.travelCompanions.length > 0;
      case 'styles': return p.travelStyles.length > 0;
      case 'destinations': return p.favoriteDestinations.length > 0 || p.destinationInterests;
      case 'budgetfreq': return !!p.budgetRange && !!p.tripFrequency;
      case 'prefs': return p.hotelPreferences.length > 0 && p.flightPreferences.length > 0;
      case 'miles': return !!p.usesMiles;
      default: return true;
    }
  })();

  const doFinish = () => { setFinishing(true); setTimeout(() => onDone && onDone(p), 2200); };

  // ---- WELCOME ----
  if (cur === 'welcome') {
    return (
      <div className="absolute inset-0 flex flex-col bg-paper">
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-ink-900 text-paper flex items-center justify-center shadow-pop mb-7"><Icon.Compass size={32}/></div>
          <h1 className="text-[27px] tracking-[-0.03em] font-medium text-ink-900 leading-[1.25]">
            <span className="block">Vamos personalizar sua</span>
            <span className="serif-i block" style={{ lineHeight: 1.3 }}>experiência de viagem.</span>
          </h1>
          <p className="text-[14.5px] text-ink-600 mt-5 max-w-[290px] leading-relaxed">
            Responda algumas escolhas rápidas para receber recomendações mais certeiras.
          </p>
        </div>
        <div className="px-6 pb-10">
          <OnbPrimaryBtn label="Começar" onClick={next}/>
          <button onClick={() => onDone && onDone(p)} className="w-full text-center text-[13px] text-ink-500 mt-3 py-2 active:text-ink-900">Pular por agora</button>
        </div>
      </div>
    );
  }

  // ---- FINISH ----
  if (cur === 'finish') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-paper px-8 text-center">
        <div className="relative h-16 w-16 mb-7">
          <div className="absolute inset-0 rounded-2xl bg-ink-900 text-paper flex items-center justify-center"><Icon.Sparkles size={30}/></div>
          {finishing && <div className="absolute inset-0 rounded-2xl ring-2 ring-ink-900/25 animate-ping"/>}
        </div>
        <h1 className="text-[25px] tracking-[-0.02em] font-medium text-ink-900 leading-tight">
          {finishing ? 'Preparando sua Gaid…' : 'Já entendemos como você gosta de viajar.'}
        </h1>
        <p className="text-[14px] text-ink-600 mt-3 max-w-[290px] leading-relaxed">
          {finishing ? 'Selecionando destinos, roteiros e hotéis com a sua cara.' : 'Estamos preparando recomendações personalizadas para você.'}
        </p>
        {!finishing && (
          <div className="absolute left-6 right-6 bottom-10">
            <OnbPrimaryBtn label="Ver minha Gaid" icon={Icon.ArrowRight} onClick={doFinish}/>
          </div>
        )}
      </div>
    );
  }

  // ---- QUESTION SHELL ----
  const qIndex = step;            // 1..6
  const qTotal = STEPS.length - 2; // 6
  return (
    <div className="absolute inset-0 flex flex-col bg-paper">
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={back} className="h-9 w-9 rounded-full active:bg-ink-100 flex items-center justify-center text-ink-700 shrink-0"><Icon.ChevronLeft size={18}/></button>
          <div className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
            <div className="h-full bg-ink-900 transition-all duration-300" style={{ width: `${(qIndex/(qTotal+1))*100}%` }}/>
          </div>
          <span className="text-[11px] mono text-ink-500 shrink-0 tabular-nums">{qIndex}/{qTotal}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-4">
        <OnbQuestion cur={cur} p={p} set={set} toggle={toggle}/>
      </div>

      <div className="px-6 pb-9 pt-2">
        <OnbPrimaryBtn label="Continuar" icon={Icon.ArrowRight} disabled={!canNext} onClick={next}/>
      </div>
    </div>
  );
};

const OnbQuestion = ({ cur, p, set, toggle }) => {
  switch (cur) {
    case 'companions': return (
      <OnbBlock title="Com quem você costuma viajar?" hint="Pode escolher mais de uma.">
        <OnbCards options={['Casal','Família com filhos','Sozinho','Amigos','Com pet']}
          icons={{Casal:'Heart','Família com filhos':'Users',Sozinho:'Compass',Amigos:'Users','Com pet':'Award'}}
          selected={p.travelCompanions}
          onToggle={(v) => {
            toggle('travelCompanions', v);
            if (v === 'Família com filhos') set({ children: !p.children });
          }}/>
        {/* Conditional: children ages */}
        {p.travelCompanions.includes('Família com filhos') && (
          <div className="mt-4 bg-ink-50 rounded-2xl p-4 fade-up">
            <div className="text-[12.5px] font-medium text-ink-800 mb-2.5">Idade das crianças</div>
            <OnbChips options={['0–3 anos','4–7 anos','8–12 anos','13+']} selected={p.childrenAges} onToggle={(v) => toggle('childrenAges', v)} sm/>
          </div>
        )}
        {/* Conditional: pet size */}
        {p.travelCompanions.includes('Com pet') && (
          <div className="mt-3 bg-ink-50 rounded-2xl p-4 fade-up">
            <div className="text-[12.5px] font-medium text-ink-800 mb-2.5">Porte do pet</div>
            <OnbChips options={['pequeno porte','médio porte','grande porte']} selected={p.petProfile} onToggle={(v) => toggle('petProfile', v)} sm/>
          </div>
        )}
      </OnbBlock>
    );
    case 'styles': return (
      <OnbBlock title="O que você mais gosta em uma viagem?" hint="Escolha até 5.">
        <OnbChips options={ONB_STYLES} selected={p.travelStyles} max={5} onToggle={(v) => toggle('travelStyles', v, 5)}/>
      </OnbBlock>
    );
    case 'destinations': return (
      <OnbBlock title="Quais destinos combinam com você?" hint="Escolha quantos quiser.">
        <div className="space-y-4">
          {Object.entries(ONB_DESTS).map(([region, list]) => (
            <div key={region}>
              <div className="label mb-2">{region}</div>
              <OnbChips options={list} selected={p.favoriteDestinations} onToggle={(v) => toggle('favoriteDestinations', v)} sm/>
            </div>
          ))}
          <button onClick={() => set({ destinationInterests: !p.destinationInterests })}
            className={`w-full h-12 rounded-2xl border-half flex items-center justify-center gap-2 text-[13.5px] font-medium transition-colors
                        ${p.destinationInterests ? 'bg-ink-900 text-paper border-ink-900' : 'bg-white text-ink-800 border-edge active:bg-ink-50'}`}>
            <Icon.Sparkles size={14}/> Quero explorar sugestões
          </button>
        </div>
      </OnbBlock>
    );
    case 'budgetfreq': return (
      <OnbBlock title="Orçamento e frequência">
        <div className="space-y-6">
          <div>
            <div className="text-[14px] font-medium text-ink-900 mb-3">Quanto você costuma investir em uma viagem?</div>
            <OnbList options={ONB_BUDGET} single selected={p.budgetRange ? [p.budgetRange] : []} onToggle={(v) => set({ budgetRange: v })}/>
          </div>
          <div>
            <div className="text-[14px] font-medium text-ink-900 mb-3">Quantas viagens faz por ano?</div>
            <OnbChips options={['1','2','3','4+']} single selected={p.tripFrequency ? [p.tripFrequency] : []} onToggle={(v) => set({ tripFrequency: v })}/>
          </div>
        </div>
      </OnbBlock>
    );
    case 'prefs': return (
      <OnbBlock title="Suas preferências">
        <div className="space-y-6">
          <div>
            <div className="text-[14px] font-medium text-ink-900 mb-1">O que você valoriza em hotéis?</div>
            <div className="text-[12px] text-ink-500 mb-3">Escolha até 3.</div>
            <OnbChips options={ONB_HOTEL} selected={p.hotelPreferences} max={3} onToggle={(v) => toggle('hotelPreferences', v, 3)} sm/>
          </div>
          <div>
            <div className="text-[14px] font-medium text-ink-900 mb-1">O que você prioriza em voos?</div>
            <div className="text-[12px] text-ink-500 mb-3">Escolha até 3.</div>
            <OnbChips options={ONB_FLIGHT} selected={p.flightPreferences} max={3} onToggle={(v) => toggle('flightPreferences', v, 3)} sm/>
          </div>
        </div>
      </OnbBlock>
    );
    case 'miles': return (
      <OnbBlock title="Você usa milhas ou pontos?">
        <OnbChips options={['Sim','Não','Quero aprender']} single selected={p.usesMiles ? [p.usesMiles] : []} onToggle={(v) => set({ usesMiles: v })}/>
        {p.usesMiles === 'Sim' && (
          <div className="mt-4 bg-ink-50 rounded-2xl p-4 fade-up">
            <div className="text-[12.5px] font-medium text-ink-800 mb-2.5">Quais programas?</div>
            <OnbChips options={ONB_MILES} selected={p.milesPrograms} onToggle={(v) => toggle('milesPrograms', v)} sm/>
          </div>
        )}
      </OnbBlock>
    );
    default: return null;
  }
};

// ---- Building blocks ----
const OnbBlock = ({ title, hint, children }) => (
  <div className="pt-2">
    <h1 className="text-[23px] tracking-[-0.02em] font-medium text-ink-900 leading-snug">{title}</h1>
    {hint && <p className="text-[13px] text-ink-500 mt-1.5">{hint}</p>}
    <div className="mt-6">{children}</div>
  </div>
);

const OnbPrimaryBtn = ({ label, icon: Ic, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled}
    className="w-full rounded-2xl bg-ink-900 text-paper text-[15px] font-medium flex items-center justify-center gap-2 active:bg-ink-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
    style={{ height: '54px' }}>
    {label} {Ic && <Ic size={17}/>}
  </button>
);

const OnbCards = ({ options, icons, selected, onToggle }) => (
  <div className="grid grid-cols-2 gap-2.5">
    {options.map(o => {
      const on = selected.includes(o);
      const Ic = Icon[icons?.[o]] || Icon.Compass;
      return (
        <button key={o} onClick={() => onToggle(o)}
          className={`relative rounded-2xl border-half p-4 h-[92px] flex flex-col items-start justify-between text-left transition-all active:scale-[.98]
                      ${on ? 'bg-ink-900 text-paper border-ink-900' : 'bg-white text-ink-900 border-edge'}`}>
          <Ic size={20} className={on ? 'text-paper' : 'text-ink-700'}/>
          <span className="text-[13.5px] font-medium leading-tight">{o}</span>
          {on && <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-paper text-ink-900 flex items-center justify-center"><Icon.Check size={12}/></div>}
        </button>
      );
    })}
  </div>
);

const OnbChips = ({ options, selected, onToggle, single, max, sm }) => (
  <div className="flex flex-wrap gap-2">
    {options.map(o => {
      const on = selected.includes(o);
      return (
        <button key={o} onClick={() => onToggle(o)}
          className={`${sm ? 'h-9 px-3.5 text-[12.5px]' : 'h-11 px-4 text-[13.5px]'} rounded-full border-half font-medium transition-all active:scale-[.97] flex items-center gap-1.5
                      ${on ? 'bg-ink-900 text-paper border-ink-900' : 'bg-white text-ink-800 border-edge'}`}>
          {on && <Icon.Check size={12}/>}{o}
        </button>
      );
    })}
  </div>
);

const OnbList = ({ options, selected, onToggle }) => (
  <div className="space-y-2">
    {options.map(o => {
      const on = selected.includes(o);
      return (
        <button key={o} onClick={() => onToggle(o)}
          className={`w-full h-13 px-4 rounded-2xl border-half flex items-center justify-between transition-all active:scale-[.99] ${on ? 'bg-ink-900 text-paper border-ink-900' : 'bg-white text-ink-900 border-edge'}`}
          style={{ height: '50px' }}>
          <span className="text-[14px] font-medium">{o}</span>
          <div className={`h-5 w-5 rounded-full flex items-center justify-center ${on ? 'bg-paper text-ink-900' : 'border-half border-ink-300'}`}>{on && <Icon.Check size={12}/>}</div>
        </button>
      );
    })}
  </div>
);

window.OnboardingMobile = OnboardingMobile;
