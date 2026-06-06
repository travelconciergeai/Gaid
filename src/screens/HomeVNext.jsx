import React, { useRef, useState } from 'react';
import { Button, Card, ConciergeLoading, Drawer, GaidLogo, Tag } from '../components/ui.jsx';
import { Icon } from '../components/icons.jsx';
import { useAccount } from '../core/store.jsx';
import { buildSummary, buildTimeline, decide, requiredWizardStep, wizardAnswerPatch } from '../vnext/agent.js';

const INTEREST_OPTIONS = ['Gastronomia', 'Cultura', 'Natureza', 'Compras', 'Praias', 'Vida noturna', 'Parques', 'Luxo', 'Experiências locais'];

async function buildTimelineWithGptFallback(context, profile) {
  const fallback = () => buildTimeline(context, profile);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 9000);
  try {
    const days = Number(context.durationDays || 3);
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        message: `Crie uma primeira versão de roteiro para ${context.destination} com ${days} dias. Use interesses: ${(context.interests || []).join(', ') || 'equilibrado'}.`,
        history: [],
        context: {
          surface: 'vnext',
          initialItinerary: true,
          itineraryDays: days,
          destination: context.destination,
          interests: context.interests || [],
          profile: {
            travelerProfile: profile?.travelerProfile || null,
            preferences: profile?.preferences || null,
          },
        },
      }),
    });
    if (!response.ok) return fallback();
    const payload = await response.json();
    const suggestions = Array.isArray(payload.itinerarySuggestions) ? payload.itinerarySuggestions : [];
    if (!suggestions.length) return fallback();
    return suggestionsToTimeline(context, suggestions, profile);
  } catch (_error) {
    return fallback();
  } finally {
    window.clearTimeout(timer);
  }
}

function suggestionsToTimeline(context, suggestions, profile) {
  const base = buildTimeline(context, profile).map(day => ({ ...day, items: [] }));
  const slots = ['manhã', 'tarde', 'noite'];
  suggestions.forEach((item, index) => {
    const dayIndex = Math.max(0, Math.min(base.length - 1, Number(item.day || Math.floor(index / 3) + 1) - 1));
    const slot = ['manhã', 'tarde', 'noite'].includes(item.slot) ? item.slot : slots[index % 3];
    base[dayIndex].items.push({
      id: `gpt-${dayIndex}-${slot}-${index}`,
      slot,
      title: item.title || `Experiência em ${context.destination}`,
      place: item.place || 'A definir',
      duration: item.dur || item.duration || 'A definir',
      tag: item.tag || 'roteiro',
      vibe: item.vibe || '',
      confirmed: false,
    });
  });
  return base.map((day) => {
    if (day.items.length >= 3) return day;
    const fallbackDay = buildTimeline({ ...context, durationDays: 1 }, profile)[0];
    const usedSlots = new Set(day.items.map(item => item.slot));
    return {
      ...day,
      items: [
        ...day.items,
        ...fallbackDay.items.filter(item => !usedSlots.has(item.slot)).slice(0, 3 - day.items.length),
      ],
    };
  });
}

const questionForStep = (step) => ({
  destination: 'Para onde você quer viajar?',
  duration: 'Quantos dias?',
  travelers: 'Quem vai?',
  interests: 'O que mais combina com essa viagem?',
  review: 'Pronto para gerar?',
}[step] || 'Me conte um pouco mais.');

