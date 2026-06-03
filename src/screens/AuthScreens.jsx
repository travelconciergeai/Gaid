import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '../components/icons.jsx';
import { Placeholder, Button, Tag, Card, Modal, Drawer, SmartImg, Portrait, useToast, Topbar, SectionHeader, Stat, TabRow, OptimizeMenu, AddToTripDrawer, GaidLogo } from '../components/ui.jsx';
import { EmptyState, EmptyInline } from './EmptyStates.jsx';
import { Async, CardSkeleton, CatalogCarousel, Carousel, Skeleton, ErrorState, CarouselSkeleton } from '../core/states.jsx';
import { useAccount, useTrips, useCatalog, deriveTraits, profileCompletion } from '../core/store.jsx';
import { TBD, has, orTBD, fmtDuration, fmtMoney } from '../core/contracts.jsx';
// Login + Onboarding — desktop. Centered editorial layout (split: brand panel
// left, content right). Reuses the same profile shape as mobile.

// ============ LOGIN ============
const LoginDesktop = ({ onAuthed, onDemo }) => {
  const [stage, setStage] = useState('choices'); // choices | email | loading
  const [provider, setProvider] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const authWith = async (prov, isNew) => {
    if (prov !== 'e-mail') {
      setError('Nesta fase, entre com e-mail e senha.');
      setStage('email');
      return;
    }
    setProvider(prov);
    setStage('loading');
    setError('');
    try {
      await onAuthed?.({ provider: prov, isNew, email, password });
    } catch (err) {
      setError(err?.message || 'Não foi possível entrar. Confira e-mail e senha.');
      setStage('email');
    }
  };
  const valid = /\S+@\S+\.\S+/.test(email) && password.length > 0;

  return (
    <AuthShell>
      <div className="w-full max-w-[380px] mx-auto">
        <GaidLogo className="h-12 w-auto max-w-[132px] mb-7" />
        <h1 className="text-[32px] tracking-[-0.03em] font-medium text-ink-900 leading-[1.1]">
          Bem-vindo à <span className="serif-i">Gaid</span>
        </h1>
        <p className="text-[15px] text-ink-600 mt-3">Sua concierge de viagens com IA.</p>

        <div className="mt-8">
          {stage === 'loading' ? (
            <div className="flex items-center gap-3 h-[52px] px-4 rounded-2xl border-half bg-white">
              <div className="relative h-6 w-6">
                <div className="absolute inset-0 rounded-full bg-white border-half flex items-center justify-center"><GaidLogo className="h-3 w-auto max-w-[18px]"/></div>
                <div className="absolute inset-0 rounded-full ring-2 ring-ink-900/25 animate-ping"/>
              </div>
              <span className="text-[13.5px] text-ink-700">Entrando com <span className="font-medium text-ink-900">{provider}</span>…</span>
            </div>
          ) : stage === 'email' ? (
            <div className="space-y-2.5 fade-up">
              <button onClick={() => setStage('choices')} className="text-[13px] text-ink-500 hover:text-ink-900 inline-flex items-center gap-1 mb-1">
                <Icon.ChevronLeft size={14}/> voltar
              </button>
              <div className="bg-white border-half rounded-2xl h-[52px] px-4 flex items-center gap-2.5">
                <Icon.Mail size={16} className="text-ink-500"/>
                <input autoFocus type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && valid && authWith('e-mail', true)}
                  placeholder="seu@email.com"
                  className="flex-1 h-full bg-transparent outline-none text-[15px] placeholder:text-ink-400"/>
              </div>
              <div className="bg-white border-half rounded-2xl h-[52px] px-4 flex items-center gap-2.5">
                <Icon.Lock size={16} className="text-ink-500"/>
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && valid && authWith('e-mail', true)}
                  placeholder="senha"
                  className="flex-1 h-full bg-transparent outline-none text-[15px] placeholder:text-ink-400"/>
              </div>
              <button onClick={() => authWith('e-mail', true)} disabled={!valid}
                className="w-full h-[52px] rounded-2xl bg-ink-900 text-paper text-[14.5px] font-medium flex items-center justify-center gap-2 hover:bg-ink-800 transition-colors disabled:opacity-40">
                Continuar <Icon.ArrowRight size={16}/>
              </button>
              {error && <p className="text-[11.5px] text-coral-700 text-center pt-1">{error}</p>}
              <p className="text-[11.5px] text-ink-500 text-center pt-1">Entre com a senha da sua conta Gaid.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <DeskSocial label="Continuar com Google"   glyph="google"   onClick={() => authWith('Google', true)}/>
              <DeskSocial label="Continuar com Apple"    glyph="apple"    onClick={() => authWith('Apple', true)}/>
              <DeskSocial label="Continuar com Facebook" glyph="facebook" onClick={() => authWith('Facebook', true)}/>
              <div className="flex items-center gap-3 py-1.5">
                <div className="flex-1 h-px bg-ink-200"/><span className="text-[12px] text-ink-400">ou</span><div className="flex-1 h-px bg-ink-200"/>
              </div>
              <button onClick={() => setStage('email')}
                className="w-full h-[52px] rounded-2xl border-half bg-white text-ink-900 text-[14.5px] font-medium flex items-center justify-center gap-2 hover:bg-ink-50 transition-colors">
                <Icon.Mail size={17}/> Entrar com e-mail
              </button>
              <p className="text-[11.5px] text-ink-400 text-center pt-3 leading-relaxed">
                Ao continuar, você concorda com os Termos e a Política de Privacidade da Gaid.
              </p>
              {onDemo && (
                <button onClick={onDemo}
                  className="w-full text-center text-[12px] text-ink-500 hover:text-ink-900 pt-1 inline-flex items-center justify-center gap-1.5 transition-colors">
                  <Icon.Sparkles size={12}/> Ver uma conta de exemplo (Helena)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthShell>
  );
};

const DeskSocial = ({ label, glyph, onClick }) => (
  <button onClick={onClick}
    className="w-full h-[52px] rounded-2xl border-half bg-white text-ink-900 text-[14.5px] font-medium flex items-center justify-center gap-3 hover:bg-ink-50 transition-colors relative">
    <span className="absolute left-4"><BrandGlyphD glyph={glyph}/></span>
    {label}
  </button>
);

const BrandGlyphD = ({ glyph, size = 19 }) => {
  if (glyph === 'google') return (
    <svg width={size} height={size} viewBox="0 0 24 24"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.74-6-6.1s2.7-6.1 6-6.1c1.9 0 3.16.8 3.9 1.5l2.65-2.55C16.9 3.3 14.7 2.3 12 2.3 6.9 2.3 2.8 6.4 2.8 11.5S6.9 20.7 12 20.7c5.3 0 8.8-3.72 8.8-8.96 0-.6-.07-1.06-.16-1.52H12z"/></svg>
  );
  if (glyph === 'apple') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M16.4 12.6c-.03-2.5 2-3.7 2.1-3.76-1.14-1.67-2.92-1.9-3.55-1.93-1.5-.15-2.95.89-3.71.89-.78 0-1.95-.87-3.2-.85-1.64.03-3.16.96-4 2.43-1.72 2.98-.44 7.38 1.22 9.8.82 1.18 1.78 2.5 3.05 2.46 1.23-.05 1.69-.79 3.18-.79 1.47 0 1.9.79 3.19.76 1.32-.02 2.15-1.2 2.95-2.39.94-1.37 1.32-2.7 1.34-2.77-.03-.01-2.57-.99-2.6-3.9zM14.2 5.36c.67-.82 1.13-1.95 1-3.09-.97.04-2.15.65-2.85 1.46-.62.72-1.17 1.88-1.02 2.99 1.08.08 2.19-.55 2.87-1.36z"/></svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"><path fill="#1877F2" d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.13 8.44 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99C18.34 21.13 22 16.99 22 12z"/></svg>
  );
};

// Split shell: brand imagery left, content right.
const AuthShell = ({ children }) => (
  <div className="min-h-screen grid grid-cols-[1.1fr_1fr] bg-paper">
    <div className="relative overflow-hidden">
      <SmartImg seed="gaid-auth-hero" tone="warm" w={1000} h={1200} className="absolute inset-0 w-full h-full" eager/>
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/30"/>
      <div className="absolute left-10 bottom-10 right-10">
        <div className="serif-i text-paper text-[26px] leading-snug max-w-[420px]">
          "Viagem boa é a que te transforma um pouco, sem te exaurir."
        </div>
        <div className="text-paper/70 text-[12.5px] mt-3">Inês Marçal · expert Gaid em Portugal</div>
      </div>
    </div>
    <div className="flex items-center justify-center px-12 py-10">{children}</div>
  </div>
);

// ============ ONBOARDING ============
// Destinations come from the single editorial source (app/core/editorial.jsx),
// not a local list here. Same grouped-by-region shape; UI unchanged.
const ODESTS = (typeof EDITORIAL_DESTINATIONS !== 'undefined' && EDITORIAL_DESTINATIONS) || {};
const OnboardingDesktop = ({ onDone, initial }) => {
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [p, setP] = useState({
    travelCompanions: [], children: false, childrenAges: [], petProfile: [],
    travelStyles: [], favoriteDestinations: [], destinationInterests: false,
    budgetRange: null, tripFrequency: null,
    hotelPreferences: [], flightPreferences: [], usesMiles: null, milesPrograms: [],
    ...(initial || {}),
  });
  const set = (patch) => setP(prev => ({ ...prev, ...patch }));
  const toggle = (key, val, max) => setP(prev => {
    const arr = prev[key]; const has = arr.includes(val);
    let next = has ? arr.filter(x => x !== val) : [...arr, val];
    if (max && next.length > max) next = next.slice(1);
    return { ...prev, [key]: next };
  });

  // welcome + 6 grouped questions + finish
  const steps = ['welcome','companions','styles','destinations','budgetfreq','prefs','miles','finish'];
  const cur = steps[Math.min(step, steps.length - 1)];
  const next = () => setStep(s => Math.min(s + 1, steps.length - 1));
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

  if (cur === 'welcome') {
    return (
      <AuthShell>
        <div className="w-full max-w-[420px] mx-auto text-left">
          <div className="h-12 w-12 rounded-2xl bg-ink-900 text-paper flex items-center justify-center mb-7"><Icon.Compass size={26}/></div>
          <h1 className="text-[30px] tracking-[-0.03em] font-medium text-ink-900 leading-[1.15]">
            Vamos personalizar sua <span className="serif-i">experiência de viagem.</span>
          </h1>
          <p className="text-[15px] text-ink-600 mt-4 leading-relaxed">
            Leva menos de 2 minutos. Quanto mais soubermos sobre você, melhores serão suas recomendações.
          </p>
          <button onClick={next} className="mt-8 w-full h-[54px] rounded-2xl bg-ink-900 text-paper text-[15px] font-medium flex items-center justify-center gap-2 hover:bg-ink-800 transition-colors">
            Começar <Icon.ArrowRight size={17}/>
          </button>
          <button onClick={() => onDone && onDone(initial || null)} className="w-full text-center text-[13px] text-ink-500 mt-3 py-2 hover:text-ink-900">Pular por agora</button>
        </div>
      </AuthShell>
    );
  }

  if (cur === 'finish') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-paper px-8 text-center">
        <div className="relative h-16 w-16 mb-7">
          <div className="absolute inset-0 rounded-2xl bg-ink-900 text-paper flex items-center justify-center"><Icon.Sparkles size={30}/></div>
          {finishing && <div className="absolute inset-0 rounded-2xl ring-2 ring-ink-900/25 animate-ping"/>}
        </div>
        <h1 className="text-[28px] tracking-[-0.02em] font-medium text-ink-900 leading-tight max-w-[480px]">
          {finishing ? 'Preparando sua Gaid…' : 'Já entendemos como você gosta de viajar.'}
        </h1>
        <p className="text-[14.5px] text-ink-600 mt-3 max-w-[420px] leading-relaxed">
          {finishing ? 'Selecionando destinos, roteiros e hotéis com a sua cara.' : 'Perfeito. Sua Gaid já está montada do seu jeito.'}
        </p>
        {!finishing && (
          <button onClick={doFinish} className="mt-8 h-[54px] px-7 rounded-2xl bg-ink-900 text-paper text-[15px] font-medium flex items-center gap-2 hover:bg-ink-800 transition-colors">
            Ver minha Gaid <Icon.ArrowRight size={17}/>
          </button>
        )}
      </div>
    );
  }

  // Question shell — centered card with progress
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas px-6 py-10">
      <div className="w-full max-w-[600px]">
        {/* progress */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={back} className="h-9 w-9 rounded-full hover:bg-ink-100 flex items-center justify-center text-ink-700"><Icon.ChevronLeft size={18}/></button>
          <div className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
            <div className="h-full bg-ink-900 transition-all duration-300" style={{ width: `${(step/(steps.length-1))*100}%` }}/>
          </div>
          <span className="text-[12px] mono text-ink-500 tabular-nums">{step}/{steps.length-2}</span>
        </div>

        <ODQuestion cur={cur} p={p} set={set} toggle={toggle}/>

        <button onClick={next} disabled={!canNext}
          className="mt-9 w-full h-[54px] rounded-2xl bg-ink-900 text-paper text-[15px] font-medium flex items-center justify-center gap-2 hover:bg-ink-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
          Continuar <Icon.ArrowRight size={17}/>
        </button>
      </div>
    </div>
  );
};

