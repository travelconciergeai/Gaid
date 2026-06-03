import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '../components/icons.jsx';
import { Placeholder, Button, Tag, Card, Modal, Drawer, SmartImg, Portrait, useToast, Topbar, SectionHeader, Stat, TabRow, OptimizeMenu, AddToTripDrawer } from '../components/ui.jsx';
import { EmptyState, EmptyInline } from './EmptyStates.jsx';
import { Async, CardSkeleton, CatalogCarousel, Carousel, Skeleton, ErrorState, CarouselSkeleton } from '../core/states.jsx';
import { useAccount, useTrips, useCatalog, deriveTraits, profileCompletion } from '../core/store.jsx';
import { TBD, has, orTBD, fmtDuration, fmtMoney } from '../core/contracts.jsx';
import { tripApi } from '../core/tripApi.jsx';
// Plan screen — chat at left, live timeline at right.
// Itinerary is fully editable: add/remove items, change time slot, replace activity.

const slotIcon = { 'manhã': Icon.Sun, 'tarde': Icon.Sunset, 'noite': Icon.Moon };

// Itinerary quick-action buttons (UI config, not data).
const QUICK_ACTIONS = [
  { id: 'date', label: 'Mudar datas',       icon: 'Calendar' },
  { id: 'bud',  label: 'Ajustar orçamento', icon: 'Sliders'  },
  { id: 'add',  label: 'Adicionar dia',     icon: 'Plus'     },
  { id: 'opt',  label: 'Otimizar roteiro',  icon: 'Sparkles' },
];

// Safe empty trip so the screen renders cleanly before a trip exists.
const EMPTY_TRIP = { id: null, title: 'Sua viagem', blurb: '', dates: TBD, nights: null, travelers: TBD, budget: TBD, status: 'Em planejamento', cover: 'warm', coverSeed: 'gaid', coverLabel: '', progress: 0, days: [], insights: [], prep: null };