const HomeVNext = ({ setRoute }) => {
  const acct = useAccount();
  const [input, setInput] = useState('');
  const [feed, setFeed] = useState([]);
  const [wizard, setWizard] = useState({ active: false, step: null, context: {}, answers: [] });
  const [timeline, setTimeline] = useState(null);
  const [lastRecommendation, setLastRecommendation] = useState(null);
  const [drawerItem, setDrawerItem] = useState(null);
  const [replanPreview, setReplanPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const timeoutRef = useRef(null);

  const state = { activeTrip: timeline, lastRecommendation };
  const firstName = acct.user?.firstName || acct.user?.name?.split(' ')?.[0] || '';

  const push = (surface) => setFeed(prev => [...prev, { id: `${Date.now()}-${prev.length}`, ...surface }]);

  const renderDecision = (decision) => {
    if (decision.surface === 'short_message') {
      push({ type: 'short_message', body: decision.message });
      return;
    }
    if (decision.surface === 'wizard') {
      setWizard({ active: true, step: decision.step, context: decision.context || {}, answers: [] });
      push({ type: 'short_message', body: 'Vou perguntar só o que falta para montar uma boa primeira versão.' });
      return;
    }
    if (decision.surface === 'generate_itinerary') {
      generate(decision.context, []);
      return;
    }
    if (decision.surface === 'recommendation_cards') {
      const payload = { destination: decision.destination, cards: decision.cards, variant: decision.variant || 0 };
      setLastRecommendation(payload);
      push({ type: 'recommendation_cards', ...payload, refinementQuestion: decision.refinementQuestion });
      return;
    }
    if (decision.surface === 'timeline_action') {
      setTimeline(decision.edit.timeline);
      push({ type: 'short_message', body: decision.edit.message });
      return;
    }
    if (decision.surface === 'replanning_preview') {
      setReplanPreview(decision.preview);
      push({ type: 'replanning_preview', preview: decision.preview });
      return;
    }
    if (decision.surface === 'checklist') {
      push({ type: 'checklist', checklist: decision.checklist });
    }
  };

  const submit = (value = input) => {
    const text = String(value || '').trim();
    if (!text || loading) return;
    setInput('');
    if (wizard.active && wizard.step !== 'review') {
      answerWizard(text);
      return;
    }
    push({ type: 'user', body: text });
    renderDecision(decide(text, state, acct.profile));
  };

  const answerWizard = (answer) => {
    const patch = wizardAnswerPatch(wizard.step, answer);
    if (!patch || (wizard.step === 'duration' && !patch.durationDays)) {
      push({ type: 'short_message', body: wizard.step === 'duration' ? 'Me diga a duração, por exemplo “8 dias”.' : 'Preciso de uma resposta um pouco mais clara para continuar.' });
      return;
    }
    const context = { ...wizard.context, ...patch };
    const answers = [...wizard.answers, { question: questionForStep(wizard.step), answer: Array.isArray(answer) ? answer.join(', ') : String(answer) }];
    setWizard({ active: true, step: requiredWizardStep(context), context, answers });
  };

  const generate = (context, answers) => {
    if (loadingRef.current || loading) return;
    if (!context?.destination || !context?.durationDays) {
      push({ type: 'short_message', body: 'Para montar o roteiro, preciso primeiro saber destino e duração.' });
      setWizard({ active: true, step: requiredWizardStep(context || {}), context: context || {}, answers: answers || [] });
      return;
    }
    loadingRef.current = true;
    setLoading(true);
    push({ type: 'loading' });
    timeoutRef.current = window.setTimeout(() => {
      if (!loadingRef.current) return;
      loadingRef.current = false;
      setLoading(false);
      setFeed(prev => prev.filter(item => item.type !== 'loading'));
      push({ type: 'short_message', body: 'Demorei mais do que deveria. Vou criar uma versão local segura para você.', actions: [{ label: 'Gerar versão local', onClick: () => generate(context, answers) }] });
    }, 45000);
    window.setTimeout(async () => {
      if (!loadingRef.current) return;
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      loadingRef.current = false;
      setLoading(false);
      const days = await buildTimelineWithGptFallback(context, acct.profile);
      const summary = buildSummary(answers, context);
      const trip = { id: `vnext-${Date.now()}`, title: `Roteiro para ${context.destination}`, destination: context.destination, context, summary, days };
      setTimeline(trip);
      setWizard({ active: false, step: null, context: {}, answers: [] });
      setFeed(prev => [
        ...prev.filter(item => item.type !== 'loading'),
        { id: `summary-${Date.now()}`, type: 'user', body: summary },
        { id: `done-${Date.now()}`, type: 'short_message', body: 'Montei a primeira versão do roteiro. Agora você pode pedir ajustes como “troque esse restaurante” ou “vai chover amanhã”.' },
      ]);
      try {
        const saved = JSON.parse(localStorage.getItem('gaid:vnext-trips') || '[]');
        localStorage.setItem('gaid:vnext-trips', JSON.stringify([trip, ...saved].slice(0, 10)));
      } catch (_error) {
        // Best-effort local persistence for vNext.
      }
    }, 900);
  };

  const applyReplan = () => {
    if (!timeline || !replanPreview) return;
    const next = { ...timeline, days: timeline.days.map(day => ({ ...day, items: [...day.items] })) };
    if (next.days[0]?.items?.[1]) {
      next.days[0].items[1] = {
        ...next.days[0].items[1],
        title: `Alternativa coberta em ${next.destination}`,
        place: 'Museu, mercado gastronômico ou experiência indoor',
        tag: 'plano B',
        vibe: 'seguro para clima ruim',
      };
    }
    setTimeline(next);
    setReplanPreview(null);
    push({ type: 'short_message', body: 'Pronto — apliquei a mudança sugerida no roteiro.' });
  };

  const starters = timeline
    ? ['Vai chover amanhã', 'Troque esse restaurante', 'Preciso de visto?']
    : ['roteiro para Turquia em agosto por 8 dias', 'Onde jantar em Paris?', 'Preciso de visto?'];

  return (
    <div className="min-h-screen bg-canvas">
      <header className="px-4 sm:px-6 lg:px-10 pt-5 lg:pt-7 flex items-center justify-between gap-4">
        <GaidLogo className="h-8 w-auto max-w-[112px]"/>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setRoute('explore')}>Dicas</Button>
          <Button size="sm" variant="secondary" onClick={() => setRoute('trips')}>Roteiros</Button>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-10 py-8 lg:py-10">
        <section className="max-w-[920px] mx-auto text-center">
          <Tag tone="brand" className="mx-auto"><Icon.Sparkles size={12}/> Gaid vNext · Agent first</Tag>
          <h1 className="mt-4 text-[34px] sm:text-[46px] lg:text-[58px] leading-[1.04] tracking-[-0.025em] font-serif font-medium text-ink-900">
            {firstName ? `Olá, ${firstName}.` : 'Olá.'}
            <br/>
            <span className="serif-i">Converse. A Gaid executa.</span>
          </h1>
          <p className="mt-4 text-[14.5px] sm:text-[16px] text-ink-600 max-w-[620px] mx-auto leading-relaxed">
            Roteiros viram timeline, recomendações viram cards, documentação vira checklist.
          </p>
          <div className="mt-7 mx-auto max-w-[760px] bg-white border-half rounded-[28px] shadow-card px-4 py-3 flex items-center gap-3 focus-within:border-brand-200 focus-within:ring-4 focus-within:ring-brand-50">
            <Icon.Sparkles size={16} className="text-ink-500 shrink-0"/>
            <input value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => event.key === 'Enter' && submit()} disabled={loading}
              placeholder={loading ? 'Concierge trabalhando...' : 'Ex: roteiro para Turquia em agosto por 8 dias'}
              className="flex-1 min-w-0 h-10 outline-none bg-transparent text-[14.5px] placeholder:text-ink-400 disabled:opacity-50"/>
            <Button onClick={() => submit()} disabled={loading} icon={Icon.Send}>Enviar</Button>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {starters.map(starter => (
              <button key={starter} onClick={() => submit(starter)}
                className="h-8 px-3 rounded-full border-half bg-white text-[12.5px] text-ink-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700">
                {starter}
              </button>
            ))}
          </div>
        </section>

        <section className="max-w-[1160px] mx-auto mt-8 grid grid-cols-1 xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] gap-5">
          <Card className="p-4 sm:p-5 min-h-[420px]">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="label">Agent</div>
                <h2 className="text-[19px] font-medium text-ink-900 tracking-tight">Superfícies controladas</h2>
              </div>
              {feed.length > 0 && <Button size="sm" variant="ghost" onClick={() => { setFeed([]); setTimeline(null); setWizard({ active: false, step: null, context: {}, answers: [] }); }}>Limpar</Button>}
            </div>
            <div className="space-y-4">
              {feed.length === 0 && <div className="rounded-2xl bg-ink-50 px-4 py-5 text-[13.5px] text-ink-600">Comece com um roteiro, uma dica ou uma pergunta de documentação.</div>}
              {feed.map(item => <Surface key={item.id} item={item} onDetails={setDrawerItem} onAction={(action) => action?.onClick?.()}/>)}
            </div>
          </Card>

          <div className="space-y-5">
            {wizard.active && (
              <WizardSurface wizard={wizard} onAnswer={answerWizard} onGenerate={() => generate(wizard.context, wizard.answers)} onCancel={() => setWizard({ active: false, step: null, context: {}, answers: [] })}/>
            )}
            {loading && <ConciergeLoading category="planning"/>}
            {timeline ? <TimelineSurface timeline={timeline}/> : <EmptyTimeline/>}
          </div>
        </section>
      </main>

      <Drawer open={!!drawerItem} onClose={() => setDrawerItem(null)} title={drawerItem?.name || 'Detalhes'} width={500}>
        {drawerItem && <RecommendationDetail item={drawerItem}/>}
      </Drawer>

      <Drawer open={!!replanPreview} onClose={() => setReplanPreview(null)} title="Preview de mudança" width={520}
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setReplanPreview(null)}>Cancelar</Button><Button onClick={applyReplan}>Aplicar</Button></div>}>
        {replanPreview && <ReplanningPreview preview={replanPreview}/>}
      </Drawer>
    </div>
  );
};