const ODQuestion = ({ cur, p, set, toggle }) => {
  const Block = ({ title, hint, children }) => (
    <div>
      <h1 className="text-[26px] tracking-[-0.02em] font-medium text-ink-900 leading-snug">{title}</h1>
      {hint && <p className="text-[13.5px] text-ink-500 mt-1.5">{hint}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
  const Chips = ({ options, selected, onToggle, single, max }) => (
    <div className="flex flex-wrap gap-2.5">
      {options.map(o => {
        const on = selected.includes(o);
        return (
          <button key={o} onClick={() => onToggle(o)}
            className={`h-11 px-4 rounded-full border-half text-[14px] font-medium transition-all hover:border-ink-400 flex items-center gap-1.5 active:scale-[.97]
                        ${on ? 'bg-ink-900 text-paper border-ink-900' : 'bg-white text-ink-800 border-edge'}`}>
            {on && <Icon.Check size={13}/>}{o}
          </button>
        );
      })}
    </div>
  );
  switch (cur) {
    case 'companions': return (
      <Block title="Com quem você costuma viajar?" hint="Pode escolher mais de uma.">
        <div className="grid grid-cols-3 gap-3">
          {['Casal','Família com filhos','Sozinho','Amigos','Com pet'].map(o => {
            const on = p.travelCompanions.includes(o);
            const Ic = Icon[{Casal:'Heart','Família com filhos':'Users',Sozinho:'Compass',Amigos:'Users','Com pet':'Award'}[o]] || Icon.Compass;
            return (
              <button key={o} onClick={() => toggle('travelCompanions', o)}
                className={`relative rounded-2xl border-half p-4 h-[104px] flex flex-col items-start justify-between text-left transition-all hover:border-ink-400 active:scale-[.98]
                            ${on ? 'bg-ink-900 text-paper border-ink-900' : 'bg-white text-ink-900 border-edge'}`}>
                <Ic size={22} className={on ? 'text-paper' : 'text-ink-700'}/>
                <span className="text-[14px] font-medium leading-tight">{o}</span>
                {on && <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-paper text-ink-900 flex items-center justify-center"><Icon.Check size={12}/></div>}
              </button>
            );
          })}
        </div>
        {p.travelCompanions.includes('Família com filhos') && (
          <div className="mt-4 bg-ink-50 rounded-2xl p-4 fade-up">
            <div className="text-[13px] font-medium text-ink-800 mb-2.5">Idade das crianças</div>
            <Chips options={['0–3 anos','4–7 anos','8–12 anos','13+']} selected={p.childrenAges} onToggle={(v)=>toggle('childrenAges',v)}/>
          </div>
        )}
        {p.travelCompanions.includes('Com pet') && (
          <div className="mt-3 bg-ink-50 rounded-2xl p-4 fade-up">
            <div className="text-[13px] font-medium text-ink-800 mb-2.5">Porte do pet</div>
            <Chips options={['pequeno porte','médio porte','grande porte']} selected={p.petProfile} onToggle={(v)=>toggle('petProfile',v)}/>
          </div>
        )}
      </Block>
    );
    case 'styles': return <Block title="O que você mais gosta em uma viagem?" hint="Escolha até 5."><Chips options={['Cultura','Gastronomia','Praia','Natureza','Compras','Parques','Luxo','Economia','Experiências locais','Aventura','Descanso','Romântico']} selected={p.travelStyles} max={5} onToggle={(v)=>toggle('travelStyles',v,5)}/></Block>;
    case 'destinations': return (
      <Block title="Quais destinos combinam com você?" hint="Escolha quantos quiser.">
        <div className="space-y-5">
          {Object.entries(ODESTS).map(([region, list]) => (
            <div key={region}>
              <div className="label mb-2">{region}</div>
              <Chips options={list} selected={p.favoriteDestinations} onToggle={(v)=>toggle('favoriteDestinations',v)}/>
            </div>
          ))}
          <button onClick={() => set({ destinationInterests: !p.destinationInterests })}
            className={`w-full h-12 rounded-2xl border-half flex items-center justify-center gap-2 text-[14px] font-medium transition-colors
                        ${p.destinationInterests ? 'bg-ink-900 text-paper border-ink-900' : 'bg-white text-ink-800 border-edge hover:border-ink-400'}`}>
            <Icon.Sparkles size={15}/> Quero explorar sugestões
          </button>
        </div>
      </Block>
    );
    case 'budgetfreq': return (
      <Block title="Orçamento e frequência">
        <div className="space-y-7">
          <div>
            <div className="text-[15px] font-medium text-ink-900 mb-3">Quanto você costuma investir em uma viagem?</div>
            <div className="space-y-2">
              {['Até R$5 mil','R$5–10 mil','R$10–20 mil','R$20–40 mil','R$40 mil+'].map(o => {
                const on = p.budgetRange === o;
                return (
                  <button key={o} onClick={() => set({budgetRange:o})}
                    className={`w-full h-14 px-4 rounded-2xl border-half flex items-center justify-between transition-all hover:border-ink-400 ${on?'bg-ink-900 text-paper border-ink-900':'bg-white text-ink-900 border-edge'}`}>
                    <span className="text-[15px] font-medium">{o}</span>
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center ${on?'bg-paper text-ink-900':'border-half border-ink-300'}`}>{on && <Icon.Check size={12}/>}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-[15px] font-medium text-ink-900 mb-3">Quantas viagens faz por ano?</div>
            <Chips options={['1','2','3','4+']} selected={p.tripFrequency?[p.tripFrequency]:[]} onToggle={(v)=>set({tripFrequency:v})}/>
          </div>
        </div>
      </Block>
    );
    case 'prefs': return (
      <Block title="Suas preferências">
        <div className="space-y-7">
          <div>
            <div className="text-[15px] font-medium text-ink-900 mb-1">O que você valoriza em hotéis?</div>
            <div className="text-[13px] text-ink-500 mb-3">Escolha até 3.</div>
            <Chips options={['Melhor preço','Localização','Luxo','Resort','Boutique','Espaço para família','Pet friendly','Experiência local']} selected={p.hotelPreferences} max={3} onToggle={(v)=>toggle('hotelPreferences',v,3)}/>
          </div>
          <div>
            <div className="text-[15px] font-medium text-ink-900 mb-1">O que você prioriza em voos?</div>
            <div className="text-[13px] text-ink-500 mb-3">Escolha até 3.</div>
            <Chips options={['Menor preço','Menos conexões','Conforto','Melhores horários','Milhas','Classe executiva']} selected={p.flightPreferences} max={3} onToggle={(v)=>toggle('flightPreferences',v,3)}/>
          </div>
        </div>
      </Block>
    );
    case 'miles': return (
      <Block title="Você usa milhas ou pontos?">
        <Chips options={['Sim','Não','Quero aprender']} selected={p.usesMiles?[p.usesMiles]:[]} onToggle={(v)=>set({usesMiles:v})}/>
        {p.usesMiles === 'Sim' && (
          <div className="mt-4 bg-ink-50 rounded-2xl p-4 fade-up">
            <div className="text-[13px] font-medium text-ink-800 mb-2.5">Quais programas?</div>
            <Chips options={['Livelo','Esfera','LATAM Pass','Smiles','Azul']} selected={p.milesPrograms} onToggle={(v)=>toggle('milesPrograms',v)}/>
          </div>
        )}
      </Block>
    );
    default: return null;
  }
};



export { LoginDesktop, OnboardingDesktop };