function safeClone(value) {
  return JSON.parse(JSON.stringify(value || []));
}
function normalizeDays(value) {
  return Array.isArray(value)
    ? value.map((day, idx) => ({
      ...day,
      d: day?.d ?? idx + 1,
      date: day?.date || TBD,
      city: day?.city || TBD,
      items: Array.isArray(day?.items) ? day.items : [],
    }))
    : [];
}
function normalizeInsights(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}
function normalizeTripForPlan(trip) {
  const base = trip || EMPTY_TRIP;
  return {
    ...EMPTY_TRIP,
    ...base,
    days: normalizeDays(base.days),
    insights: normalizeInsights(base.insights),
  };
}
function storedMessageToBubble(message) {
  if (!message || !message.content) return null;
  return {
    id: message.id,
    who: message.role === 'user' ? 'user' : 'gaid',
    text: message.content,
    source: message.source || message.metadata?.source,
  };
}
function normText(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function normalizeSuggestionSlot(value) {
  const slot = normText(value).trim();
  if (slot === 'manha') return 'manhã';
  if (slot === 'tarde') return 'tarde';
  if (slot === 'noite') return 'noite';
  return null;
}
function normalizeItinerarySuggestions(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const day = Number(item.day);
    const title = String(item.title || '').trim();
    if (!title) return null;
    return {
      day: Number.isFinite(day) && day >= 1 ? Math.floor(day) : null,
      slot: normalizeSuggestionSlot(item.slot),
      title,
      place: String(item.place || TBD).trim() || TBD,
      dur: String(item.dur || TBD).trim() || TBD,
      tag: String(item.tag || 'item').trim() || 'item',
      vibe: String(item.vibe || '').trim(),
    };
  }).filter(Boolean);
}
function suggestionsHavePlacement(suggestions) {
  const normalized = normalizeItinerarySuggestions(suggestions);
  return normalized.length > 0 && normalized.every(item => item.day && item.slot);
}
function isApplyIntent(value) {
  const text = normText(value);
  return /(adicionar ao roteiro|aplicar ao roteiro|pode adicionar|coloca no roteiro|incluir no roteiro|gostei,\s*adiciona|gostei.*adiciona)/.test(text);
}
function parsePlacement(value) {
  const text = normText(value);
  const dayMatch = text.match(/\bdia\s*(\d+)\b/) ||
    text.match(/\b(\d+)\s*(?:o|º)?\s*dia\b/) ||
    (/\bprimeiro\b/.test(text) ? [, '1'] : null) ||
    (/\bsegundo\b/.test(text) ? [, '2'] : null) ||
    (/\bterceiro\b/.test(text) ? [, '3'] : null);
  const day = Number(dayMatch?.[1]);
  const slot = /\bmanh/.test(text)
    ? 'manhã'
    : /\btarde\b/.test(text)
      ? 'tarde'
      : /\bnoite\b/.test(text)
        ? 'noite'
        : null;
  if (!Number.isFinite(day) || day < 1 || !slot) return null;
  return { day: Math.floor(day), slot };
}
function latestSuggestionMessageIndex(messages) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.who === 'gaid' && !message.ctaApplied && normalizeItinerarySuggestions(message.itinerarySuggestions).length > 0) {
      return index;
    }
  }
  return -1;
}
function assistantResponseToBubble(response) {
  const itinerarySuggestions = normalizeItinerarySuggestions(response?.itinerarySuggestions);
  return {
    who: 'gaid',
    text: response.text,
    source: response.source,
    itinerarySuggestions,
    cta: itinerarySuggestions.length > 0 ? ['Adicionar ao roteiro'] : null,
  };
}
function boundedDayCount(value) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.min(Math.max(Math.floor(count), 1), 14) : null;
}
function inclusiveDateDayCount(dates) {
  const start = dates?.start ? new Date(dates.start) : null;
  const end = dates?.end ? new Date(dates.end) : null;
  if (!start || !end || isNaN(start) || isNaN(end) || end < start) return null;
  const days = Math.round((end - start) / 86400000) + 1;
  return boundedDayCount(days);
}
function inferInitialItineraryDuration(trip, kickoff) {
  const dateDays = inclusiveDateDayCount(trip.tripContext?.dates);
  if (dateDays) return { days: dateDays, assumed: false };
  const explicit = boundedDayCount(trip.nights ?? trip.tripContext?.nights);
  if (explicit) return { days: explicit, assumed: false };
  const text = normText(`${trip.destination || ''} ${trip.title || ''} ${kickoff || ''} ${JSON.stringify(trip.tripContext || {})}`);
  if (/orlando|disney|parque/.test(text)) return { days: 6, assumed: true };
  if (/japao|japan|toquio|tokyo|kyoto|quioto|europa|multi.?city|multicidade|lisboa.*porto|paris.*roma|londres.*paris/.test(text)) {
    return { days: 10, assumed: true };
  }
  if (/praia|beach|buzios|búzios|rio de janeiro|florianopolis|florianópolis|bahia|nordeste|caribe/.test(text)) {
    return { days: 4, assumed: true };
  }
  return { days: 3, assumed: true };
}
function buildInitialItineraryPrompt(kickoff, trip, duration) {
  const assumption = duration.assumed
    ? `Como a duracao nao foi definida, assuma ${duration.days} dias e diga isso naturalmente no texto.`
    : `Use ${duration.days} dias como duracao do roteiro.`;
  return [
    kickoff,
    '',
    'Crie uma primeira versao de roteiro inicial para preencher a timeline agora.',
    assumption,
    'Retorne itinerarySuggestions obrigatoriamente com day, slot, title, place, dur, tag e vibe para cada item.',
    'Use apenas slots "manhã", "tarde" ou "noite".',
    `Sugira exatamente 3 itens por dia: 1 de manhã, 1 de tarde e 1 de noite, por ${duration.days} dias.`,
    'Os itens devem ser especificos para o destino e preferências da viagem, nao placeholders genericos.',
    'Nao invente reservas, precos, disponibilidade, hoteis ou voos confirmados.',
    `Contexto da viagem: ${JSON.stringify(trip.tripContext || {}).slice(0, 1200)}`,
  ].join('\n');
}
function withDurationAssumptionText(text, duration) {
  if (!duration.assumed) return text;
  const clean = String(text || '').trim();
  const note = `Como você ainda não definiu a duração, montei uma primeira versão com ${duration.days} dias. Se quiser, eu ajusto para mais ou menos dias.`;
  return normText(clean).includes('nao definiu a duracao') || normText(clean).includes('não definiu a duração')
    ? clean
    : `${note}\n\n${clean}`;
}
function completeInitialSuggestions(suggestions, duration) {
  const normalized = normalizeItinerarySuggestions(suggestions);
  const slots = ['manhã', 'tarde', 'noite'];
  return normalized.map((item, index) => ({
    ...item,
    day: item.day || (Math.floor(index / slots.length) % duration.days) + 1,
    slot: item.slot || slots[index % slots.length],
  }));
}
const PlanScreen = ({ kickoff, clearKickoff, setRoute, trip }) => {
  const toast = useToast();
  const tripData = useMemo(() => normalizeTripForPlan(trip), [trip]);
  const [tab, setTab] = useState('roteiro');
  const [chat, setChat] = useState(() => []);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const [days, setDays] = useState(() => safeClone(tripData.days));
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [activeMode, setActiveMode] = useState(null);
  const [prep, setPrep] = useState(() => tripData.prep ? JSON.parse(JSON.stringify(tripData.prep)) : null);
  const [pendingPlacementMessageIndex, setPendingPlacementMessageIndex] = useState(null);
  const chatEndRef = useRef(null);
  const kickoffKeyRef = useRef(null);

  const persistPlanMessage = (role, text, metadata = {}) => {
    if (!tripData.id || !text) return Promise.resolve(null);
    return tripApi.createChatMessage({
      tripId: tripData.id,
      role,
      text,
      metadata: { surface: 'plan', ...metadata },
    }).catch((error) => {
      console.error('[PlanScreen] Failed to persist chat message', error);
      return null;
    });
  };

  // If trip changes (user opened a different trip), reset state.
  useEffect(() => {
    setDays(safeClone(tripData.days));
    setActiveMode(null);
    setEditing(null);
    setAdding(null);
    setPendingPlacementMessageIndex(null);
    setPrep(tripData.prep ? JSON.parse(JSON.stringify(tripData.prep)) : null);
    let alive = true;
    if (!tripData.id) {
      setChat([]);
      return () => { alive = false; };
    }
    tripApi.listChatMessages(tripData.id)
      .then((messages) => {
        if (!alive) return;
        const restored = (messages || []).map(storedMessageToBubble).filter(Boolean);
        if (restored.length > 0 || !kickoff) setChat(restored);
      })
      .catch((error) => {
        console.error('[PlanScreen] Failed to load chat history', error);
        if (alive && !kickoff) setChat([]);
      });
    return () => { alive = false; };
  }, [tripData.id]);

  // Toggle a prep checklist item done/undone.
  const togglePrep = (gi, ii) => {
    setPrep(p => p && p.map((g, gx) => gx !== gi ? g : ({
      ...g, items: g.items.map((it, ix) => ix !== ii ? it : { ...it, done: !it.done })
    })));
  };

  // Try to resolve a prep item from a free-text chat message (e.g. "já peguei o
  // passaporte do Joaquim"). Returns the matched item label or null.
  const resolvePrepFromText = (text) => {
    if (!prep) return null;
    const s = text.toLowerCase();
    const KEYS = {
      passaporte: ['passaporte'],
      visto: ['visto'],
      'certidão': ['certidão', 'certidao', 'nascimento'],
      seguro: ['seguro'],
      autorização: ['autorização', 'autorizacao'],
      microchip: ['microchip', 'chip'],
      antirrábica: ['antirráb', 'antirrab', 'vacina', 'raiva'],
      veterinário: ['cvi', 'veterinár', 'veterinar', 'atestado'],
      bolsa: ['bolsa', 'caixa', 'transporte'],
      ração: ['ração', 'racao', 'kit'],
      carrinho: ['carrinho'],
      protetor: ['protetor', 'solar'],
      pulseira: ['pulseira', 'identificação', 'identificacao'],
      refeição: ['refeição infantil', 'refeicao infantil'],
    };
    let matchedGi = -1, matchedIi = -1, matchedLabel = null;
    prep.forEach((g, gi) => g.items.forEach((it, ii) => {
      if (it.done) return;
      const label = it.label.toLowerCase();
      // direct substring of a meaningful word from the label
      const hit = Object.values(KEYS).some(words =>
        words.some(w => s.includes(w) && label.includes(w.split(' ')[0])));
      if (hit && matchedGi === -1) { matchedGi = gi; matchedIi = ii; matchedLabel = it.label; }
    }));
    if (matchedGi >= 0) { togglePrep(matchedGi, matchedIi); return matchedLabel; }
    return null;
  };

  const applyMode = (m) => {
    setActiveMode(m);
    toast({ title: `Roteiro otimizado: ${m.label}`, tone: 'success', desc: m.delta || 'Mudanças aplicadas. Desfazer disponível.' });
    setChat(c => [...c, { who: 'gaid', text: `Apliquei o modo “${m.label}” ao seu roteiro. ${m.delta ? `(${m.delta})` : ''} Posso ajustar mais alguma coisa?` }]);
  };

  const placeholderDay = (dayNumber) => ({
    d: dayNumber,
    date: TBD,
    city: tripData.destination || tripData.tripContext?.destination || TBD,
    flight: false,
    items: [],
  });

  const applySuggestionListToTimeline = (suggestions, placement = null) => {
    const normalized = normalizeItinerarySuggestions(suggestions);
    const placedSuggestions = normalized.map(item => ({
      ...item,
      day: item.day || placement?.day,
      slot: item.slot || placement?.slot,
    })).filter(item => item.day && item.slot);
    if (placedSuggestions.length === 0) return 0;
    setDays(currentDays => {
      const nextDays = normalizeDays(currentDays).map(day => ({ ...day, items: [...day.items] }));
      const maxDay = Math.max(...placedSuggestions.map(item => item.day));
      for (let dayNumber = 1; dayNumber <= maxDay; dayNumber += 1) {
        if (!nextDays.some(day => day.d === dayNumber)) nextDays.push(placeholderDay(dayNumber));
      }
      placedSuggestions.forEach((suggestion) => {
        const day = nextDays.find(item => item.d === suggestion.day);
        if (!day) return;
        day.items.push({
          t: suggestion.slot,
          title: suggestion.title,
          place: suggestion.place,
          dur: suggestion.dur,
          tag: suggestion.tag,
          vibe: suggestion.vibe,
          conf: false,
        });
      });
      return nextDays.sort((a, b) => a.d - b.d);
    });
    return placedSuggestions.length;
  };

  const applyItinerarySuggestions = (messageIndex, placement = null, { confirm = false } = {}) => {
    const message = chat[messageIndex];
    const suggestions = normalizeItinerarySuggestions(message?.itinerarySuggestions);
    if (suggestions.length === 0 || message?.ctaApplied) return 'none';
    if (!placement && !suggestionsHavePlacement(suggestions)) {
      setPendingPlacementMessageIndex(messageIndex);
      setChat(current => [...current, {
        who: 'gaid',
        text: 'Claro. Em qual dia e período você quer encaixar isso? Exemplos: “Dia 2 de manhã”, “Dia 3 à tarde”, “No primeiro dia à noite”.',
        source: 'local',
      }]);
      return 'needs-placement';
    }
    const appliedCount = applySuggestionListToTimeline(suggestions, placement);
    if (appliedCount === 0) return 'none';
    setChat(current => {
      const next = current.map((item, index) => index === messageIndex
        ? { ...item, cta: ['Adicionado ao roteiro'], ctaApplied: true }
        : item
      );
      return confirm
        ? [...next, { who: 'gaid', text: 'Pronto — adicionei isso ao roteiro.', source: 'local' }]
        : next;
    });
    setPendingPlacementMessageIndex(null);
    toast({ title: 'Adicionado ao roteiro', desc: `${appliedCount} sugestão${appliedCount === 1 ? '' : 'ões'} adicionada${appliedCount === 1 ? '' : 's'}.`, tone: 'success' });
    return 'applied';
  };

  useEffect(() => {
    chatEndRef.current?.scrollTo({ top: 99999, behavior: 'smooth' });
  }, [chat, typing]);

  // If user came from Home with a starter
  useEffect(() => {
    if (!kickoff || !tripData.id) return;
    const kickoffKey = `${tripData.id}:${kickoff}`;
    if (kickoffKeyRef.current === kickoffKey) return;
    kickoffKeyRef.current = kickoffKey;
    const isWizardKickoff = tripData.tripContext?.wizard?.completed === true;
    const duration = inferInitialItineraryDuration(tripData, kickoff);
    const chatMessage = isWizardKickoff
      ? buildInitialItineraryPrompt(kickoff, tripData, duration)
      : kickoff;
    const userMsg = { who: 'user', text: kickoff };
    setChat(c => c.some(m => m.who === 'user' && m.text === kickoff) ? c : [...c, userMsg]);
    persistPlanMessage('user', kickoff);
    setTyping(true);
    let alive = true;
    tripApi.sendChatMessage({
      message: chatMessage,
      history: [userMsg].map(m => ({ role: 'user', text: m.text })),
      context: {
        surface: 'plan',
        tripTitle: tripData.title,
        initialItinerary: isWizardKickoff,
        itineraryDays: duration.days,
        assumedDuration: duration.assumed,
        tripContext: tripData.tripContext,
      },
    }).then((response) => {
      if (!alive) return;
      setTyping(false);
      const suggestions = normalizeItinerarySuggestions(response.itinerarySuggestions);
      if (isWizardKickoff) {
        const initialSuggestions = suggestions.length > 0
          ? completeInitialSuggestions(suggestions, duration)
          : [];
        const text = initialSuggestions.length > 0
          ? withDurationAssumptionText('Montei uma primeira versão do roteiro para você. Podemos ajustar tudo a partir daqui.', duration)
          : 'Criei a estrutura dos dias do roteiro. Me peça para montar uma primeira versão quando quiser.';
        if (initialSuggestions.length > 0) {
          applySuggestionListToTimeline(initialSuggestions);
        }
        setChat(c => [...c, {
          who: 'gaid',
          text,
          source: initialSuggestions.length > 0 ? response.source : 'local',
          itinerarySuggestions: initialSuggestions,
          cta: null,
          ctaApplied: initialSuggestions.length > 0,
          initialKickoff: true,
        }]);
        persistPlanMessage('assistant', text, { source: initialSuggestions.length > 0 ? response.source : 'local', initialItinerary: true });
      } else {
        setChat(c => [...c, assistantResponseToBubble(response)]);
        persistPlanMessage('assistant', response.text, { source: response.source });
      }
      clearKickoff && clearKickoff();
    }).catch(() => {
      if (!alive) return;
      setTyping(false);
      const fallback = isWizardKickoff
        ? 'Criei a estrutura dos dias do roteiro. Me peça para montar uma primeira versão quando quiser.'
        : 'Não consegui responder agora. Tente novamente em instantes.';
      setChat(c => [...c, { who: 'gaid', text: fallback, source: isWizardKickoff ? 'local' : 'error' }]);
      persistPlanMessage('assistant', fallback, { source: isWizardKickoff ? 'local' : 'error', initialItinerary: isWizardKickoff });
      clearKickoff && clearKickoff();
    });
    return () => { alive = false; };
  }, [kickoff, tripData.id]);

  const send = async (txt) => {
    const t = (txt || draft).trim();
    if (!t) return;
    const userMsg = { who: 'user', text: t };
    const nextChat = [...chat, userMsg];
    setChat(nextChat);
    setDraft('');
    setTyping(true);
    persistPlanMessage('user', t);

    if (pendingPlacementMessageIndex !== null) {
      const placement = parsePlacement(t);
      setTyping(false);
      if (placement) {
        applyItinerarySuggestions(pendingPlacementMessageIndex, placement, { confirm: true });
        persistPlanMessage('assistant', 'Pronto — adicionei isso ao roteiro.', { source: 'local' });
      } else {
        const placementReply = 'Claro. Em qual dia e período você quer encaixar isso? Exemplos: “Dia 2 de manhã”, “Dia 3 à tarde”, “No primeiro dia à noite”.';
        setChat(c => [...c, { who: 'gaid', text: placementReply, source: 'local' }]);
        persistPlanMessage('assistant', placementReply, { source: 'local' });
      }
      return;
    }

    if (isApplyIntent(t)) {
      const suggestionIndex = latestSuggestionMessageIndex(nextChat);
      if (suggestionIndex >= 0) {
        setTyping(false);
        const message = nextChat[suggestionIndex];
        const suggestions = normalizeItinerarySuggestions(message.itinerarySuggestions);
        if (suggestionsHavePlacement(suggestions)) {
          applyItinerarySuggestions(suggestionIndex, null, { confirm: true });
          persistPlanMessage('assistant', 'Pronto — adicionei isso ao roteiro.', { source: 'local' });
        } else {
          setPendingPlacementMessageIndex(suggestionIndex);
          const placementReply = 'Claro. Em qual dia e período você quer encaixar isso? Exemplos: “Dia 2 de manhã”, “Dia 3 à tarde”, “No primeiro dia à noite”.';
          setChat(c => [...c, { who: 'gaid', text: placementReply, source: 'local' }]);
          persistPlanMessage('assistant', placementReply, { source: 'local' });
        }
        return;
      }
    }

    // First: did the user report resolving a prep item?
    const resolved = resolvePrepFromText(t);
    if (resolved) {
      setTyping(false);
      toast({ title: 'Atualizei seu checklist', desc: resolved, tone: 'success' });
      const localReply = `Maravilha! Marquei “${resolved}” como resolvido no seu checklist. Pode contar comigo pro resto.`;
      setChat(c => [...c, { who: 'gaid', text: localReply, source: 'local' }]);
      persistPlanMessage('assistant', localReply, { source: 'local' });
      return;
    }

    try {
      const response = await tripApi.sendChatMessage({
        message: t,
        history: nextChat
          .filter(m => m.text)
          .map(m => ({ role: m.who === 'user' ? 'user' : 'assistant', text: m.text })),
        context: { surface: 'plan', tripTitle: tripData.title, tab },
      });
      setChat(c => [...c, assistantResponseToBubble(response)]);
      persistPlanMessage('assistant', response.text, { source: response.source });
    } catch (_error) {
      const fallback = 'Não consegui responder agora. Tente novamente em instantes.';
      setChat(c => [...c, { who: 'gaid', text: fallback, source: 'error' }]);
      persistPlanMessage('assistant', fallback, { source: 'error' });
    } finally {
      setTyping(false);
    }
  };

  // Neutral conversational replies until the real chat/AI backend exists.
  // NEVER invents destinations, dates, hotels, itineraries or changes the user
  // did not state. Light intent detection only nudges the conversation forward.
  const replyFor = (t) => {
    const s = (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (/\b(ola|oi|opa|bom dia|boa tarde|boa noite|e ai)\b/.test(s))
      return 'Olá! Me conte para onde você quer viajar e eu ajudo você a montar um roteiro.';
    if (/(nao sei|sem ideia|nao faco ideia|talvez|qualquer)/.test(s))
      return 'Posso ajudar a encontrar um destino. Você pretende viajar sozinho, em casal, em família ou com amigos?';
    if (/(quero viajar|viajar|planejar|montar|roteiro|viagem)/.test(s))
      return 'Ótimo. Qual destino você tem em mente?';
    if (/(obrigad|valeu|legal|perfeito|otimo)/.test(s))
      return 'Por nada! Quando quiser, me diga o destino, quem vai e quando — e seguimos montando.';
    return 'Entendi. Me conte o destino, quem vai e quando — e eu começo a montar seu roteiro.';
  };

  // ---- itinerary actions ----
  const removeItem = (dayIdx, itemIdx) => {
    setDays(ds => ds.map((d, i) => i === dayIdx ? { ...d, items: d.items.filter((_, j) => j !== itemIdx) } : d));
    toast({ title: 'Item removido', tone: 'success' });
  };
  const togglePin = (dayIdx, itemIdx) => {
    setDays(ds => ds.map((d, i) => i === dayIdx
      ? { ...d, items: d.items.map((it, j) => j === itemIdx ? { ...it, conf: !it.conf } : it) }
      : d));
  };
  const updateItem = (dayIdx, itemIdx, patch) => {
    setDays(ds => ds.map((d, i) => i === dayIdx
      ? { ...d, items: d.items.map((it, j) => j === itemIdx ? { ...it, ...patch } : it) }
      : d));
  };
  const addItem = (dayIdx, slot, payload) => {
    setDays(ds => ds.map((d, i) => i === dayIdx
      ? { ...d, items: [...d.items, { t: slot, ...payload, conf: false }] }
      : d));
    toast({ title: 'Adicionado ao roteiro', tone: 'success', desc: payload.title });
  };

  return (
    <div className="grid grid-cols-[400px_1fr] xl:grid-cols-[440px_1fr] h-screen sticky top-0">
      {/* ---- LEFT: chat ---- */}
      <section className="border-r hairline flex flex-col bg-paper min-h-0">
        <header className="px-7 h-[60px] shrink-0 border-b hairline bg-paper flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-ink-900 text-paper flex items-center justify-center">
              <Icon.Logo size={13}/>
            </div>
            <span className="text-[15px] font-medium tracking-tight text-ink-900">Concierge AI</span>
          </div>
          <button className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500"><Icon.MoreH size={16}/></button>
        </header>

        <div ref={chatEndRef} className="flex-1 overflow-y-auto px-7 py-5 space-y-4">
          {chat.map((m, i) => <Bubble key={i} m={m} onCta={(t) => {
            if (t === 'Adicionar ao roteiro') applyItinerarySuggestions(i);
            else send(t);
          }} />)}
          {typing && (
            <div className="flex gap-1 pt-2">
              <span className="dot h-1.5 w-1.5 rounded-full bg-ink-400"/>
              <span className="dot h-1.5 w-1.5 rounded-full bg-ink-400"/>
              <span className="dot h-1.5 w-1.5 rounded-full bg-ink-400"/>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="px-7 pb-2 flex items-center gap-2 flex-wrap">
          {QUICK_ACTIONS.map(qa => {
            const Ic = Icon[qa.icon] || Icon.Sparkles;
            return (
              <button key={qa.id}
                onClick={() => send(qa.label.toLowerCase())}
                className="h-7 px-2.5 rounded-full bg-white border hairline text-[11.5px] text-ink-700 flex items-center gap-1.5 hover:border-ink-400 transition-colors">
                <Ic size={12}/>{qa.label}
              </button>
            );
          })}
        </div>

        {/* Composer — pill chatbar, mesmo formato da Home */}
        <div className="p-5 pt-2">
          <div className="bg-white border-half rounded-full shadow-card h-[56px] pl-5 pr-[6px] flex items-center gap-2 transition-shadow hover:shadow-lift focus-within:shadow-lift">
            <Icon.Sparkles size={15} className="text-ink-500 shrink-0"/>
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Pergunte qualquer coisa sobre sua viagem…"
              className="flex-1 h-full outline-none text-[14px] placeholder:text-ink-400 bg-transparent leading-none"/>
            <button className="h-9 w-9 rounded-full hover:bg-ink-100 text-ink-600 flex items-center justify-center shrink-0" title="Anexar">
              <Icon.Plus size={15}/>
            </button>
            <button onClick={() => send()}
              className="h-11 px-5 rounded-full bg-ink-900 text-paper hover:bg-ink-800 transition-colors flex items-center gap-2 text-[13.5px] font-medium shrink-0">
              <Icon.Send size={14}/>
              Enviar
            </button>
          </div>
        </div>
      </section>

      {/* ---- RIGHT: timeline ---- */}
      <section className="overflow-y-auto bg-canvas">
        <PlanHeader trip={tripData} days={days}
                    activeMode={activeMode}
                    onApplyMode={applyMode}
                    onShare={() => setShareOpen(true)}
                    onCalendar={() => setCalOpen(true)}
                    onExport={() => setExportOpen(true)}/>
        <Insights insights={tripData.insights}/>
        {prep && <PlanPrep trip={tripData} prep={prep} onToggle={togglePrep}/>}
        <Timeline
          days={days}
          onAdd={(dayIdx, slot) => setAdding({ dayIdx, slot })}
          onEdit={(dayIdx, itemIdx) => setEditing({ dayIdx, itemIdx })}
          onTogglePin={togglePin}
          onRemove={removeItem}
        />
      </section>

      {/* Drawer for editing items (replaces old modal) */}
      <EditItemDrawer
        open={!!editing}
        onClose={() => setEditing(null)}
        editing={editing}
        days={days}
        onSave={(patch) => { if (editing) updateItem(editing.dayIdx, editing.itemIdx, patch); setEditing(null); toast({ title: 'Atualizado', tone:'success' }); }}
        onReplace={(payload) => { if (editing) updateItem(editing.dayIdx, editing.itemIdx, { ...payload, conf: false }); setEditing(null); toast({ title: 'Atividade trocada', tone:'success', desc: payload.title }); }}
        onRemove={() => { if (editing) { removeItem(editing.dayIdx, editing.itemIdx); setEditing(null); } }}
      />
      <AddItemModal
        open={!!adding}
        onClose={() => setAdding(null)}
        adding={adding}
        onAdd={(payload) => { if (adding) addItem(adding.dayIdx, adding.slot, payload); setAdding(null); }}
      />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} trip={tripData} />
      <CalendarModal open={calOpen} onClose={() => setCalOpen(false)} days={days} />
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} trip={tripData} days={days}/>
    </div>
  );
};

// ---------- Chat bubble ----------
const Bubble = ({ m, onCta }) => {
  const ctas = Array.isArray(m.cta) ? m.cta.filter(Boolean) : [];
  const showCta = ctas.length > 0 && !m.initialKickoff;
  if (m.who === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-ink-900 text-paper rounded-2xl rounded-tr-md px-4 py-2.5 text-[14px] max-w-[80%] leading-relaxed">
          {m.text}
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-[92%] pt-0.5">
      <div className="text-[14px] text-ink-900 leading-relaxed">
        {m.text}
      </div>
      {showCta && (
        <div className="mt-3 flex flex-wrap gap-2">
          {ctas.map(c => (
            <button key={c} onClick={() => !m.ctaApplied && onCta(c)} disabled={m.ctaApplied}
              className={`h-8 px-3 rounded-full border-half bg-white text-[12.5px] transition-colors flex items-center gap-1.5 ${
                m.ctaApplied
                  ? 'text-sage-700 cursor-default'
                  : 'text-ink-800 hover:border-ink-400 hover:bg-ink-50'
              }`}>
              {m.ctaApplied ? <Icon.Check size={12} className="text-sage-700"/> : <Icon.Sparkles size={12} className="text-ink-900"/>}{c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------- Plan header ----------
const PlanHeader = ({ trip, days, activeMode, onApplyMode, onShare, onCalendar, onExport }) => {
  const safeDays = normalizeDays(days);
  const total = safeDays.reduce((s, d) => s + d.items.length, 0);
  const confirmed = safeDays.reduce((s, d) => s + d.items.filter(i => i.conf).length, 0);
  const progressPct = total ? Math.round((confirmed / total) * 100) : 0;
  const subtitle = trip.destination || trip.tripContext?.destination || trip.blurb || TBD;
  return (
    <div className="px-8 pt-7 pb-5 border-b hairline bg-paper">
      <div className="flex items-center gap-4">
        <SmartImg seed={trip.coverSeed} tone={trip.cover} label={trip.coverLabel} w={240} h={180} className="h-[72px] w-[100px] rounded-xl shrink-0"/>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="label mb-1">{trip.status || 'Em planejamento'}</div>
              <h1 className="text-[22px] tracking-tight font-medium text-ink-900 leading-tight truncate">{trip.title}</h1>
              <p className="text-[13px] text-ink-600 mt-0.5 truncate">{subtitle}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <OptimizeMenu onApply={onApplyMode}/>
              <div className="w-px h-5 bg-ink-200 mx-1"/>
              <button onClick={onCalendar} title="Agenda" className="h-8 w-8 rounded-lg hover:bg-ink-100 text-ink-700 flex items-center justify-center"><Icon.Calendar size={15}/></button>
              <button onClick={onExport}   title="Exportar PDF" className="h-8 w-8 rounded-lg hover:bg-ink-100 text-ink-700 flex items-center justify-center"><Icon.Download size={15}/></button>
              <Button variant="secondary" size="sm" icon={Icon.Share} onClick={onShare}>Compartilhar</Button>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-600 flex-wrap">
            <span className="inline-flex items-center gap-1.5"><Icon.Calendar size={13}/> {trip.dates}</span>
            <span className="text-ink-300">·</span>
            <span className="inline-flex items-center gap-1.5"><Icon.Users size={13}/> {trip.travelers} viajantes</span>
            <span className="text-ink-300">·</span>
            <span className="inline-flex items-center gap-1.5"><Icon.Coins size={13}/> {trip.budget}</span>
            <span className="text-ink-300">·</span>
            <span className="inline-flex items-center gap-1.5"><Icon.Check size={13} className="text-sage-700"/> {confirmed}/{total} confirmados</span>
            {activeMode && (
              <>
                <span className="text-ink-300">·</span>
                <span className="inline-flex items-center gap-1.5 text-ink-900 font-medium">
                  <Icon.Sparkles size={12}/> modo: {activeMode.label}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* progress + segmentation */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-[11.5px] text-ink-500 mb-1.5">
          <span>Progresso do roteiro</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
          <div className="h-full bg-ink-900 rounded-full transition-all duration-500"
               style={{ width: `${progressPct}%` }}/>
        </div>
      </div>
    </div>
  );
};

// ---------- Insights row ----------
const Insights = ({ insights }) => {
  const kindCfg = {
    tip:     { tone:'brand', icon: Icon.Sparkles, label: 'Sugestão' },
    benefit: { tone:'sage',  icon: Icon.Shield,   label: 'Benefício' },
    miles:   { tone:'coral', icon: Icon.Coins,    label: 'Milhas' },
  };
  const safeInsights = normalizeInsights(insights);
  if (safeInsights.length === 0) return null;
  return (
    <div className="px-8 py-5 grid grid-cols-1 lg:grid-cols-3 gap-3 border-b hairline">
      {safeInsights.map((it, i) => {
        const c = kindCfg[it.kind] || { tone:'ink', icon: Icon.Sparkles, label: 'Nota' };
        const Ic = c.icon;
        return (
          <div key={i} className="bg-white border hairline rounded-xl p-3.5 flex items-start gap-3">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
              c.tone === 'brand' ? 'bg-brand-50 text-brand-700' :
              c.tone === 'sage'  ? 'bg-sage-50 text-sage-700' :
              c.tone === 'coral' ? 'bg-coral-50 text-coral-700' :
              'bg-ink-100 text-ink-700'}`}>
              <Ic size={14}/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="label">{c.label}</div>
              <div className="text-[12.5px] text-ink-800 leading-relaxed mt-0.5">{it.text}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------- Plan prep panel (kids / pet) ----------
const PlanPrep = ({ trip, prep, onToggle }) => {
  const groups = prep || trip.prep || [];
  const [gi, setGi] = useState(0);
  const totalItems = groups.reduce((s, g) => s + g.items.length, 0);
  const doneItems = groups.reduce((s, g) => s + g.items.filter(i => i.done).length, 0);
  const pct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;
  const active = groups[gi] || groups[0];
  const ActiveIc = Icon[active?.icon] || Icon.Check;

  return (
    <div className="px-8 py-6 border-b hairline">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="h-9 w-9 rounded-xl bg-ink-900 text-paper flex items-center justify-center shrink-0"><Icon.Sparkles size={16}/></div>
        <div className="flex-1 min-w-0">
          <div className="label">Concierge proativo</div>
          <div className="text-[16px] font-medium tracking-tight text-ink-900 mt-0.5">{trip.prepTitle}</div>
          <div className="text-[12.5px] text-ink-600 mt-1 leading-relaxed max-w-[640px]">{trip.prepIntro}</div>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
          <div className="h-full bg-ink-900 transition-all duration-300" style={{ width: `${pct}%` }}/>
        </div>
        <div className="text-[11.5px] text-ink-500 shrink-0"><span className="font-medium text-ink-900">{doneItems}</span>/{totalItems} resolvidos</div>
      </div>

      {/* Hint about chat */}
      <div className="mb-4 bg-ink-50 border-half rounded-lg px-3 py-2 flex items-center gap-2 text-[12px] text-ink-600">
        <Icon.Sparkles size={13} className="text-ink-900 shrink-0"/>
        Marque manualmente ou avise a Gaid no chat — ex: <span className="text-ink-900">"já peguei o passaporte do Joaquim"</span>.
      </div>

      {/* Group segmented tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
        {groups.map((g, idx) => {
          const Ic = Icon[g.icon] || Icon.Check;
          const gDone = g.items.filter(i => i.done).length;
          const isActive = idx === gi;
          const allDone = gDone === g.items.length;
          return (
            <button key={idx} onClick={() => setGi(idx)}
              className={`shrink-0 h-9 pl-2.5 pr-3 rounded-xl border-half flex items-center gap-2 transition-colors
                          ${isActive ? 'bg-ink-900 text-paper border-ink-900' : 'bg-white text-ink-700 hover:border-ink-400'}`}>
              <Ic size={14}/>
              <span className="text-[12.5px] font-medium">{g.title}</span>
              {g.urgent && !allDone && <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-coral-500' : 'bg-coral-500'}`}/>}
              <span className={`text-[11px] tabular-nums ${isActive ? 'text-paper/70' : 'text-ink-400'}`}>{gDone}/{g.items.length}</span>
            </button>
          );
        })}
      </div>

      {/* Active group items — single column, checkable */}
      <div className="bg-white border-half rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b hairline flex items-center gap-2">
          <ActiveIc size={15} className="text-ink-700"/>
          <span className="text-[13.5px] font-medium text-ink-900">{active?.title}</span>
          {active?.urgent && <span className="text-[9px] font-medium px-1.5 h-4 rounded-full bg-coral-50 text-coral-700 flex items-center uppercase tracking-wide">prazo</span>}
        </div>
        <div className="divide-y hairline">
          {active?.items.map((it, ii) => (
            <button key={ii} onClick={() => onToggle && onToggle(gi, ii)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-ink-50 transition-colors group">
              <div className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors
                              ${it.done ? 'bg-ink-900 text-paper' : 'border-half bg-white group-hover:border-ink-900'}`}>
                {it.done && <Icon.Check size={12}/>}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-[13px] leading-snug ${it.done ? 'text-ink-400 line-through decoration-ink-300' : 'text-ink-900 font-medium'}`}>{it.label}</div>
                {it.note && <div className={`text-[11.5px] mt-0.5 leading-snug ${it.done ? 'text-ink-400' : 'text-ink-500'}`}>{it.note}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------- Timeline ----------
const Timeline = ({ days, onAdd, onEdit, onTogglePin, onRemove }) => {
  const safeDays = normalizeDays(days);
  if (safeDays.length === 0) {
    return (
      <div className="px-8 py-10">
        <EmptyInline
          icon={Icon.Map}
          title="Roteiro ainda vazio"
          desc="A conversa já está salva. O roteiro aparece aqui quando os dias forem definidos."
        />
      </div>
    );
  }
  return (
    <div className="px-8 py-6 pb-24 space-y-7">
      {safeDays.map((day, di) => (
        <div key={day.d} className="grid grid-cols-[88px_1fr] gap-6">
          {/* day rail */}
          <div className="pt-3">
            <div className="text-[42px] tracking-tight font-medium text-ink-900 leading-none">{String(day.d).padStart(2,'0')}</div>
            <div className="text-[12px] text-ink-500 mt-1">{day.date}</div>
            <div className="text-[12.5px] font-medium text-ink-800 mt-2 flex items-center gap-1.5">
              <Icon.MapPin size={12}/> {day.city}
            </div>
            {day.flight && <Tag tone="coral" className="mt-2"><Icon.Plane size={11}/> Voo</Tag>}
          </div>

          <div className="space-y-3">
            {['manhã','tarde','noite'].map(slot => {
              const items = day.items.filter(it => it.t === slot);
              const Ic = slotIcon[slot];
              return (
                <div key={slot}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 w-6 rounded-md bg-ink-100 text-ink-700 flex items-center justify-center"><Ic size={12}/></div>
                    <div className="text-[11.5px] uppercase tracking-wider text-ink-500 font-medium">{slot}</div>
                    <div className="flex-1 h-px bg-ink-200"/>
                    <button onClick={() => onAdd(di, slot)}
                      className="h-6 px-2 rounded-md text-[11.5px] text-ink-600 hover:bg-ink-100 hover:text-ink-900 inline-flex items-center gap-1">
                      <Icon.Plus size={11}/> adicionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <button onClick={() => onAdd(di, slot)}
                        className="w-full text-left bg-ink-50/60 border border-dashed border-ink-200 rounded-xl px-4 py-3 text-[12.5px] text-ink-500 hover:bg-ink-100 hover:text-ink-700 transition-colors">
                        Bloco livre · clique para adicionar
                      </button>
                    ) : items.map((it, idx) => {
                      // we need the absolute item index
                      const itemIdx = day.items.indexOf(it);
                      return (
                        <ItemCard key={idx} it={it}
                          onEdit={() => onEdit(di, itemIdx)}
                          onTogglePin={() => onTogglePin(di, itemIdx)}
                          onRemove={() => onRemove(di, itemIdx)}/>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

// ---------- Item card ----------
const tagPalette = {
  hotel:    { tone: 'brand', icon: Icon.Bed },
  comida:   { tone: 'coral', icon: Icon.Utensils },
  voo:      { tone: 'cool',  icon: Icon.Plane },
  expert:   { tone: 'sage',  icon: Icon.Users },
  arte:     { tone: 'gold',  icon: Icon.Image },
  vinho:    { tone: 'coral', icon: Icon.Coffee },
  mirante:  { tone: 'sage',  icon: Icon.Sunset },
  clássico: { tone: 'gold',  icon: Icon.Star },
  experiência: { tone: 'brand', icon: Icon.Sparkles },
  transporte:  { tone: 'cool', icon: Icon.Plane },
  'day-trip':  { tone: 'sage', icon: Icon.Map },
};

const ItemCard = ({ it, onEdit, onTogglePin, onRemove }) => {
  const cfg = tagPalette[it.tag] || { tone:'ink', icon: Icon.MapPin };
  const Ic = cfg.icon;
  return (
    <div className="group bg-white border hairline rounded-xl p-4 hover:border-ink-400/80 transition-colors flex items-start gap-3">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0
                       ${cfg.tone === 'brand' ? 'bg-brand-50 text-brand-700' :
                         cfg.tone === 'coral' ? 'bg-coral-50 text-coral-700' :
                         cfg.tone === 'sage' ? 'bg-sage-50 text-sage-700' :
                         cfg.tone === 'gold' ? 'bg-gold-50 text-gold-700' :
                         cfg.tone === 'cool' ? 'bg-brand-50 text-brand-700' :
                         'bg-ink-100 text-ink-700'}`}>
        <Ic size={15}/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-[14px] font-medium text-ink-900">{it.title}</div>
          {it.conf && <Tag tone="sage"><Icon.Check size={10}/> confirmado</Tag>}
        </div>
        <div className="text-[12px] text-ink-500 mt-0.5 flex items-center gap-2">
          <span>{it.place}</span>
          <span className="text-ink-300">·</span>
          <span>{it.dur}</span>
          <span className="text-ink-300">·</span>
          <span className="italic">{it.vibe}</span>
        </div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
        <button onClick={onTogglePin} className="h-7 w-7 rounded-md hover:bg-ink-100 text-ink-600 flex items-center justify-center" title="Alternar confirmação">
          <Icon.Check size={14}/>
        </button>
        <button onClick={onEdit} className="h-7 w-7 rounded-md hover:bg-ink-100 text-ink-600 flex items-center justify-center" title="Editar">
          <Icon.Edit size={14}/>
        </button>
        <button onClick={onRemove} className="h-7 w-7 rounded-md hover:bg-coral-50 text-coral-700 flex items-center justify-center" title="Remover">
          <Icon.Trash size={14}/>
        </button>
      </div>
    </div>
  );
};

// ---------- Edit drawer ----------
// Right-side drawer with item details + curated alternatives + search.
const EditItemDrawer = ({ open, onClose, editing, days, onSave, onReplace, onRemove }) => {
  const item = (editing && days[editing.dayIdx]?.items[editing.itemIdx]) || null;
  const day  = (editing && days[editing.dayIdx]) || null;
  const [form, setForm] = useState(item || {});
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('alts'); // alts | edit

  useEffect(() => {
    setForm(item || {});
    setQ('');
    setTab('alts');
  }, [editing, item]);

  if (!item) return null;

  const slotLabel = item.t || 'item';
  const alts = ([]).filter(a => {
    if (!q) return true;
    return (a.title + ' ' + a.place + ' ' + a.vibe).toLowerCase().includes(q.toLowerCase());
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow={day ? `Dia ${day.d} · ${day.date} · ${slotLabel}` : 'Editar'}
      title={item.title}
      width={540}
      footer={<>
        <Button variant="ghost" onClick={onRemove} icon={Icon.Trash}>Remover</Button>
        <Button variant="secondary" onClick={onClose}>Fechar</Button>
        {tab === 'edit' && <Button icon={Icon.Check} onClick={() => onSave(form)}>Salvar</Button>}
      </>}>
      <div className="px-6 py-5 border-b hairline">
        <SmartImg seed={`item-${item.tag}-${item.title}`} tone={item.tag === 'voo' ? 'cool' : 'warm'} w={640} h={300} className="h-[180px] w-full rounded-xl mb-4" label={item.tag}/>
        <div className="grid grid-cols-3 gap-3">
          <Mini label="Local" value={item.place}/>
          <Mini label="Duração" value={item.dur}/>
          <Mini label="Vibe" value={item.vibe} italic/>
        </div>
        <div className="mt-3 text-[12.5px] text-ink-600 leading-relaxed">
          {item.conf
            ? <span className="inline-flex items-center gap-1.5"><Icon.Check size={12} className="text-sage-700"/> Reserva confirmada — para mudar, a Gaid pode liberar.</span>
            : 'Ainda sem reserva confirmada. Boa hora pra explorar uma alternativa.'}
        </div>
      </div>

      <div className="px-6 pt-4 sticky top-0 bg-paper z-10 border-b hairline">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={()=>setTab('alts')}
            className={`h-8 px-3 rounded-lg text-[12.5px] font-medium transition-colors
                       ${tab === 'alts' ? 'bg-ink-900 text-paper' : 'text-ink-600 hover:bg-ink-100'}`}>
            <Icon.Sparkles size={12} className="inline -mt-0.5 mr-1"/> Alternativas curadas
          </button>
          <button onClick={()=>setTab('edit')}
            className={`h-8 px-3 rounded-lg text-[12.5px] font-medium transition-colors
                       ${tab === 'edit' ? 'bg-ink-900 text-paper' : 'text-ink-600 hover:bg-ink-100'}`}>
            <Icon.Edit size={12} className="inline -mt-0.5 mr-1"/> Editar manualmente
          </button>
        </div>
        {tab === 'alts' && (
          <div className="pb-4">
            <div className="bg-white border-half rounded-lg h-9 flex items-center gap-2 px-3">
              <Icon.Search size={14} className="text-ink-500"/>
              <input value={q} onChange={e=>setQ(e.target.value)}
                placeholder={`Buscar outras opções de ${item.tag}…`}
                className="flex-1 outline-none text-[13px] bg-transparent"/>
            </div>
          </div>
        )}
      </div>

      {tab === 'alts' ? (
        <div className="px-6 py-5 space-y-3">
          <div className="label">A Gaid sugere para você</div>
          <div className="space-y-2.5">
            {alts.map((a, i) => (
              <AltCard key={i} alt={a} onPick={() => onReplace(a)}/>
            ))}
            {alts.length === 0 && (
              <div className="bg-ink-50 rounded-xl p-4 text-[13px] text-ink-600">
                Nada nessa busca. Pode pedir algo específico no chat — a Gaid costuma achar.
              </div>
            )}
          </div>

          <div className="pt-5 mt-3 border-t hairline">
            <div className="label mb-2">Mais opções</div>
            <button className="w-full bg-white border-half rounded-xl px-4 py-3 flex items-center gap-3 hover:border-ink-400 transition-colors text-left">
              <div className="h-9 w-9 rounded-lg bg-ink-900 text-paper flex items-center justify-center"><Icon.Wand size={15}/></div>
              <div className="flex-1">
                <div className="text-[13.5px] font-medium text-ink-900">Pedir algo personalizado</div>
                <div className="text-[12px] text-ink-500">Descreva no chat e a Gaid monta a alternativa</div>
              </div>
              <Icon.ArrowRight size={14} className="text-ink-500"/>
            </button>
            <button className="w-full bg-white border-half rounded-xl px-4 py-3 flex items-center gap-3 hover:border-ink-400 transition-colors text-left mt-2">
              <div className="h-9 w-9 rounded-lg bg-ink-100 text-ink-700 flex items-center justify-center"><Icon.Users size={15}/></div>
              <div className="flex-1">
                <div className="text-[13.5px] font-medium text-ink-900">Recomendado pela Inês (expert local)</div>
                <div className="text-[12px] text-ink-500">Ver outras opções assinadas pela expert</div>
              </div>
              <Icon.ArrowRight size={14} className="text-ink-500"/>
            </button>
          </div>
        </div>
      ) : (
        <div className="px-6 py-5 space-y-4">
          <Field label="Atividade">
            <input className="w-full h-10 px-3 rounded-lg border-half text-[14px] bg-white"
                   value={form.title || ''} onChange={e=>setForm(f=>({...f, title: e.target.value}))}/>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Local">
              <input className="w-full h-10 px-3 rounded-lg border-half text-[14px] bg-white"
                     value={form.place || ''} onChange={e=>setForm(f=>({...f, place: e.target.value}))}/>
            </Field>
            <Field label="Duração">
              <input className="w-full h-10 px-3 rounded-lg border-half text-[14px] bg-white"
                     value={form.dur || ''} onChange={e=>setForm(f=>({...f, dur: e.target.value}))}/>
            </Field>
          </div>
          <Field label="Período">
            <TabRow tabs={[{id:'manhã',label:'Manhã'},{id:'tarde',label:'Tarde'},{id:'noite',label:'Noite'}]}
                    value={form.t} onChange={(v)=>setForm(f=>({...f, t: v}))}/>
          </Field>
          <Field label="Vibe">
            <input className="w-full h-10 px-3 rounded-lg border-half text-[14px] bg-white"
                   value={form.vibe || ''} onChange={e=>setForm(f=>({...f, vibe: e.target.value}))}/>
          </Field>
          <div className="bg-ink-50 border-half rounded-xl p-3 flex items-start gap-3">
            <Icon.Info size={13} className="text-ink-700 mt-0.5"/>
            <div className="text-[12.5px] text-ink-700">
              Mudanças manuais não invalidam o roteiro. A Gaid reorganiza horários e logística sozinha.
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
};

const Mini = ({ label, value, italic }) => (
  <div className="bg-ink-50 rounded-lg px-3 py-2">
    <div className="label">{label}</div>
    <div className={`text-[13px] text-ink-900 mt-0.5 ${italic ? 'italic' : 'font-medium'}`}>{value}</div>
  </div>
);

const AltCard = ({ alt, onPick }) => (
  <button onClick={onPick}
    className="w-full text-left bg-white border-half rounded-xl overflow-hidden hover:border-ink-400 transition-colors flex group">
    <SmartImg seed={alt.seed || alt.title} tone="warm" w={200} h={200} className="h-[112px] w-[112px] shrink-0"/>
    <div className="flex-1 p-3.5 min-w-0">
      <div className="text-[13.5px] font-medium text-ink-900 leading-tight">{alt.title}</div>
      <div className="text-[11.5px] text-ink-500 mt-1 flex items-center gap-2">
        <span>{alt.place}</span>
        {alt.dur && <><span className="text-ink-300">·</span><span>{alt.dur}</span></>}
      </div>
      <div className="text-[11.5px] text-ink-700 mt-1.5 italic">{alt.vibe}</div>
      <div className="text-[11.5px] text-ink-600 mt-2 leading-snug flex items-start gap-1.5">
        <Icon.Sparkles size={11} className="text-ink-900 mt-0.5 shrink-0"/>
        <span>{alt.why}</span>
      </div>
    </div>
    <div className="flex items-center pr-3">
      <div className="h-7 w-7 rounded-md bg-ink-100 group-hover:bg-ink-900 group-hover:text-paper text-ink-700 flex items-center justify-center transition-colors">
        <Icon.Check size={13}/>
      </div>
    </div>
  </button>
);

// ---------- Field (used by both edit drawer and add modal) ----------
const Field = ({ label, children }) => (
  <label className="block">
    <div className="label mb-1.5">{label}</div>
    {children}
  </label>
);

// ---------- Add modal ----------
// No fabricated catalog. Real suggestions come from the backend/AI later;
// until then the modal shows an honest empty state.
const suggestions = [];
const AddItemModal = ({ open, onClose, adding, onAdd }) => {
  const [q, setQ] = useState('');
  useEffect(() => { if (open) setQ(''); }, [open]);
  if (!adding) return null;
  const filtered = suggestions.filter(s => (s.title + s.place).toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal open={open} onClose={onClose} title={`Adicionar atividade · ${adding.slot}`}>
      <div className="space-y-3">
        <div className="flex items-center gap-2 bg-white border hairline rounded-lg px-3 h-10">
          <Icon.Search size={14} className="text-ink-500"/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar passeio, restaurante, museu…"
                 className="flex-1 outline-none text-[14px]"/>
        </div>
        <div className="space-y-2 max-h-[380px] overflow-y-auto">
          {filtered.map((s, i) => (
            <button key={i} onClick={() => onAdd(s)}
              className="w-full text-left bg-white border hairline rounded-xl p-3 hover:border-ink-400 flex items-center gap-3 group">
              <Placeholder tone="warm" className="h-10 w-12 rounded-md shrink-0"/>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-ink-900">{s.title}</div>
                <div className="text-[12px] text-ink-500">{s.place} · {s.dur} · {s.vibe}</div>
              </div>
              <Icon.Plus size={16} className="text-ink-500 group-hover:text-ink-900"/>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="p-6 text-center text-[13px] text-ink-500">As sugestões aparecem aqui quando houver catálogo. Por enquanto, peça à Gaid pelo chat.</div>
          )}
        </div>
      </div>
    </Modal>
  );
};

// ---------- Share modal ----------
const ShareModal = ({ open, onClose, trip }) => {
  const sub = [trip && trip.dates, has(trip && trip.travelers) ? `${trip.travelers} viajantes` : null, trip && trip.status].filter(Boolean).join(' · ');
  return (
    <Modal open={open} onClose={onClose} title="Compartilhar roteiro"
      footer={<Button variant="ghost" onClick={onClose}>Fechar</Button>}>
      <div className="space-y-4">
        <div className="bg-ink-50 rounded-xl p-4 flex items-center gap-3">
          <Placeholder tone="warm" label={(trip && trip.coverLabel) || ''} className="h-14 w-20 rounded-lg shrink-0"/>
          <div>
            <div className="text-[14px] font-medium text-ink-900">{orTBD(trip && trip.title)}</div>
            <div className="text-[12px] text-ink-500">{sub || TBD}</div>
          </div>
        </div>
        <div>
          <div className="label mb-1.5">Link privado</div>
          <div className="flex gap-2">
            <input readOnly value={TBD}
                   className="flex-1 h-10 px-3 rounded-lg border hairline bg-white text-[13px] mono text-ink-400 italic"/>
            <Button disabled variant="secondary" icon={Icon.Share}>Copiar</Button>
          </div>
          <div className="text-[11.5px] text-ink-500 mt-2 flex items-center gap-1.5"><Icon.Lock size={11}/> O link de compartilhamento fica disponível quando a viagem estiver pronta.</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <ShareBtn icon={Icon.Mail}    label="E-mail"/>
          <ShareBtn icon={Icon.Phone}   label="WhatsApp"/>
          <ShareBtn icon={Icon.Download} label="PDF"/>
        </div>
        <div className="border-t hairline pt-4 space-y-2">
          <div className="label">Permissões</div>
          <PermissionRow label="Pode comentar" desc="Companheiros podem sugerir mudanças"/>
          <PermissionRow label="Pode editar"  desc="Coautoria — útil pra família" off/>
        </div>
      </div>
    </Modal>
  );
};
const ShareBtn = ({ icon: Ic, label }) => (
  <button className="h-12 border hairline rounded-xl bg-white hover:bg-ink-50 flex items-center justify-center gap-2 text-[13px] text-ink-800">
    <Ic size={14}/> {label}
  </button>
);
const PermissionRow = ({ label, desc, off }) => {
  const [on, setOn] = useState(!off);
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-ink-900">{label}</div>
        <div className="text-[11.5px] text-ink-500">{desc}</div>
      </div>
      <button onClick={() => setOn(o => !o)}
        className={`h-6 w-10 rounded-full transition-colors relative ${on ? 'bg-ink-900' : 'bg-ink-200'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`}/>
      </button>
    </div>
  );
};

// ---------- Calendar modal ----------
const CalendarModal = ({ open, onClose, days }) => {
  const [tab, setTab] = useState('google');
  return (
    <Modal open={open} onClose={onClose} title="Adicionar à agenda"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button icon={Icon.Check} onClick={onClose}>Adicionar {days.reduce((s,d)=>s+d.items.length,0)} eventos</Button>
      </>}>
      <div className="space-y-4">
        <TabRow tabs={[{id:'google',label:'Google'},{id:'apple',label:'Apple'},{id:'outlook',label:'Outlook'},{id:'ics',label:'.ics'}]} value={tab} onChange={setTab}/>
        <div className="bg-ink-50 border hairline rounded-xl p-4">
          <div className="text-[13px] text-ink-800">
            Vou criar <span className="font-medium">{days.reduce((s,d)=>s+d.items.length,0)} eventos</span> em {days.length} dias com fuso de <span className="mono">{TBD}</span>.
          </div>
          <div className="text-[11.5px] text-ink-500 mt-1">Atualizações futuras no roteiro sincronizam automaticamente.</div>
        </div>
        <div className="space-y-1.5">
          {days.slice(0,3).map(d => (
            <div key={d.d} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-ink-50">
              <div className="h-8 w-8 rounded-md bg-ink-100 text-ink-700 flex items-center justify-center"><Icon.Calendar size={14}/></div>
              <div className="flex-1">
                <div className="text-[13px] text-ink-900">Dia {d.d} · {d.city}</div>
                <div className="text-[11.5px] text-ink-500">{d.items.length} eventos · {d.date}</div>
              </div>
              <Icon.Check size={14} className="text-sage-700"/>
            </div>
          ))}
          <div className="text-[11.5px] text-ink-500 px-3 pt-1">…e mais {days.length - 3} dias</div>
        </div>
      </div>
    </Modal>
  );
};

// ---------- Export modal (PDF preview-ish) ----------
const ExportModal = ({ open, onClose, trip, days }) => {
  return (
    <Modal open={open} onClose={onClose} title="Exportar PDF" size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button icon={Icon.Download}>Baixar PDF</Button>
      </>}>
      <div className="grid grid-cols-[1fr_360px] gap-6">
        {/* Preview */}
        <div className="bg-white border hairline rounded-xl p-8 shadow-soft">
          <div className="border-b hairline pb-4 mb-4">
            <div className="label">Gaid · roteiro exportado</div>
            <div className="text-[20px] font-medium tracking-tight text-ink-900 mt-1">{trip.title}</div>
            <div className="text-[12px] text-ink-600 mt-1">{trip.dates} · {trip.travelers} viajantes · {trip.blurb}</div>
          </div>
          <div className="space-y-4">
            {days.slice(0,2).map(d => (
              <div key={d.d}>
                <div className="text-[13px] font-medium text-ink-900 mb-1.5">Dia {d.d} · {d.date} · {d.city}</div>
                <ul className="text-[12px] text-ink-700 leading-relaxed">
                  {d.items.map((it, i) => (
                    <li key={i} className="flex gap-2 py-0.5">
                      <span className="mono text-ink-500 uppercase w-12 shrink-0">{it.t}</span>
                      <span>{it.title} · <span className="text-ink-500">{it.place}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="text-[11px] text-ink-400 italic">…e mais {days.length - 2} dias.</div>
          </div>
        </div>
        {/* Options */}
        <div className="space-y-4">
          <Field label="Tema">
            <TabRow tabs={[{id:'editorial',label:'Editorial'},{id:'compact',label:'Compacto'}]} value="editorial" onChange={()=>{}}/>
          </Field>
          <Field label="Incluir">
            <div className="space-y-2 text-[13px] text-ink-800">
              <ChkRow label="Reservas e confirmações" defaultOn/>
              <ChkRow label="Mapas de cada dia" defaultOn/>
              <ChkRow label="Benefícios de cartões"/>
              <ChkRow label="Telefones e backup" defaultOn/>
              <ChkRow label="Notas pessoais"/>
            </div>
          </Field>
          <div className="bg-ink-50 rounded-xl p-3 text-[12px] text-ink-600 flex items-start gap-2">
            <Icon.Info size={13} className="mt-0.5"/>
            PDF é gerado sob demanda. Sempre reflete o estado atual do roteiro.
          </div>
        </div>
      </div>
    </Modal>
  );
};
const ChkRow = ({ label, defaultOn }) => {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <button onClick={()=>setOn(o=>!o)} className="w-full flex items-center gap-3 py-1">
      <span className={`h-4 w-4 rounded border flex items-center justify-center transition-colors
                        ${on ? 'bg-ink-900 border-ink-900 text-paper' : 'bg-white border-ink-300'}`}>
        {on && <Icon.Check size={10}/>}
      </span>
      <span>{label}</span>
    </button>
  );
};


export { PlanScreen };