const Surface = ({ item, onDetails, onAction }) => {
  if (item.type === 'user') return <div className="flex justify-end"><div className="max-w-[86%] rounded-2xl rounded-tr-md bg-ink-900 text-paper px-4 py-2.5 text-[13.5px] whitespace-pre-line">{item.body}</div></div>;
  if (item.type === 'loading') return <ConciergeLoading category="planning"/>;
  if (item.type === 'recommendation_cards') return <RecommendationCards item={item} onDetails={onDetails}/>;
  if (item.type === 'checklist') return <ChecklistSurface checklist={item.checklist}/>;
  if (item.type === 'replanning_preview') return <ReplanningPreview preview={item.preview}/>;
  return (
    <div className="max-w-[88%] text-[14px] text-ink-900 leading-relaxed">
      {item.body}
      {Array.isArray(item.actions) && <div className="mt-3 flex flex-wrap gap-2">{item.actions.map(action => <Button key={action.label} size="sm" variant="secondary" onClick={() => onAction(action)}>{action.label}</Button>)}</div>}
    </div>
  );
};

const RecommendationCards = ({ item, onDetails }) => (
  <div className="space-y-3">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {item.cards.map(card => (
        <div key={card.id} className="rounded-2xl border-half bg-white p-4 shadow-soft">
          <div className="text-[10.5px] uppercase tracking-wider text-ink-500">{card.category}</div>
          <div className="text-[14px] font-medium text-ink-900 mt-1 leading-snug">{card.name}</div>
          <div className="text-[12px] text-ink-500 mt-1">{card.area}</div>
          <div className="text-[12.5px] text-ink-700 mt-3 leading-snug">{card.reason}</div>
          <Button size="sm" variant="secondary" className="mt-4" onClick={() => onDetails(card)}>Ver detalhes</Button>
        </div>
      ))}
    </div>
    <div className="text-[13px] text-ink-800">{item.refinementQuestion}</div>
  </div>
);

