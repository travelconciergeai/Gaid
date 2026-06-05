import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '../components/icons.jsx';
import { Placeholder, Button, Tag, Card, Modal, Drawer, SmartImg, Portrait, useToast, Topbar, SectionHeader, Stat, TabRow, OptimizeMenu, AddToTripDrawer, GaidLogo, ConciergeLoading } from '../components/ui.jsx';
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
            <ConciergeLoading category="profile" />
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
  <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] bg-paper">
    <div className="relative overflow-hidden min-h-[200px] lg:min-h-0 h-[28vh] lg:h-auto">
      <SmartImg seed="gaid-auth-hero" tone="warm" w={1000} h={1200} className="absolute inset-0 w-full h-full" eager/>
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/30"/>
      <div className="absolute left-6 lg:left-10 bottom-6 lg:bottom-10 right-6 lg:right-10">
        <div className="serif-i text-paper text-[20px] lg:text-[26px] leading-snug max-w-[420px]">
          "Viagem boa é a que te transforma um pouco, sem te exaurir."
        </div>
        <div className="text-paper/70 text-[12.5px] mt-3">Inês Marçal · expert Gaid em Portugal</div>
      </div>
    </div>
    <div className="flex items-center justify-center px-6 sm:px-12 py-8 lg:py-10">{children}</div>
  </div>
);