const WizardSurface = ({ wizard, onAnswer, onGenerate, onCancel }) => {
  const [custom, setCustom] = useState('');
  const [selected, setSelected] = useState([]);
  const step = wizard.step;
  if (step === 'review') {
    const rows = [
      ['Destino', wizard.context.destination],
      ['Duração', wizard.context.durationDays ? `${wizard.context.durationDays} dias` : null],
      ['Quem vai', wizard.context.travelers?.count ? `${wizard.context.travelers.count} · ${wizard.context.travelerComposition}` : wizard.context.travelerComposition],
      ['Interesses', (wizard.context.interests || []).join(', ')],
    ].filter(([, value]) => value);
    return (
      <Card className="p-5 space-y-4">
        <div><div className="label">Wizard</div><h3 className="text-[18px] font-medium text-ink-900">Revisar e gerar</h3></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{rows.map(([label, value]) => <InfoCell key={label} label={label} value={value}/>)}</div>
        <div className="flex flex-wrap justify-between gap-2"><Button variant="ghost" onClick={onCancel}>Cancelar</Button><Button onClick={onGenerate}>Gerar roteiro</Button></div>
      </Card>
    );
  }
  const isInterests = step === 'interests';
  const options = step === 'duration' ? ['3 dias', '5 dias', '8 dias', '10 dias', '14 dias'] : step === 'travelers' ? ['Só eu', 'Casal', 'Família', 'Amigos'] : isInterests ? INTEREST_OPTIONS : [];
  const submit = () => {
    const answer = isInterests ? [...selected, custom.trim()].filter(Boolean).join(', ') : custom.trim();
    if (!answer) return;
    onAnswer(answer);
    setCustom('');
    setSelected([]);
  };
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-3"><div className="label">Wizard</div><button onClick={onCancel} className="h-8 w-8 rounded-lg hover:bg-ink-100 text-ink-500 flex items-center justify-center"><Icon.X size={14}/></button></div>
      <div><h3 className="text-[18px] font-medium text-ink-900">{questionForStep(step)}</h3><p className="text-[12.5px] text-ink-500 mt-1">Responda aqui. Isso não vira chat solto.</p></div>
      {options.length > 0 && <div className="flex flex-wrap gap-2">{options.map(option => {
        const active = selected.includes(option);
        return <button key={option} onClick={() => isInterests ? setSelected(prev => active ? prev.filter(item => item !== option) : [...prev, option]) : onAnswer(option)}
          className={`h-9 px-3 rounded-full border-half text-[12.5px] transition-colors ${active ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white text-ink-700 hover:border-brand-200 hover:bg-brand-50'}`}>{option}</button>;
      })}</div>}
      <div className="rounded-2xl border-half bg-paper px-3 py-2 flex items-center gap-2">
        <input value={custom} onChange={event => setCustom(event.target.value)} onKeyDown={event => event.key === 'Enter' && submit()} placeholder={step === 'destination' ? 'Digite o destino...' : 'Ou descreva com suas palavras...'} className="flex-1 min-w-0 bg-transparent outline-none text-[13px] placeholder:text-ink-400"/>
        <Button size="sm" onClick={submit}>{isInterests ? 'Continuar' : 'Enviar'}</Button>
      </div>
    </Card>
  );
};

const TimelineSurface = ({ timeline }) => (
  <Card className="p-5">
    <div className="flex items-start justify-between gap-4 mb-4">
      <div><div className="label">Timeline</div><h2 className="text-[21px] font-serif font-medium text-ink-900">{timeline.title}</h2></div>
      <Tag tone="sage">{timeline.days.length} dias</Tag>
    </div>
    <div className="space-y-4">{timeline.days.map(day => <div key={day.d} className="rounded-2xl border-half bg-white p-4">
      <div className="flex items-center justify-between mb-3"><div className="text-[14px] font-medium text-ink-900">Dia {day.d}</div><div className="text-[12px] text-ink-500">{day.city}</div></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">{day.items.map(item => <div key={item.id} className="rounded-xl bg-paper border-half px-3 py-3">
        <div className="text-[10.5px] uppercase tracking-wide text-ink-400">{item.slot}</div>
        <div className="text-[13px] font-medium text-ink-900 mt-1">{item.title}</div>
        <div className="text-[12px] text-ink-500 mt-1">{item.place}</div>
        <div className="text-[11.5px] text-ink-500 mt-2">{item.duration} · {item.tag}</div>
      </div>)}</div>
    </div>)}</div>
  </Card>
);

const EmptyTimeline = () => (
  <Card className="p-5 min-h-[300px] flex items-center">
    <div><div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center mb-4"><Icon.Calendar size={17}/></div><div className="text-[18px] font-serif font-medium text-ink-900">Timeline</div><p className="text-[13.5px] text-ink-500 mt-2 leading-relaxed max-w-[420px]">Quando a viagem existir, o roteiro aparece aqui. Não existe roteiro em markdown.</p></div>
  </Card>
);

const ChecklistSurface = ({ checklist }) => (
  <div className="rounded-2xl border-half bg-white p-4 shadow-soft max-w-[560px]">
    <div className="label">Checklist</div>
    <div className="text-[15px] font-medium text-ink-900 mt-1">{checklist.title}</div>
    <div className="mt-3 space-y-2">{checklist.items.map(item => <div key={item} className="flex gap-2 text-[13px] text-ink-700"><Icon.Check size={14} className="text-brand-700 mt-0.5 shrink-0"/><span>{item}</span></div>)}</div>
    <div className="text-[12px] text-ink-500 mt-3">{checklist.context}</div>
  </div>
);

const ReplanningPreview = ({ preview }) => (
  <div className="space-y-3">
    <div className="rounded-2xl border-half bg-white p-4 shadow-soft">
      <div className="label">Preview</div>
      <div className="text-[14px] font-medium text-ink-900 mt-1">{preview.problem}</div>
      <div className="mt-3 space-y-2">{preview.changes.map((change, index) => <div key={index} className="rounded-xl bg-paper border-half p-3 text-[13px] text-ink-700">Dia {change.day}: trocar {change.from} por {change.to}</div>)}</div>
      <div className="text-[12.5px] text-ink-500 mt-3">{preview.impact}</div>
    </div>
  </div>
);

const RecommendationDetail = ({ item }) => (
  <div className="space-y-4">
    <Tag tone="brand">{item.category}</Tag>
    <p className="text-[14px] text-ink-800 leading-relaxed">{item.reason}</p>
    <InfoCell label="Área" value={item.area}/>
    <InfoCell label="Ideal para" value={item.idealFor}/>
    <InfoCell label="Cuidados" value={item.caution}/>
    <InfoCell label="Fonte" value={item.source}/>
    <InfoCell label="Confiança" value={`${Math.round((item.confidence || 0.8) * 100)}%`}/>
    <div className="flex flex-wrap gap-2">{(item.tags || []).map(tag => <Tag key={tag} tone="muted">{tag}</Tag>)}</div>
  </div>
);

const InfoCell = ({ label, value }) => <div className="rounded-xl border-half bg-paper px-3 py-2"><div className="text-[10.5px] uppercase tracking-wide text-ink-400">{label}</div><div className="text-[13px] text-ink-900 mt-0.5">{value}</div></div>;

export { HomeVNext };