// ============ ONBOARDING ============
const OnboardingDesktop = ({ onDone, initial }) => {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [p, setP] = useState({
    travelerProfile: {
      defaultComposition: '',
      commonCompanions: [],
      childrenAges: [],
    },
    preferences: {
      interests: [],
      pace: '',
      budgetStyle: '',
      priorityRanking: ['Experiências únicas', 'Conforto', 'Economia', 'Pouco deslocamento', 'Boa gastronomia', 'Segurança', 'Atividades para crianças', 'Flexibilidade'],
    },
    ...(initial || {}),
  });
  const setTraveler = (patch) => setP(prev => ({ ...prev, travelerProfile: { ...prev.travelerProfile, ...patch } }));
  const setPrefs = (patch) => setP(prev => ({ ...prev, preferences: { ...prev.preferences, ...patch } }));
  const toggleTraveler = (key, val) => setP(prev => {
    const arr = prev.travelerProfile[key] || [];
    const has = arr.includes(val);
    const next = has ? arr.filter(x => x !== val) : [...arr, val];
    return { ...prev, travelerProfile: { ...prev.travelerProfile, [key]: next } };
  });
  const togglePref = (key, val) => setP(prev => {
    const arr = prev.preferences[key] || [];
    const has = arr.includes(val);
    let next = has ? arr.filter(x => x !== val) : [...arr, val];
    return { ...prev, preferences: { ...prev.preferences, [key]: next } };
  });

  const steps = ['composition', 'companions', 'interests', 'pace', 'budget', 'ranking'];
  const cur = steps[Math.min(step, steps.length - 1)];
  const next = () => step >= steps.length - 1 ? setDone(true) : setStep(s => Math.min(s + 1, steps.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const canNext = (() => {
    switch (cur) {
      case 'composition': return !!p.travelerProfile.defaultComposition;
      case 'companions': return p.travelerProfile.commonCompanions.length > 0;
      case 'interests': return p.preferences.interests.length > 0;
      case 'pace': return !!p.preferences.pace;
      case 'budget': return !!p.preferences.budgetStyle;
      case 'ranking': return p.preferences.priorityRanking.length > 0;
      default: return true;
    }
  })();

  const summary = onboardingSummary(p);
  const finish = () => onDone && onDone({
    travelerProfile: p.travelerProfile,
    preferences: p.preferences,
  });

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-4 sm:px-6 py-8">
        <div className="w-full max-w-[560px] bg-white border-half rounded-3xl shadow-card p-6 sm:p-8 text-center">
          <div className="h-14 w-14 rounded-2xl bg-ink-900 text-paper flex items-center justify-center mx-auto mb-6">
            <Icon.Sparkles size={26}/>
          </div>
          <div className="label mb-2">Perfil pronto</div>
          <h1 className="text-[26px] sm:text-[32px] tracking-tight font-medium text-ink-900 leading-tight">
            Agora a Gaid sabe como decidir melhor por você.
          </h1>
          <p className="text-[15px] text-ink-600 mt-4 leading-relaxed">{summary}</p>
          <button onClick={finish}
            className="mt-8 w-full sm:w-auto h-[52px] px-7 rounded-2xl bg-ink-900 text-paper text-[15px] font-medium inline-flex items-center justify-center gap-2 hover:bg-ink-800 transition-colors">
            Começar a explorar <Icon.ArrowRight size={17}/>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4 sm:px-6 py-8">
      <div className="w-full max-w-[680px] bg-white border-half rounded-3xl shadow-card p-5 sm:p-7">
        <div className="flex items-center gap-3 mb-7">
          <button onClick={back} disabled={step === 0}
            className="h-9 w-9 rounded-full hover:bg-ink-100 flex items-center justify-center text-ink-700 disabled:opacity-30 disabled:cursor-not-allowed">
            <Icon.ChevronLeft size={18}/>
          </button>
          <div className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
            <div className="h-full bg-ink-900 transition-all duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%` }}/>
          </div>
          <span className="text-[12px] mono text-ink-500 tabular-nums">{step + 1}/{steps.length}</span>
        </div>

        <ODQuestion
          cur={cur}
          p={p}
          setTraveler={setTraveler}
          setPrefs={setPrefs}
          toggleTraveler={toggleTraveler}
          togglePref={togglePref}
        />

        <button onClick={next} disabled={!canNext}
          className="mt-9 w-full h-[54px] rounded-2xl bg-ink-900 text-paper text-[15px] font-medium flex items-center justify-center gap-2 hover:bg-ink-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
          {step >= steps.length - 1 ? 'Ver resumo' : 'Continuar'} <Icon.ArrowRight size={17}/>
        </button>
      </div>
    </div>
  );
};

const ODQuestion = ({ cur, p, setTraveler, setPrefs, toggleTraveler, togglePref }) => {
  const Block = ({ title, hint, children }) => (
    <div>
      <h1 className="text-[26px] tracking-[-0.02em] font-medium text-ink-900 leading-snug">{title}</h1>
      {hint && <p className="text-[13.5px] text-ink-500 mt-1.5">{hint}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
  const Chips = ({ options, selected, onToggle }) => (
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
  const SingleCards = ({ options, value, onPick }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {options.map(o => {
        const on = value === o;
        return (
          <button key={o} onClick={() => onPick(o)}
            className={`min-h-[54px] px-4 rounded-2xl border-half text-left text-[14px] font-medium transition-all active:scale-[.98] flex items-center justify-between gap-3
              ${on ? 'bg-ink-900 text-paper border-ink-900' : 'bg-white text-ink-900 border-edge hover:border-ink-400'}`}>
            <span>{o}</span>
            {on && <Icon.Check size={15}/>}
          </button>
        );
      })}
    </div>
  );
  const moveRank = (index, direction) => {
    const next = [...p.preferences.priorityRanking];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setPrefs({ priorityRanking: next });
  };

  switch (cur) {
    case 'composition': return (
      <Block title="Como você costuma viajar?" hint="Isso vira a base das recomendações e do ritmo dos roteiros.">
        <SingleCards
          options={['Sozinho', 'Casal', 'Família', 'Amigos', 'Trabalho', 'Varia bastante']}
          value={p.travelerProfile.defaultComposition}
          onPick={(value) => setTraveler({ defaultComposition: value })}
        />
      </Block>
    );
    case 'companions': return (
      <Block title="Quem normalmente viaja com você?" hint="Pode escolher mais de uma opção.">
        <Chips
          options={['Parceiro(a)', 'Crianças', 'Bebê ou criança pequena', 'Pais ou idosos', 'Pet', 'Amigos', 'Costumo viajar sozinho']}
          selected={p.travelerProfile.commonCompanions}
          onToggle={(value) => toggleTraveler('commonCompanions', value)}
        />
        {(p.travelerProfile.commonCompanions.includes('Crianças') || p.travelerProfile.commonCompanions.includes('Bebê ou criança pequena')) && (
          <div className="mt-4 bg-ink-50 rounded-2xl p-4 fade-up">
            <div className="text-[13px] font-medium text-ink-800 mb-2.5">Faixa de idade das crianças</div>
            <Chips options={['0–2', '3–5', '6–10', '11+']} selected={p.travelerProfile.childrenAges} onToggle={(v)=>toggleTraveler('childrenAges', v)}/>
          </div>
        )}
      </Block>
    );
    case 'interests': return (
      <Block title="O que mais combina com você?" hint="A Gaid usa isso para priorizar dicas e escolhas no roteiro.">
        <Chips
          options={['Gastronomia', 'Cultura', 'Compras', 'Natureza', 'Parques', 'Museus', 'Vida noturna', 'Descanso', 'Luxo', 'Econômico', 'Experiências locais', 'Lugares instagramáveis']}
          selected={p.preferences.interests}
          onToggle={(value) => togglePref('interests', value)}
        />
      </Block>
    );
    case 'pace': return (
      <Block title="Qual ritmo você prefere?" hint="Isso evita roteiros corridos demais ou vazios demais.">
        <SingleCards
          options={['Leve', 'Equilibrado', 'Intenso', 'Quero aproveitar tudo sem sofrer']}
          value={p.preferences.pace}
          onPick={(value) => setPrefs({ pace: value })}
        />
      </Block>
    );
    case 'budget': return (
      <Block title="Como você prefere equilibrar custo e conforto?" hint="Não é orçamento fixo. É uma preferência de decisão.">
        <SingleCards
          options={['Econômico', 'Moderado', 'Confortável', 'Premium', 'Depende da viagem']}
          value={p.preferences.budgetStyle}
          onPick={(value) => setPrefs({ budgetStyle: value })}
        />
      </Block>
    );
    case 'ranking': return (
      <Block title="Ordene o que mais influencia suas decisões de viagem" hint="Use as setas para colocar o mais importante no topo.">
        <div className="space-y-2">
          {p.preferences.priorityRanking.map((item, index) => (
            <div key={item} className="flex items-center gap-3 px-4 py-3 rounded-2xl border-half bg-white">
              <div className="h-7 w-7 rounded-full bg-ink-100 text-ink-600 flex items-center justify-center text-[11px] mono shrink-0">{index + 1}</div>
              <div className="flex-1 text-[14px] font-medium text-ink-900">{item}</div>
              <div className="flex items-center gap-1">
                <button onClick={() => moveRank(index, -1)} disabled={index === 0}
                  className="h-8 w-8 rounded-lg border-half text-ink-500 hover:text-ink-900 disabled:opacity-30 disabled:cursor-not-allowed">↑</button>
                <button onClick={() => moveRank(index, 1)} disabled={index === p.preferences.priorityRanking.length - 1}
                  className="h-8 w-8 rounded-lg border-half text-ink-500 hover:text-ink-900 disabled:opacity-30 disabled:cursor-not-allowed">↓</button>
              </div>
            </div>
          ))}
        </div>
      </Block>
    );
    default: return null;
  }
};

function onboardingSummary(profile) {
  const composition = profile.travelerProfile.defaultComposition
    ? `viagens em ${profile.travelerProfile.defaultComposition.toLowerCase()}`
    : 'viagens com contexto flexível';
  const interests = profile.preferences.interests.slice(0, 3).map(item => item.toLowerCase());
  const interestText = interests.length ? `, com foco em ${sentenceList(interests)}` : '';
  const pace = profile.preferences.pace ? `, ritmo ${profile.preferences.pace.toLowerCase()}` : '';
  const budget = profile.preferences.budgetStyle ? ` e perfil ${profile.preferences.budgetStyle.toLowerCase()}` : '';
  return `Você prefere ${composition}${interestText}${pace}${budget}.`;
}

function sentenceList(values) {
  const items = values.filter(Boolean);
  if (items.length <= 1) return items[0] || '';
  if (items.length === 2) return `${items[0]} e ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}



export { LoginDesktop, OnboardingDesktop };
