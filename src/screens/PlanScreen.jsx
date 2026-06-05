import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useBreakpoint } from '../hooks/useBreakpoint.js';
import { Icon } from '../components/icons.jsx';
import { Placeholder, Button, Tag, Card, Modal, Drawer, SmartImg, Portrait, useToast, Topbar, SectionHeader, Stat, TabRow, OptimizeMenu, AddToTripDrawer, GaidLogo } from '../components/ui.jsx';
import { EmptyState, EmptyInline } from './EmptyStates.jsx';
import { Async, CardSkeleton, CatalogCarousel, Carousel, Skeleton, ErrorState, CarouselSkeleton } from '../core/states.jsx';
import { useTripStore } from '../core/store.jsx';
import { TBD, has, orTBD, fmtDuration, fmtMoney } from '../core/contracts.jsx';
import { tripApi } from '../core/tripApi.jsx';
import {
  getKnowledgeForRequest,
  logBrainError,
  logKnowledgeDecision,
  logToolExecution,
} from '../core/brain/index.js';
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
function itemStableId(dayNumber, item, index) {
  if (item?.id) return item.id;
  const seed = `${dayNumber || 'd'}-${item?.t || item?.slot || 'slot'}-${item?.title || 'item'}-${item?.place || ''}-${index}`;
  return `it-${normText(seed).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72) || `${dayNumber}-${index}`}`;
}
function normalizeDays(value) {
  return Array.isArray(value)
    ? value.map((day, idx) => {
      const dayNumber = day?.d ?? idx + 1;
      return {
        ...day,
        d: dayNumber,
        date: day?.date || TBD,
        city: day?.city || TBD,
        items: Array.isArray(day?.items)
          ? day.items
            .filter(item => item && typeof item === 'object' && !Array.isArray(item))
            .map((item, itemIdx) => ({ ...item, id: itemStableId(dayNumber, item, itemIdx) }))
          : [],
      };
    })
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
  return /(escolha por mim|aplicar|aplica|adicionar ao roteiro|aplicar ao roteiro|pode adicionar|pode aplicar|pode fazer|faz isso|coloca no roteiro|incluir no roteiro|gostei\b|gostei,\s*adiciona|gostei.*adiciona|gostei.*coloca)/.test(text);
}
function isAddDayIntent(value) {
  const text = normText(value);
  return /(adicionar um dia|mais um dia|incluir mais um dia|criar mais um dia|adicionar um dia a mais|aumentar para \d+ dias?)/.test(text);
}
function isChangeDatesIntent(value) {
  const text = normText(value);
  return /(mudar datas|alterar datas|trocar datas|adicionar data|vou viajar de|vamos de|viajar de|cheg(?:o|ada).*volt|check.?in.*check.?out|\bde\s+\d{1,2}\s+a\s+\d{1,2}\s+de\s+[a-z]+|\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\s*(?:a|ate|até|-)\s*\d{1,2}[/-]\d{1,2})/.test(text);
}
function isCreateItineraryItemIntent(value) {
  const text = normText(value);
  return /(adiciona|adicione|coloca|inclui|incluir|inclua|quero|bota|poe|põe).*(restaurante|cafe|café|cafe da manha|museu|bate.?volta|almoco|almoço|jantar|atividade|criancas|crianças|rooftop|passeio|parada|atracao|atração|experiencia|experiência|stop|brunch)|(?:restaurante|cafe|café|museu|bate.?volta|almoco|almoço|jantar|atividade|rooftop|passeio gastronomico|passeio gastronômico).*(roteiro|dia)/.test(text);
}
function isMoveActivityIntent(value) {
  const text = normText(value);
  return /(move|mover|passa|passar|joga|jogar|leva|levar|muda|mudar).*(dia|manha|tarde|noite|ultimo|último|final|amanha|amanhã)|(?:coloca|deixa|muda).*(isso|esse|essa|item|passeio|atividade).*(dia|manha|tarde|noite|ultimo|último|final|amanha|amanhã)|(?:coloca|deixa).*(na|no|para|pra).*(manha|manhã|tarde|noite)|(?:para|pra)\s+(?:o\s+)?(?:dia\s*\d+|ultimo dia|último dia|final da viagem|manha|manhã|tarde|noite)/.test(text);
}
function isRemoveActivityIntent(value) {
  const text = normText(value);
  return /(remove|remover|tira|tirar|apaga|apagar|exclui|excluir|deleta|deletar).*(isso|esse|essa|item|passeio|atividade|restaurante|roteiro|dia)|(?:nao quero mais|não quero mais).*(isso|esse|essa|item|passeio|atividade|restaurante)|(?:remove|remover|tira|tirar|apaga|apagar|exclui|excluir|deleta|deletar)\s+do roteiro/.test(text);
}
function isReplaceActivityIntent(value) {
  const text = normText(value);
  return /\b(trocar|troca|substituir|substitui|mudar|muda)\b.+\b(por|para|pra)\b.+/.test(text) ||
    /(trocar|substituir|mudar|remover).*(atividade|passeio|restaurante|museu|item)|(?:atividade|passeio|restaurante|museu|item).*(trocar|substituir|mudar)|nao gostei|não gostei|outra opcao|outra opção|me da uma alternativa|me dá uma alternativa|algo mais romantico|algo mais romântico|algo menos turistico|algo menos turístico|algo mais barato|algo melhor para criancas|algo melhor para crianças/.test(text);
}
function isSelectedItemApplyCommand(value) {
  const text = normText(value);
  return /(escolha por mim|aplique|aplica|pode aplicar|faz isso|substitui|substituir|troca|trocar)/.test(text);
}
function isOptimizeItineraryIntent(value) {
  const text = normText(value);
  return /(otimizar|reorganizar|melhorar|deixar mais leve|mais barato|menos corrido|mais premium|ajustar ritmo|reduzir custo)/.test(text);
}
function isReplanItineraryIntent(value) {
  const text = normText(value);
  return /(vai chover|previsao de chuva|previsão de chuva|chuva|perdi a manha|perdi a manhã|cheguei atrasado|estou cansado|to cansado|tô cansado|algo mais leve|ritmo mais tranquilo|reduzir deslocamentos|menos deslocamento|mais gastronomia|mais coisas para criancas|mais coisas para crianças|melhor para criancas|melhor para crianças|mais conforto)/.test(text);
}
function isRecommendationIntent(value) {
  const text = normText(value);
  return /\b(indica|indique|recomenda|recomende|onde|restaurante|cafe|café|bar|hotel|passeio|atividade|o que fazer)\b/.test(text);
}
function pendingActionFromSuggestions(type, suggestions) {
  const normalized = normalizeItinerarySuggestions(suggestions);
  if (normalized.length === 0) return null;
  return {
    type,
    payload: { itinerarySuggestions: normalized },
    expiresAfterTurns: 3,
  };
}
function classifyPlanChatIntent(message, currentTrip, lastAssistantMessage) {
  const text = normText(message);
  if (isMoveActivityIntent(message)) {
    return {
      intent: 'MOVE_ACTIVITY',
      confidence: 0.88,
      requiresTrip: true,
      nextTool: 'Itinerary Editor',
      reason: 'Usuário quer mover um item do roteiro para outro dia ou período.',
    };
  }
  if (isRemoveActivityIntent(message)) {
    return {
      intent: 'REMOVE_ACTIVITY',
      confidence: 0.9,
      requiresTrip: true,
      nextTool: 'Itinerary Editor',
      reason: 'Usuário quer remover um item do roteiro.',
    };
  }
  if (isReplaceActivityIntent(message)) {
    return {
      intent: 'REPLACE_ACTIVITY',
      confidence: 0.78,
      requiresTrip: true,
      nextTool: 'Itinerary Editor',
      reason: 'Usuário quer trocar uma atividade do roteiro.',
    };
  }
  if (isChangeDatesIntent(message)) {
    return {
      intent: 'CHANGE_DATES',
      confidence: 0.9,
      requiresTrip: true,
      nextTool: 'Trip State Editor',
      reason: 'Usuário quer alterar as datas da viagem.',
    };
  }
  if (isApplyIntent(message) || isCreateItineraryItemIntent(message)) {
    return {
      intent: 'ADD_TO_ITINERARY',
      confidence: 0.9,
      requiresTrip: true,
      nextTool: 'Itinerary Editor',
      reason: 'Usuário pediu para aplicar a sugestão ao roteiro.',
    };
  }
  if (isAddDayIntent(message)) {
    return {
      intent: 'ADD_DAY',
      confidence: 0.86,
      requiresTrip: true,
      nextTool: 'Itinerary Editor',
      reason: /bate.?volta|day trip/.test(text)
        ? 'Usuário pediu um novo dia com bate-volta.'
        : 'Usuário pediu para adicionar mais um dia.',
    };
  }
  if (isReplanItineraryIntent(message)) {
    return {
      intent: 'REPLAN_ITINERARY',
      confidence: 0.86,
      requiresTrip: true,
      nextTool: 'Replanning Engine',
      reason: 'Usuário trouxe uma nova restrição que exige reorganizar múltiplos itens.',
    };
  }
  if (isOptimizeItineraryIntent(message)) {
    return {
      intent: 'OPTIMIZE_ITINERARY',
      confidence: 0.78,
      requiresTrip: true,
      nextTool: 'Replanning Engine',
      reason: 'Usuário quer otimizar ou reorganizar o roteiro.',
    };
  }
  if (isRecommendationIntent(message)) {
    return {
      intent: 'GET_RECOMMENDATION',
      confidence: 0.72,
      requiresTrip: false,
      nextTool: 'Discovery Engine',
      reason: 'Usuário quer uma recomendação rápida no contexto do roteiro.',
    };
  }
  if (!currentTrip?.id) {
    return {
      intent: 'UNCLEAR',
      confidence: 0.5,
      requiresTrip: false,
      nextTool: 'Intent Router',
      reason: 'Não há viagem ativa para uma ação de roteiro.',
    };
  }
  return {
    intent: 'CHAT',
    confidence: lastAssistantMessage ? 0.5 : 0.4,
    requiresTrip: false,
    nextTool: 'Local Assistant',
    reason: currentTrip?.id ? 'Mensagem comum no chat do roteiro.' : 'Sem roteiro ativo.',
  };
}
function latestAssistantMessage(messages) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.who === 'gaid') return messages[index];
  }
  return null;
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
function parseTargetDay(value, days) {
  const text = normText(value);
  const safeDays = normalizeDays(days);
  const explicit = text.match(/\bdia\s*(\d+)\b/) ||
    text.match(/\b(\d+)\s*(?:o|º)?\s*dia\b/) ||
    (/\bprimeiro\b/.test(text) ? [, '1'] : null) ||
    (/\bsegundo\b/.test(text) ? [, '2'] : null) ||
    (/\bterceiro\b/.test(text) ? [, '3'] : null) ||
    (/\bquarto\b/.test(text) ? [, '4'] : null) ||
    (/\bquinto\b/.test(text) ? [, '5'] : null);
  const explicitDay = Number(explicit?.[1]);
  if (Number.isFinite(explicitDay) && explicitDay > 0) return Math.floor(explicitDay);
  if (/\bultimo\b|\búltimo\b|final da viagem/.test(text)) return maxTimelineDay(safeDays) || null;
  if (/\bchegada\b/.test(text)) return safeDays[0]?.d || 1;
  return null;
}
function parseOptionalSlot(value) {
  const text = normText(value);
  if (/\bmanh/.test(text)) return 'manhã';
  if (/\btarde\b/.test(text)) return 'tarde';
  if (/\bnoite\b/.test(text)) return 'noite';
  return null;
}
function parseMoveTarget(value, days, source) {
  const text = normText(value);
  const explicitDay = parseTargetDay(value, days);
  const maxDay = maxTimelineDay(days);
  const tomorrow = /\bamanha\b|\bamanhã\b/.test(text);
  const targetDay = explicitDay || (tomorrow && source?.day?.d + 1 <= maxDay ? source.day.d + 1 : source?.day?.d);
  const targetSlot = parseOptionalSlot(value) || source?.item?.t || null;
  const createsExplicitDay = !!explicitDay && explicitDay > maxDay;
  return {
    day: targetDay || null,
    slot: targetSlot,
    createsExplicitDay,
    needsNextDay: tomorrow && source?.day?.d + 1 > maxDay,
  };
}
function resolveTargetDay({ message, days, lastEditedDay }) {
  const explicit = parseTargetDay(message, days);
  if (explicit) return explicit;
  if (Number.isFinite(lastEditedDay) && lastEditedDay > 0) return Math.floor(lastEditedDay);
  return null;
}
function inferItemSlot(value) {
  const text = normText(value);
  if (/cafe da manha|café da manhã|manha|manhã|brunch/.test(text)) return 'manhã';
  if (/almoco|almoço|tarde/.test(text)) return 'tarde';
  if (/jantar|noite|rooftop|bar/.test(text)) return 'noite';
  return 'tarde';
}
function inferItemTag(value) {
  const text = normText(value);
  if (/restaurante|almoco|almoço|jantar|brunch/.test(text)) return 'restaurante';
  if (/cafe|café/.test(text)) return 'café';
  if (/museu|cultura|atracao|atração/.test(text)) return 'cultura';
  if (/crianca|criança|kids/.test(text)) return 'família';
  if (/bate.?volta/.test(text)) return 'bate-volta';
  if (/rooftop|bar/.test(text)) return 'bar';
  if (/gastronom/.test(text)) return 'gastronomia';
  return 'experiência';
}
function itemCategory(item) {
  const text = normText(`${item?.tag || ''} ${item?.title || ''} ${item?.place || ''}`);
  if (/restaurante|almoco|almoço|jantar|brunch|gastronom/.test(text)) return 'restaurante';
  if (/cafe|café/.test(text)) return 'café';
  if (/museu/.test(text)) return 'museu';
  if (/cultura|galeria|teatro|centro historico|centro histórico/.test(text)) return 'cultura';
  if (/crianca|criança|familia|família|kids|parque/.test(text)) return 'família';
  if (/bate.?volta|day trip/.test(text)) return 'bate-volta';
  if (/bar|rooftop/.test(text)) return 'bar';
  if (/praia|beach/.test(text)) return 'praia';
  return String(item?.tag || 'experiência').trim() || 'experiência';
}
function replacementPreference(value) {
  const text = normText(value);
  if (/romantic|romantico|romântico/.test(text)) return 'mais romântica';
  if (/menos turist|local|autentic/.test(text)) return 'menos turística';
  if (/barat|econom/.test(text)) return 'mais barata';
  if (/crianca|criança|familia|família|kids/.test(text)) return 'melhor para crianças';
  if (/premium|especial|melhor/.test(text)) return 'mais especial';
  return 'mais alinhada ao pedido do usuário';
}
function itemTextMatches(item, text) {
  const normalized = normText(text);
  const fields = [item?.title, item?.place]
    .map(value => normText(value))
    .filter(value => value.length >= 4);
  const words = normalized.split(/[^a-z0-9]+/).filter(word => word.length >= 3);
  return fields.some((value) => {
    if (normalized.includes(value) || value.includes(normalized)) return true;
    const titleParts = value.split(/(?:\+|,|\/| e | com | por | em )/).map(part => part.trim()).filter(part => part.length >= 4);
    if (titleParts.some(part => normalized.includes(part))) return true;
    const valueWords = value.split(/[^a-z0-9]+/).filter(word => word.length >= 3);
    const hits = valueWords.filter(word => words.includes(word)).length;
    return hits >= Math.min(2, valueWords.length);
  });
}
function findActivityMentionedInText(message, days) {
  const entries = flattenItineraryItems(days);
  return entries.find(entry => itemTextMatches(entry.item, message)) || null;
}
function replacementInstructionFromMessage(message, target) {
  const raw = String(message || '').trim();
  const porMatch = raw.match(/\bpor\s+(.+)$/i);
  if (porMatch?.[1]) return porMatch[1].trim();
  const normalizedTarget = normText(target?.item?.title || '');
  const chunks = raw.split(/trocar|substituir|mudar/i).map(item => item.trim()).filter(Boolean);
  const candidate = chunks.find(item => !normText(item).includes(normalizedTarget));
  return candidate || raw;
}
function flattenItineraryItems(days) {
  return normalizeDays(days).flatMap((day, dayIdx) =>
    day.items.map((item, itemIdx) => ({ day, dayIdx, item, itemIdx }))
  );
}
function storedActivityRefFromEntry(entry) {
  if (!entry) return null;
  return {
    dayNumber: entry.day?.d,
    itemTitle: entry.item?.title,
    itemPlace: entry.item?.place,
    itemSlot: entry.item?.t,
    itemTag: entry.item?.tag,
  };
}
function resolveStoredActivityRef(days, ref) {
  if (!ref) return null;
  const entries = flattenItineraryItems(days);
  if (Number.isInteger(ref.dayIdx) && Number.isInteger(ref.itemIdx)) {
    const day = normalizeDays(days)[ref.dayIdx];
    const item = day?.items?.[ref.itemIdx];
    if (day && item) return { day, dayIdx: ref.dayIdx, item, itemIdx: ref.itemIdx };
  }
  return entries.find(entry => {
    if (ref.dayNumber && entry.day.d !== ref.dayNumber) return false;
    if (ref.itemTitle && normText(entry.item.title) === normText(ref.itemTitle)) return true;
    if (ref.itemPlace && normText(entry.item.place) === normText(ref.itemPlace)) return true;
    if (ref.itemSlot && ref.itemTag && entry.item.t === ref.itemSlot && itemCategory(entry.item) === itemCategory({ tag: ref.itemTag })) return true;
    return false;
  }) || null;
}
function findActivityMentionedInChat(messages, days) {
  const entries = flattenItineraryItems(days);
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const text = messages[index]?.text;
    if (!text) continue;
    const match = entries.find(entry => itemTextMatches(entry.item, text));
    if (match) return match;
  }
  return null;
}
function resolveActivityTarget({ message, days, editing, lastModifiedRef, chat }) {
  const safeDays = normalizeDays(days);
  const selected = resolveStoredActivityRef(safeDays, editing);
  if (selected) return selected;

  const mentioned = findActivityMentionedInText(message, safeDays);
  if (mentioned) return mentioned;

  const explicitDay = parseTargetDay(message, safeDays);
  const requestedCategory = inferItemTag(message);
  if (explicitDay) {
    const entries = flattenItineraryItems(safeDays).filter(entry => entry.day.d === explicitDay);
    const categoryMatches = entries.filter(entry => itemCategory(entry.item) === requestedCategory || normText(entry.item.title).includes(normText(requestedCategory)));
    if (categoryMatches.length === 1) return categoryMatches[0];
    if (entries.length === 1) return entries[0];
  }

  const discussed = findActivityMentionedInChat(chat, safeDays);
  if (discussed) return discussed;

  const lastModified = resolveStoredActivityRef(safeDays, lastModifiedRef?.current);
  if (lastModified) return lastModified;

  const categoryMatches = flattenItineraryItems(safeDays)
    .filter(entry => itemCategory(entry.item) === requestedCategory || normText(entry.item.title).includes(normText(requestedCategory)));
  return categoryMatches.length === 1 ? categoryMatches[0] : null;
}
function validateReplaceActivity({ trip, days, target }) {
  if (!trip?.id) return 'Abra ou crie uma viagem antes de trocar uma atividade.';
  const safeDays = normalizeDays(days);
  if (!target?.item) return 'Qual atividade você quer substituir? Pode me dizer o dia e o nome dela.';
  if (!safeDays[target.dayIdx] || safeDays[target.dayIdx].d !== target.day.d) return 'Não encontrei o dia dessa atividade no roteiro.';
  if (!safeDays[target.dayIdx].items[target.itemIdx]) return 'Não encontrei essa atividade no roteiro.';
  return null;
}
function buildReplaceActivityPrompt({ message, trip, target, instruction = '' }) {
  const category = itemCategory(target.item);
  const preference = replacementPreference(message);
  return [
    message,
    '',
    'Substitua exatamente uma atividade do roteiro. Nao reconstrua o roteiro.',
    `Atividade atual: ${target.item.title} em ${target.item.place || TBD}.`,
    `Categoria a preservar: ${category}.`,
    `Preferencia do usuario: ${preference}.`,
    instruction ? `Instrucao especifica de substituicao: ${instruction}.` : '',
    `Mantenha day=${target.day.d} e slot="${target.item.t}".`,
    'Retorne uma unica itinerarySuggestion com day, slot, title, place, dur, tag e vibe.',
    'A alternativa precisa ser concreta, coerente com a categoria e especifica para o destino.',
    'Nao invente reserva confirmada, preco ou disponibilidade.',
    `Contexto da viagem: ${JSON.stringify(trip?.tripContext || {}).slice(0, 1200)}`,
  ].filter(Boolean).join('\n');
}
function localReplacementSuggestion(message, trip, target, instruction = '') {
  const destination = knownTripDestination(trip) || target.item.place || 'destino';
  const category = itemCategory(target.item);
  const preference = replacementPreference(message);
  const text = normText(`${message} ${instruction} ${destination}`);
  if (/caminhada|andar|walking|walk/.test(text) && /londres|london|covent garden|soho|westminster/.test(text)) {
    return {
      day: target.day.d,
      slot: target.item.t,
      title: 'Caminhada romântica por Westminster e St James’s Park',
      place: 'Westminster e St James’s Park',
      dur: target.item.dur || '1h30',
      tag: 'romântico',
      vibe: `substitui "${target.item.title}" por uma caminhada a dois no mesmo período`,
    };
  }
  if (/caminhada|andar|walking|walk/.test(text)) {
    return {
      day: target.day.d,
      slot: target.item.t,
      title: `Caminhada a dois por ${destination}`,
      place: destination,
      dur: target.item.dur || '1h30',
      tag: 'romântico',
      vibe: `substitui "${target.item.title}" por uma caminhada no mesmo período`,
    };
  }
  const titleByCategory = {
    restaurante: `Restaurante ${preference} em ${destination}`,
    café: `Café ${preference} em ${destination}`,
    museu: `Museu alternativo em ${destination}`,
    cultura: `Experiência cultural ${preference} em ${destination}`,
    família: `Atividade para família em ${destination}`,
    'bate-volta': `Bate-volta alternativo a partir de ${destination}`,
    bar: `Bar ${preference} em ${destination}`,
    praia: `Praia ou passeio costeiro ${preference} em ${destination}`,
  };
  return {
    day: target.day.d,
    slot: target.item.t,
    title: titleByCategory[category] || `Alternativa ${preference} em ${destination}`,
    place: destination,
    dur: target.item.dur || '1h30',
    tag: category,
    vibe: `substitui "${target.item.title}" mantendo o mesmo período do roteiro`,
  };
}
function inferReplanType(message) {
  const text = normText(message);
  if (/chuva|chover/.test(text)) return 'WEATHER';
  if (/perdi a manha|perdi a manhã|cheguei atrasado|atrasado/.test(text)) return 'TIME_LOSS';
  if (/cansado|mais leve|ritmo mais tranquilo|mais conforto|menos corrido|reduzir deslocamentos|menos deslocamento/.test(text)) return 'COMFORT';
  if (/crianca|criança|filho|joaquim|familia|família/.test(text)) return 'CHILD_FRIENDLY';
  if (/gastronom|restaurante|comida|jantar|almoco|almoço/.test(text)) return 'GASTRONOMY';
  return 'COMFORT';
}
function isOutdoorLikeItem(item) {
  const text = normText(`${item?.tag || ''} ${item?.title || ''} ${item?.place || ''} ${item?.vibe || ''}`);
  return /(praia|parque|praca|praça|jardim|mirante|trilha|caminhada|rua|bairro|centro historico|centro histórico|tour|passeio|ar livre|barco|rooftop|monserrate|cristo|copacabana|ipanema|pelourinho|simón bolívar|simon bolivar)/.test(text);
}
function isChildFriendlyItem(item) {
  const text = normText(`${item?.tag || ''} ${item?.title || ''} ${item?.place || ''} ${item?.vibe || ''}`);
  return /(crianca|criança|familia|família|kids|parque|aquario|aquário|zoo|jardim|ciencia|ciência|disney|universal|ludic|lúdico)/.test(text);
}
function itemPriorityScore(item) {
  const text = normText(`${item?.tag || ''} ${item?.title || ''} ${item?.place || ''}`);
  let score = item?.conf ? 4 : 1;
  if (/restaurante|jantar|almoco|almoço|museu|cultura|classico|clássico|essencial/.test(text)) score += 1;
  if (/tempo livre|descanso|leve/.test(text)) score -= 1;
  return score;
}
function indoorAlternativeFor(item, trip, day) {
  const destination = day?.city && day.city !== TBD ? day.city : knownTripDestination(trip) || item?.place || 'destino';
  const key = normText(`${destination} ${trip?.destination || ''} ${trip?.tripContext?.destination || ''}`);
  const slot = item?.t || 'tarde';
  const cityAlternatives = [
    {
      match: /bogota|bogotá/,
      options: {
        manhã: { title: 'Museo del Oro', place: 'La Candelaria', tag: 'cultura', dur: '2h' },
        tarde: { title: 'Museo Botero', place: 'La Candelaria', tag: 'cultura', dur: '2h' },
        noite: { title: 'Cafés e jantar em Chapinero', place: 'Chapinero', tag: 'gastronomia', dur: '2h' },
      },
    },
    {
      match: /paris/,
      options: {
        manhã: { title: 'Musée d’Orsay', place: 'Saint-Germain', tag: 'museu', dur: '2h30' },
        tarde: { title: 'Louvre', place: '1º arrondissement', tag: 'museu', dur: '3h' },
        noite: { title: 'Jantar e cafés cobertos em Saint-Germain', place: 'Saint-Germain', tag: 'gastronomia', dur: '2h' },
      },
    },
    {
      match: /rio de janeiro|rio\b/,
      options: {
        manhã: { title: 'Museu do Amanhã', place: 'Centro', tag: 'cultura', dur: '2h' },
        tarde: { title: 'CCBB Rio', place: 'Centro', tag: 'cultura', dur: '2h' },
        noite: { title: 'Jantar coberto em Ipanema', place: 'Ipanema', tag: 'restaurante', dur: '2h' },
      },
    },
    {
      match: /orlando/,
      options: {
        manhã: { title: 'Disney Springs', place: 'Lake Buena Vista', tag: 'família', dur: '2h30' },
        tarde: { title: 'Orlando International Premium Outlets', place: 'International Drive', tag: 'compras', dur: '3h' },
        noite: { title: 'Jantar em Disney Springs', place: 'Disney Springs', tag: 'restaurante', dur: '2h' },
      },
    },
  ];
  const city = cityAlternatives.find(itemOption => itemOption.match.test(key));
  const picked = city?.options?.[slot] || city?.options?.tarde;
  if (picked) {
    return {
      ...item,
      title: picked.title,
      place: picked.place,
      dur: picked.dur,
      tag: picked.tag,
      vibe: 'alternativa interna para manter o dia confortável com chuva',
      conf: false,
    };
  }
  const category = itemCategory(item);
  const title = category === 'restaurante'
    ? `Jantar em restaurante acolhedor em ${destination}`
    : category === 'café'
      ? `Pausa em café especial em ${destination}`
      : category === 'museu' || category === 'cultura'
        ? `Museu ou centro cultural em ${destination}`
        : `Programa coberto em ${destination}`;
  return {
    ...item,
    title,
    place: destination,
    tag: category === 'restaurante' || category === 'café' ? category : 'cultura',
    vibe: 'alternativa interna para manter o dia confortável',
    conf: false,
  };
}
function familyAlternativeFor(item, trip, day) {
  const destination = day?.city && day.city !== TBD ? day.city : knownTripDestination(trip) || item?.place || 'destino';
  return {
    ...item,
    title: `Atividade leve para crianças em ${destination}`,
    place: destination,
    tag: 'família',
    vibe: 'mais fácil para crianças, com ritmo menos cansativo',
    conf: false,
  };
}
function gastronomyItemFor(slot, trip, day) {
  const destination = day?.city && day.city !== TBD ? day.city : knownTripDestination(trip) || 'destino';
  const key = normText(`${destination} ${trip?.destination || ''} ${trip?.tripContext?.destination || ''}`);
  const isNight = slot === 'noite';
  const cityFood = [
    { match: /bogota|bogotá/, title: isNight ? 'Jantar no El Chato' : 'Café colombiano no Azahar Café', place: isNight ? 'Chapinero' : 'Chapinero' },
    { match: /paris/, title: isNight ? 'Jantar no Le Comptoir du Relais' : 'Pausa gastronômica no Marais', place: isNight ? 'Saint-Germain' : 'Marais' },
    { match: /rio de janeiro|rio\b/, title: isNight ? 'Jantar no Zazá Bistrô Tropical' : 'Café no Empório Jardim', place: isNight ? 'Ipanema' : 'Ipanema' },
    { match: /orlando/, title: isNight ? 'Jantar no The Boathouse' : 'Pausa em Disney Springs', place: isNight ? 'Disney Springs' : 'Disney Springs' },
  ].find(option => option.match.test(key));
  return {
    id: `food-${day?.d || 'd'}-${slot}-${Date.now()}`,
    t: slot,
    title: cityFood?.title || (isNight ? `Jantar gastronômico em ${destination}` : `Parada gastronômica em ${destination}`),
    place: cityFood?.place || destination,
    dur: isNight ? '2h' : '1h30',
    tag: 'gastronomia',
    vibe: 'incluído para dar mais sabor local ao roteiro',
    conf: false,
  };
}
function freeTimeItem(slot, day, reason = 'respiro no roteiro') {
  return {
    id: `free-${day?.d || 'd'}-${slot}-${Date.now()}`,
    t: slot,
    title: 'Tempo livre para descanso',
    place: day?.city || TBD,
    dur: '1h30',
    tag: 'descanso',
    vibe: reason,
    conf: false,
  };
}
function targetDaysForReplan(message, days, type, trip = null) {
  const safeDays = normalizeDays(days);
  if (type === 'WEATHER') {
    const calendarDay = replanDayFromCalendarDate(message, safeDays, trip);
    if (calendarDay) return [calendarDay];
    if (hasWeatherDateMention(message)) return [];
  }
  const explicit = parseTargetDay(message, safeDays);
  if (explicit) return safeDays.filter(day => day.d === explicit);
  if (/\bamanha\b|\bamanhã\b/.test(normText(message)) && safeDays[1]) return [safeDays[1]];
  if (type === 'WEATHER') {
    const rainy = safeDays.filter(day => day.items.some(isOutdoorLikeItem));
    return rainy.length ? rainy.slice(0, 1) : safeDays.slice(0, 1);
  }
  return safeDays.slice(0, 1);
}
function makeStructuredChange({ type, day, slot, targetTitle = '', newTitle = '', reason = '', targetId = null, item = null }) {
  return {
    type,
    day,
    slot,
    targetTitle,
    newTitle,
    reason,
    targetId,
    item,
  };
}
function replanKnowledgeIntent(type) {
  return type === 'WEATHER' ? 'REPLAN_FOR_WEATHER' : 'OPTIMIZE_ITINERARY';
}
function scenarioForReplan(type) {
  if (type === 'WEATHER') return 'rain';
  if (type === 'TIME_LOSS') return 'lost_morning';
  if (type === 'COMFORT') return 'tired_traveler reduce_displacement';
  if (type === 'CHILD_FRIENDLY') return 'child_tired crianças';
  if (type === 'GASTRONOMY') return 'more_gastronomy';
  return 'optimize_itinerary';
}
function buildReplanKnowledgeRequest({ message, trip, days, type }) {
  const tripContext = trip?.tripContext && typeof trip.tripContext === 'object' ? trip.tripContext : {};
  const safeDays = normalizeDays(days);
  const priorities = [
    ...(Array.isArray(tripContext.priorities) ? tripContext.priorities : []),
    ...(Array.isArray(tripContext.interests) ? tripContext.interests : []),
    tripContext.tripPriority,
    scenarioForReplan(type),
  ].flat().filter(Boolean);
  const itinerarySummary = safeDays.map(day => ({
    day: day.d,
    city: day.city,
    items: day.items.map(item => ({
      title: item.title,
      slot: item.t,
      place: item.place,
      tag: item.tag,
    })),
  }));
  return {
    destination: knownTripDestination(trip),
    durationDays: tripContext.durationDays || safeDays.length || null,
    travelerComposition: tripContext.travelerComposition || tripContext.travelers?.composition || trip?.travelerComposition || '',
    travelers: tripContext.travelers || null,
    priorities,
    weather: type === 'WEATHER' ? 'rain' : '',
    tripStyle: tripContext.stylePace || tripContext.comfortLevel || '',
    scenario: scenarioForReplan(type),
    message,
    days: itinerarySummary,
  };
}
function activeKnowledgeMetadata(knowledge) {
  const metadata = knowledge?.context?.sourceMetadata?.find(item => item.enabled);
  return {
    source: metadata?.source === 'KNOWLEDGE_CORE' ? 'gaid_knowledge_core' : metadata?.source || 'replanning-engine',
    confidence: metadata?.confidence || 0.45,
    reasoningHint: metadata?.reasoningHint || 'Preview gerado com regras locais de replanning.',
  };
}
function knowledgeReasonForChange(change, type, day, knowledge) {
  const context = knowledge?.context || {};
  const destination = context.destinationKnowledge?.knowledge;
  const traveler = context.travelerRules?.rules;
  const replanning = context.replanningRules?.rules?.[0];
  const hints = context.knowledgeHints?.hints || [];
  const destinationHint = destination?.label ? `em ${destination.label}` : day?.city ? `em ${day.city}` : '';
  if (type === 'WEATHER' && destination?.rainyDayAlternatives?.length) {
    return `${change.reason}; prioriza alternativa coberta ${destinationHint}`;
  }
  if (type === 'CHILD_FRIENDLY' && traveler?.pacing) {
    return `${change.reason}; ajusta ritmo para crianças/família`;
  }
  if (type === 'GASTRONOMY' && destination?.foodStrengths?.length) {
    return `${change.reason}; aproveita pontos fortes de gastronomia ${destinationHint}`;
  }
  if (type === 'COMFORT' && traveler?.pacing) {
    return `${change.reason}; ${traveler.pacing}`;
  }
  if (replanning?.action) return `${change.reason}; ${replanning.action}`;
  return hints[0] ? `${change.reason}; ${hints[0]}` : change.reason;
}
function enhanceReplanChangesWithKnowledge(changes, { type, days, knowledge }) {
  const metadata = activeKnowledgeMetadata(knowledge);
  const safeDays = normalizeDays(days);
  return changes.map((change) => {
    const day = safeDays.find(item => item.d === change.day);
    return {
      ...change,
      reason: knowledgeReasonForChange(change, type, day, knowledge),
      source: metadata.source,
      confidence: metadata.confidence,
      reasoningHint: metadata.reasoningHint,
    };
  });
}
function applyStructuredReplanChanges(days, changes) {
  const nextDays = normalizeDays(days).map(day => ({ ...day, items: [...day.items] }));
  changes.forEach((change) => {
    const day = nextDays.find(item => item.d === change.day);
    if (!day) return;
    if (change.type === 'replace') {
      const index = day.items.findIndex(item => (change.targetId && item.id === change.targetId) || normText(item.title) === normText(change.targetTitle));
      if (index >= 0 && change.item) day.items[index] = { ...day.items[index], ...change.item, id: day.items[index].id, t: change.slot || day.items[index].t, conf: false };
    }
    if (change.type === 'remove') {
      day.items = day.items.filter(item => !((change.targetId && item.id === change.targetId) || normText(item.title) === normText(change.targetTitle)));
    }
    if (change.type === 'add_rest') {
      const item = change.item || freeTimeItem(change.slot || 'tarde', day, change.reason);
      day.items.push({ ...item, t: change.slot || item.t || 'tarde' });
    }
    if (change.type === 'move') {
      const sourceDay = nextDays.find(item => item.items.some(activity => (change.targetId && activity.id === change.targetId) || normText(activity.title) === normText(change.targetTitle)));
      if (!sourceDay) return;
      const index = sourceDay.items.findIndex(item => (change.targetId && item.id === change.targetId) || normText(item.title) === normText(change.targetTitle));
      if (index < 0) return;
      const [moved] = sourceDay.items.splice(index, 1);
      day.items.push({ ...moved, t: change.slot || moved.t });
    }
    day.items = day.items.sort((a, b) => ['manhã', 'tarde', 'noite'].indexOf(a.t) - ['manhã', 'tarde', 'noite'].indexOf(b.t));
  });
  return nextDays.sort((a, b) => a.d - b.d);
}
function alternateDayForMove(days, currentDay) {
  const safeDays = normalizeDays(days);
  return safeDays.find(day => day.d !== currentDay?.d && day.items.length < 3) ||
    safeDays.find(day => day.d !== currentDay?.d) ||
    null;
}
function buildReplanPreview({ message, trip, days }) {
  const type = inferReplanType(message);
  const safeDays = normalizeDays(days).map(day => ({ ...day, items: [...day.items] }));
  const knowledge = getKnowledgeForRequest(
    replanKnowledgeIntent(type),
    buildReplanKnowledgeRequest({ message, trip, days: safeDays, type })
  );
  const knowledgeMetadata = activeKnowledgeMetadata(knowledge);
  logKnowledgeDecision({
    surface: 'plan',
    flow: 'replanning',
    intent: replanKnowledgeIntent(type),
    replanType: type,
    destination: knownTripDestination(trip),
    sources: knowledge.context?.sourceMetadata,
    selectedSource: knowledgeMetadata.source,
    confidence: knowledgeMetadata.confidence,
    fallbackUsed: !knowledge.context?.destinationKnowledge?.knowledge && !knowledge.context?.travelerRules?.rules,
  });
  const targets = targetDaysForReplan(message, safeDays, type, trip);
  if (type === 'WEATHER' && targets.length === 0 && hasWeatherDateMention(message)) {
    const metadata = activeKnowledgeMetadata(knowledge);
    return {
      type,
      changes: [],
      nextDays: safeDays,
      summary: 'Qual dia do roteiro você quer ajustar?',
      knowledge,
      source: metadata.source,
      confidence: metadata.confidence,
      reasoningHint: metadata.reasoningHint,
    };
  }
  const targetNumbers = new Set(targets.map(day => day.d));
  const changes = [];

  safeDays.forEach(day => {
    if (!targetNumbers.has(day.d)) return { ...day, items: [...day.items] };
    let items = [...day.items];

    if (type === 'WEATHER') {
      items.forEach(item => {
        if (!isOutdoorLikeItem(item)) return;
        const replacement = indoorAlternativeFor(item, trip, day);
        if (replacement.title && !normText(replacement.title).includes('programa coberto')) {
          changes.push(makeStructuredChange({
            type: 'replace',
            day: day.d,
            slot: item.t,
            targetTitle: item.title,
            newTitle: replacement.title,
            reason: 'chuva prevista; alternativa coberta no mesmo período',
            targetId: item.id,
            item: replacement,
          }));
        } else {
          const moveDay = alternateDayForMove(safeDays, day);
          if (moveDay) {
            changes.push(makeStructuredChange({
              type: 'move',
              day: moveDay.d,
              slot: item.t,
              targetTitle: item.title,
              newTitle: item.title,
              reason: `chuva no Dia ${day.d}; mover passeio externo para o Dia ${moveDay.d}`,
              targetId: item.id,
            }));
          }
        }
      });
    }

    if (type === 'TIME_LOSS') {
      const morning = items.filter(item => item.t === 'manhã');
      const removable = morning.sort((a, b) => itemPriorityScore(a) - itemPriorityScore(b))[0];
      if (removable) {
        changes.push(makeStructuredChange({
          type: 'remove',
          day: day.d,
          slot: removable.t,
          targetTitle: removable.title,
          reason: `manhã perdida; preservar itens de maior valor no Dia ${day.d}`,
          targetId: removable.id,
        }));
      }
      if (morning.length <= 1) {
        const rest = freeTimeItem('manhã', day, 'ajuste para chegada mais tarde');
        changes.push(makeStructuredChange({
          type: 'add_rest',
          day: day.d,
          slot: 'manhã',
          newTitle: rest.title,
          reason: `reservar a manhã do Dia ${day.d} para chegada e respiro`,
          item: rest,
        }));
      }
    }

    if (type === 'COMFORT') {
      const busiest = safeDays.reduce((best, item) => item.items.length > best.items.length ? item : best, safeDays[0] || day);
      if (day.d !== busiest.d) return;
      const sorted = [...day.items].sort((a, b) => itemPriorityScore(a) - itemPriorityScore(b));
      const removable = sorted.find(item => !item.conf) || sorted[0];
      if (day.items.length > 2 && removable) {
        changes.push(makeStructuredChange({
          type: 'remove',
          day: day.d,
          slot: removable.t,
          targetTitle: removable.title,
          reason: `reduzir densidade do Dia ${day.d}`,
          targetId: removable.id,
        }));
      }
      if (!day.items.some(item => item.tag === 'descanso')) {
        const occupied = new Set(day.items.map(item => item.t));
        const slot = ['manhã', 'tarde', 'noite'].find(value => !occupied.has(value)) || 'tarde';
        const rest = freeTimeItem(slot, day, 'respiro para reduzir deslocamentos e cansaço');
        changes.push(makeStructuredChange({
          type: 'add_rest',
          day: day.d,
          slot,
          newTitle: rest.title,
          reason: `criar respiro no Dia ${day.d}`,
          item: rest,
        }));
      }
    }

    if (type === 'CHILD_FRIENDLY') {
      const target = items.find(item => !isChildFriendlyItem(item) && !item.conf) || items.find(item => !isChildFriendlyItem(item));
      if (target) {
        const replacement = familyAlternativeFor(target, trip, day);
        changes.push(makeStructuredChange({
          type: 'replace',
          day: day.d,
          slot: target.t,
          targetTitle: target.title,
          newTitle: replacement.title,
          reason: `mais adequado para crianças no Dia ${day.d}`,
          targetId: target.id,
          item: replacement,
        }));
      }
    }

    if (type === 'GASTRONOMY') {
      const hasFood = items.some(item => /restaurante|gastronomia|cafe|café|jantar|almoco|almoço/.test(normText(`${item.tag} ${item.title}`)));
      if (!hasFood) {
        const occupied = new Set(items.map(item => item.t));
        const slot = ['noite', 'tarde', 'manhã'].find(value => !occupied.has(value)) || 'noite';
        const food = gastronomyItemFor(slot, trip, day);
        changes.push(makeStructuredChange({
          type: 'add_rest',
          day: day.d,
          slot,
          newTitle: food.title,
          reason: `trazer mais gastronomia ao Dia ${day.d}`,
          item: food,
        }));
      } else {
        const target = items.find(item => !/restaurante|gastronomia|cafe|café|jantar|almoco|almoço/.test(normText(`${item.tag} ${item.title}`)) && !item.conf);
        if (target) {
          const food = gastronomyItemFor(target.t, trip, day);
          changes.push(makeStructuredChange({
            type: 'replace',
            day: day.d,
            slot: target.t,
            targetTitle: target.title,
            newTitle: food.title,
            reason: `substituir item de menor valor por gastronomia no Dia ${day.d}`,
            targetId: target.id,
            item: food,
          }));
        }
      }
    }
  });
  const usefulChanges = enhanceReplanChangesWithKnowledge(
    changes.filter(change => change.targetTitle || change.newTitle),
    { type, days: safeDays, knowledge }
  );
  const nextDays = usefulChanges.length ? applyStructuredReplanChanges(safeDays, usefulChanges) : safeDays;
  const metadata = activeKnowledgeMetadata(knowledge);
  logToolExecution({
    surface: 'plan',
    flow: 'replanning',
    tool: 'Replanning Engine',
    action: usefulChanges.length ? 'preview_changes' : 'fallback_no_useful_items',
    selectedSource: metadata.source,
    confidence: metadata.confidence,
    changeCount: usefulChanges.length,
    dayCount: safeDays.length,
  });

  if (usefulChanges.length === 0) {
    const summary = type === 'WEATHER'
      ? 'Consigo ajustar por chuva, mas esse dia ainda não tem atividades externas ou itens definidos para mover ou trocar.'
      : 'Consigo ajustar, mas preciso de um roteiro com atividades mais definidas.';
    return {
      type,
      changes: [],
      nextDays,
      summary,
      knowledge,
      source: metadata.source,
      confidence: metadata.confidence,
      reasoningHint: metadata.reasoningHint,
    };
  }
  return {
    type,
    changes: usefulChanges,
    nextDays,
    summary: replanSummaryText(type, targetNumbers),
    knowledge,
    source: metadata.source,
    confidence: metadata.confidence,
    reasoningHint: metadata.reasoningHint,
  };
}
function replanSummaryText(type, targetNumbers) {
  const days = [...targetNumbers].sort((a, b) => a - b);
  const dayLabel = days.length ? `o Dia ${days.join(', ')}` : 'o roteiro';
  if (type === 'WEATHER') return `Percebi que a chuva pode impactar ${dayLabel}.`;
  if (type === 'TIME_LOSS') return `Entendi que houve perda de tempo em ${dayLabel}.`;
  if (type === 'COMFORT') return `Vou deixar ${dayLabel} mais leve e confortável.`;
  if (type === 'CHILD_FRIENDLY') return `Vou ajustar ${dayLabel} para funcionar melhor com crianças.`;
  if (type === 'GASTRONOMY') return `Vou trazer mais gastronomia para ${dayLabel}.`;
  return `Posso reorganizar ${dayLabel}.`;
}
function previewTextForReplan(preview) {
  if (!Array.isArray(preview.changes) || preview.changes.length === 0) return preview.summary;
  const bullets = preview.changes.slice(0, 3).map((item) => {
    if (item.type === 'replace') return `- trocar “${item.targetTitle}” por “${item.newTitle}”`;
    if (item.type === 'move') return `- mover “${item.targetTitle}” para o Dia ${item.day}, ${item.slot}`;
    if (item.type === 'remove') return `- remover “${item.targetTitle}” de ${item.slot || 'um período'} do Dia ${item.day}`;
    if (item.type === 'add_rest') return `- adicionar “${item.newTitle}” no Dia ${item.day}, ${item.slot}`;
    return `- ${item.reason}`;
  }).join('\n');
  return `${preview.summary}\n\nPosso fazer estas mudanças:\n\n${bullets}\n\nAplicar?`;
}
function buildLocalItineraryItem(message, trip, targetDay, dayContext = null) {
  const text = normText(message);
  const destination = dayContext?.city && dayContext.city !== TBD ? dayContext.city : knownTripDestination(trip) || 'destino';
  const nearby = Array.isArray(dayContext?.items) ? dayContext.items.map(item => item.place).filter(Boolean).slice(0, 2) : [];
  const areaHint = nearby.length > 0 ? nearby[0] : destination;
  const priorities = [
    ...(Array.isArray(trip?.tripContext?.priorities) ? trip.tripContext.priorities : []),
    ...(Array.isArray(trip?.tripContext?.stylePace) ? trip.tripContext.stylePace : []),
    trip?.tripContext?.tripPriority,
  ].flat().filter(Boolean).map(item => normText(item)).join(' ');
  const tag = inferItemTag(message);
  const slot = inferItemSlot(message);
  const title =
    /restaurante/.test(text) ? `Restaurante de cozinha local perto de ${areaHint}` :
    /cafe da manha|café da manhã|cafe|café|brunch/.test(text) ? `Café da manhã em uma cafeteria autoral em ${areaHint}` :
    /museu/.test(text) ? `Museu com curadoria local em ${destination}` :
    /bate.?volta/.test(text) ? `Bate-volta bem encaixado a partir de ${destination}` :
    /crianca|criança|kids/.test(text) ? `Atividade lúdica para crianças em ${destination}` :
    /rooftop/.test(text) ? `Rooftop com vista em ${areaHint}` :
    /almoco|almoço/.test(text) ? `Almoço em um restaurante tradicional em ${areaHint}` :
    /gastronom/.test(text) ? `Passeio gastronômico por sabores locais em ${destination}` :
    priorities.includes('cultura') ? `Experiência cultural guiada em ${destination}` :
    tag !== 'experiência' ? `Experiência de ${tag} em ${destination}` :
    `Experiência personalizada em ${destination}`;
  return {
    day: targetDay,
    slot,
    title,
    place: areaHint,
    dur: tag === 'bate-volta' ? 'dia inteiro' : '1h30',
    tag,
    vibe: nearby.length > 0 ? `encaixado perto de ${nearby.join(' e ')}` : 'incluído a partir do pedido no chat',
  };
}
function latestSuggestionMessageIndex(messages) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const suggestions = normalizeItinerarySuggestions(
      message?.pendingAction?.payload?.itinerarySuggestions || message?.itinerarySuggestions
    );
    const userTurnsAfter = messages.slice(index + 1).filter(item => item?.who === 'user').length;
    const expiresAfterTurns = Number(message?.pendingAction?.expiresAfterTurns ?? 3);
    if (message?.who === 'gaid' && !message.ctaApplied && suggestions.length > 0 && userTurnsAfter <= expiresAfterTurns) {
      return index;
    }
  }
  return -1;
}
function latestPendingActionMessageIndex(messages, type) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const action = message?.pendingAction;
    const userTurnsAfter = messages.slice(index + 1).filter(item => item?.who === 'user').length;
    const expiresAfterTurns = Number(action?.expiresAfterTurns ?? 3);
    if (message?.who === 'gaid' && !message.ctaApplied && action?.type === type && userTurnsAfter <= expiresAfterTurns) {
      return index;
    }
  }
  return -1;
}
function getMessageSuggestions(message) {
  return normalizeItinerarySuggestions(message?.pendingAction?.payload?.itinerarySuggestions || message?.itinerarySuggestions);
}
function validateItineraryAction({ action, trip, days, suggestions = [], targetDay = null }) {
  if (!trip?.id) return 'Abra ou crie uma viagem antes de alterar o roteiro.';
  if (!trip.tripContext || typeof trip.tripContext !== 'object') return 'Ainda não tenho contexto suficiente dessa viagem para alterar o roteiro.';
  const safeDays = normalizeDays(days);
  if (action === 'CREATE_ITINERARY_ITEM') {
    if (safeDays.length === 0) return 'Ainda não há uma timeline criada para essa viagem.';
    if (!knownTripDestination(trip)) return 'Antes de incluir isso, preciso saber o destino da viagem.';
    if (!targetDay) return 'Em qual dia deseja incluir isso?';
    if (!safeDays.some(day => day.d === targetDay)) return `Não encontrei o dia ${targetDay} no roteiro.`;
  }
  if (action === 'ADD_TO_ITINERARY') {
    if (suggestions.length === 0) return 'Não encontrei uma sugestão pendente para aplicar ao roteiro.';
    const requiresExistingDay = suggestions.some(item => item.day && item.day <= maxTimelineDay(safeDays));
    if (requiresExistingDay) {
      const missingDay = suggestions.find(item => item.day && item.day <= maxTimelineDay(safeDays) && !safeDays.some(day => day.d === item.day));
      if (missingDay) return `Não encontrei o dia ${missingDay.day} no roteiro. Em qual dia você quer encaixar isso?`;
    }
  }
  if (action === 'REPLACE_ACTIVITY' || action === 'OPTIMIZE_ITINERARY') {
    if (safeDays.length === 0) return 'Ainda não há roteiro suficiente para essa alteração.';
  }
  if (action === 'REPLAN_ITINERARY') {
    if (safeDays.length === 0 || safeDays.every(day => day.items.length === 0)) return 'Ainda não há roteiro suficiente para reorganizar. Abra uma viagem com atividades no roteiro.';
  }
  if (targetDay && action !== 'ADD_DAY' && !safeDays.some(day => day.d === targetDay)) {
    return `Não encontrei o dia ${targetDay} no roteiro.`;
  }
  return null;
}
function maxTimelineDay(days) {
  const values = normalizeDays(days).map(day => Number(day.d)).filter(day => Number.isFinite(day) && day > 0);
  return values.length ? Math.max(...values) : 0;
}
function knownTripDestination(trip) {
  const destination = String(trip?.destination || trip?.tripContext?.destination || '').trim();
  return destination && destination !== TBD ? destination : '';
}
const PT_MONTHS_PLAN = {
  janeiro: 1, jan: 1,
  fevereiro: 2, fev: 2,
  marco: 3, março: 3, mar: 3,
  abril: 4, abr: 4,
  maio: 5, mai: 5,
  junho: 6, jun: 6,
  julho: 7, jul: 7,
  agosto: 8, ago: 8,
  setembro: 9, set: 9,
  outubro: 10, out: 10,
  novembro: 11, nov: 11,
  dezembro: 12, dez: 12,
};
function chooseDateYear(month, day, explicitYear = null) {
  if (explicitYear) return explicitYear;
  const now = new Date();
  const currentYear = now.getFullYear();
  const candidate = new Date(currentYear, month - 1, day, 23, 59, 59);
  return candidate >= now ? currentYear : currentYear + 1;
}
function isoPlanDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function parsePlanDateRange(value, fallbackDates = null) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const text = normText(raw);
  const numeric = text.match(/\b(?:chegada(?:\s+em)?|check.?in|de|vou viajar de|viajar de)?\s*(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\s*(?:a|ate|até|-|e volta(?:\s+em)?|volta(?:\s+em)?|checkout|check.?out)\s*(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/i);
  if (numeric) {
    const startDay = Number(numeric[1]);
    const startMonth = Number(numeric[2]);
    const explicitStartYear = numeric[3] ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]) : null;
    const endDay = Number(numeric[4]);
    const endMonth = Number(numeric[5]);
    const explicitEndYear = numeric[6] ? Number(numeric[6].length === 2 ? `20${numeric[6]}` : numeric[6]) : explicitStartYear;
    const startYear = chooseDateYear(startMonth, startDay, explicitStartYear);
    let endYear = explicitEndYear || startYear;
    if (!explicitEndYear && new Date(endYear, endMonth - 1, endDay) < new Date(startYear, startMonth - 1, startDay)) endYear += 1;
    return buildDateRangePayload(startYear, startMonth, startDay, endYear, endMonth, endDay);
  }
  const monthName = Object.keys(PT_MONTHS_PLAN).find(month => text.includes(month));
  const days = [...text.matchAll(/\b(\d{1,2})\b/g)].map(match => Number(match[1])).filter(day => day >= 1 && day <= 31);
  const explicitYear = Number(text.match(/\b(20\d{2})\b/)?.[1]) || null;
  if (monthName && days.length >= 2) {
    const month = PT_MONTHS_PLAN[monthName];
    const year = chooseDateYear(month, days[0], explicitYear);
    return buildDateRangePayload(year, month, days[0], year, month, days[1]);
  }
  const fallbackStart = localDateFromIso(fallbackDates?.start);
  if (fallbackStart && /(cheg(?:o|ada)|volt|de)\s+dia/.test(text) && days.length >= 2) {
    const month = fallbackStart.getMonth() + 1;
    const year = chooseDateYear(month, days[0], explicitYear || fallbackStart.getFullYear());
    return buildDateRangePayload(year, month, days[0], year, month, days[1]);
  }
  return null;
}
function hasWeatherDateMention(value) {
  const text = normText(value);
  return /\b(?:dia\s*)?\d{1,2}\s+de\s+[a-z]+/.test(text) ||
    /\bdia\s*\d{1,2}\b/.test(text);
}
function parseSinglePlanDate(value, fallbackDates = null) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const text = normText(raw);
  const dayMatch = text.match(/\b(?:dia\s*)?(\d{1,2})(?:\s+de\s+[a-z]+)?\b/);
  const day = Number(dayMatch?.[1]);
  if (!Number.isFinite(day) || day < 1 || day > 31) return null;
  const monthName = Object.keys(PT_MONTHS_PLAN).find(month => text.includes(month));
  const fallbackStart = localDateFromIso(fallbackDates?.start);
  const month = monthName ? PT_MONTHS_PLAN[monthName] : fallbackStart ? fallbackStart.getMonth() + 1 : null;
  if (!month) return null;
  const explicitYear = Number(text.match(/\b(20\d{2})\b/)?.[1]) || null;
  const year = explicitYear || fallbackStart?.getFullYear() || chooseDateYear(month, day);
  return isoPlanDate(year, month, day);
}
function replanDayFromCalendarDate(message, days, trip) {
  const safeDays = normalizeDays(days);
  const tripDates = trip?.tripContext?.dates || trip?.dates || null;
  const targetIso = parseSinglePlanDate(message, tripDates);
  const start = localDateFromIso(tripDates?.start);
  const target = localDateFromIso(targetIso);
  if (!start || !target) return null;
  const dayNumber = Math.round((target.getTime() - start.getTime()) / 86400000) + 1;
  if (!Number.isFinite(dayNumber) || dayNumber < 1) return null;
  return safeDays.find(day => day.d === dayNumber) || null;
}
function buildDateRangePayload(startYear, startMonth, startDay, endYear, endMonth, endDay) {
  const start = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  const nights = Math.round((end - start) / 86400000);
  if (nights <= 0 || nights > 60) return null;
  return {
    dates: {
      start: isoPlanDate(startYear, startMonth, startDay),
      end: isoPlanDate(endYear, endMonth, endDay),
      label: formatDateRangeLabel(start, end),
    },
    nights,
    durationDays: nights + 1,
  };
}
function formatDateRangeLabel(start, end) {
  const months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()}–${end.getDate()} ${months[start.getMonth()]}`;
  }
  return `${start.getDate()} ${months[start.getMonth()]} – ${end.getDate()} ${months[end.getMonth()]}`;
}
function dateLabelForDay(startIso, index) {
  const start = startIso ? new Date(`${startIso}T00:00:00`) : null;
  if (!start || Number.isNaN(start.getTime())) return TBD;
  const next = new Date(start);
  next.setDate(start.getDate() + index);
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  return `${next.getDate()} ${months[next.getMonth()]}`;
}
function resizeDaysForDateRange(currentDays, payload, city) {
  const safeDays = normalizeDays(currentDays).map((day, index) => ({
    ...day,
    date: index < payload.durationDays ? dateLabelForDay(payload.dates.start, index) : day.date,
    city: day.city && day.city !== TBD ? day.city : city || TBD,
    items: [...day.items],
  }));
  if (payload.durationDays > safeDays.length) {
    for (let index = safeDays.length; index < payload.durationDays; index += 1) {
      safeDays.push({
        d: index + 1,
        date: dateLabelForDay(payload.dates.start, index),
        city: city || TBD,
        flight: false,
        items: [],
      });
    }
  }
  return safeDays;
}
function buildAddDayPrompt({ message, trip, targetDay }) {
  return [
    message,
    '',
    `O usuário quer adicionar o dia ${targetDay} ao roteiro atual.`,
    'Gere atividades concretas para esse novo dia e retorne itinerarySuggestions estruturadas.',
    'Se for bate-volta, monte 3 itens para o mesmo dia: manhã, tarde e noite.',
    `Use day=${targetDay} em todos os itens e slots exatamente "manhã", "tarde" e "noite".`,
    'Cada item precisa ter title, place, dur, tag e vibe.',
    'A resposta será aplicada automaticamente. Não peça aprovação para adicionar.',
    `Contexto da viagem: ${JSON.stringify(trip?.tripContext || {}).slice(0, 1200)}`,
  ].join('\n');
}
function dayTripFallbackFromText(text, trip, targetDay) {
  const normalized = normText(text);
  const destination = trip?.destination || trip?.tripContext?.destination || TBD;
  if (/zipaquira|catedral de sal/.test(normalized)) {
    return [
      {
        day: targetDay,
        slot: 'manhã',
        title: 'Saída para Zipaquirá',
        place: destination && destination !== TBD ? destination : 'Bogotá',
        dur: '2h30',
        tag: 'deslocamento',
        vibe: 'começo tranquilo para um bate-volta confortável',
      },
      {
        day: targetDay,
        slot: 'tarde',
        title: 'Catedral de Sal de Zipaquirá',
        place: 'Catedral de Sal de Zipaquirá',
        dur: '3h',
        tag: 'cultura',
        vibe: 'experiência marcante e fácil de encaixar como bate-volta',
      },
      {
        day: targetDay,
        slot: 'noite',
        title: 'Retorno e jantar leve',
        place: destination && destination !== TBD ? destination : 'Bogotá',
        dur: '2h',
        tag: 'restaurante',
        vibe: 'fechamento sem pressa depois do deslocamento',
      },
    ];
  }
  return [];
}
function assistantResponseToBubble(response) {
  const itinerarySuggestions = normalizeItinerarySuggestions(response?.itinerarySuggestions);
  return {
    who: 'gaid',
    text: response.text,
    source: response.source,
    itinerarySuggestions,
    pendingAction: pendingActionFromSuggestions('ADD_ACTIVITY', itinerarySuggestions),
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
function buildInitialItineraryPrompt(kickoff, trip, duration, knowledge = null) {
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
    knowledgePromptBlock(knowledge),
  ].join('\n');
}
function arrayFrom(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}
function buildPlanKnowledgeRequest(trip, duration) {
  const tripContext = trip?.tripContext && typeof trip.tripContext === 'object' ? trip.tripContext : {};
  return {
    destination: knownTripDestination(trip),
    durationDays: duration?.days || tripContext.durationDays || null,
    nights: tripContext.nights || trip?.nights || null,
    dates: tripContext.dates || trip?.dates || null,
    period: tripContext.period || tripContext.dates?.label || '',
    travelers: tripContext.travelers || null,
    travelerComposition: tripContext.travelerComposition || tripContext.travelers?.composition || '',
    tripStyle: tripContext.stylePace || tripContext.comfortLevel || '',
    stylePace: tripContext.stylePace || null,
    priorities: [
      ...arrayFrom(tripContext.priorities),
      ...arrayFrom(tripContext.tripPriority),
      ...arrayFrom(tripContext.interests),
      ...arrayFrom(tripContext.experiences),
    ],
  };
}
function activePlanKnowledgeMetadata(knowledge) {
  const metadata = knowledge?.context?.sourceMetadata?.find(item => item.enabled);
  return {
    source: metadata?.source === 'KNOWLEDGE_CORE' ? 'gaid_knowledge_core' : metadata?.source || 'openai',
    confidence: metadata?.confidence || 0,
    reasoningHint: metadata?.reasoningHint || '',
  };
}
function hasUsefulPlanKnowledge(knowledge) {
  const context = knowledge?.context || {};
  const metadata = activePlanKnowledgeMetadata(knowledge);
  return metadata.source === 'gaid_knowledge_core' && (
    !!context.destinationKnowledge?.knowledge ||
    !!context.travelerRules?.rules ||
    (Array.isArray(context.knowledgeHints?.hints) && context.knowledgeHints.hints.length > 0)
  );
}
function compactPlanKnowledgeContext(knowledge) {
  if (!hasUsefulPlanKnowledge(knowledge)) return null;
  const context = knowledge.context || {};
  const metadata = activePlanKnowledgeMetadata(knowledge);
  return {
    destinationKnowledge: context.destinationKnowledge,
    travelerRules: context.travelerRules,
    knowledgeHints: context.knowledgeHints,
    sourceMetadata: context.sourceMetadata,
    source: metadata.source,
    confidence: metadata.confidence,
  };
}
function knowledgePromptBlock(knowledge) {
  const compact = compactPlanKnowledgeContext(knowledge);
  if (!compact) return '';
  const destination = compact.destinationKnowledge?.knowledge;
  const travelerRules = compact.travelerRules?.rules;
  const hints = compact.knowledgeHints?.hints || [];
  return [
    '',
    'Conhecimento Gaid para orientar esta primeira versão:',
    destination?.personality ? `- Personalidade do destino: ${destination.personality}` : '',
    destination?.pacingAdvice ? `- Ritmo recomendado: ${destination.pacingAdvice}` : '',
    destination?.foodStrengths?.length ? `- Gastronomia forte: ${destination.foodStrengths.join(', ')}` : '',
    destination?.cultureStrengths?.length ? `- Cultura/experiências fortes: ${destination.cultureStrengths.join(', ')}` : '',
    destination?.shoppingStrengths?.length ? `- Compras/áreas úteis: ${destination.shoppingStrengths.join(', ')}` : '',
    destination?.rainyDayAlternatives?.length ? `- Alternativas para chuva: ${destination.rainyDayAlternatives.join(', ')}` : '',
    travelerRules?.pacing ? `- Regra para perfil de viajante: ${travelerRules.pacing}` : '',
    hints.length ? `- Hints consolidados: ${hints.slice(0, 4).join(' ')}` : '',
    '- Use esse conhecimento como curadoria interna da Gaid, sem dizer que consultou APIs externas.',
  ].filter(Boolean).join('\n');
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
  const { isMobile } = useBreakpoint();
  const [mobilePane, setMobilePane] = useState('timeline');
  const toast = useToast();
  const tripStore = useTripStore();
  const tripData = useMemo(() => normalizeTripForPlan(trip), [trip]);
  const [tab, setTab] = useState('roteiro');
  const [chat, setChat] = useState(() => []);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const [days, setDays] = useState(() => safeClone(tripData.days));
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [activeMode, setActiveMode] = useState(null);
  const [prep, setPrep] = useState(() => tripData.prep ? JSON.parse(JSON.stringify(tripData.prep)) : null);
  const [pendingPlacementMessageIndex, setPendingPlacementMessageIndex] = useState(null);
  const chatEndRef = useRef(null);
  const kickoffKeyRef = useRef(null);
  const lastEditedDayRef = useRef(null);
  const lastModifiedActivityRef = useRef(null);

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
  const persistTimelineDays = (nextDays) => {
    if (!tripData.id) return Promise.resolve(null);
    return tripStore.patchItinerary(tripData.id, { days: normalizeDays(nextDays) }).catch((error) => {
      console.error('[PlanScreen] Failed to persist itinerary days', error);
      return null;
    });
  };
  const updateDays = (updater) => {
    setDays(currentDays => {
      const nextDays = typeof updater === 'function' ? updater(currentDays) : updater;
      const safeDays = normalizeDays(nextDays);
      persistTimelineDays(safeDays);
      return safeDays;
    });
  };
  const commitTimelineDays = async (nextDays) => {
    const safeDays = normalizeDays(nextDays);
    setDays(safeDays);
    await persistTimelineDays(safeDays);
    return safeDays;
  };

  const replaceActivity = async (target, suggestion) => {
    const normalized = normalizeItinerarySuggestions([{
      ...suggestion,
      day: target.day.d,
      slot: target.item.t,
    }])[0];
    if (!normalized) return false;
    const nextDays = normalizeDays(days).map((day, dayIdx) => {
      if (dayIdx !== target.dayIdx) return { ...day, items: [...day.items] };
      return {
        ...day,
        items: day.items.map((item, itemIdx) => itemIdx === target.itemIdx
          ? {
            ...item,
            t: target.item.t,
            title: normalized.title,
            place: normalized.place,
            dur: normalized.dur || target.item.dur,
            tag: normalized.tag || target.item.tag,
            vibe: normalized.vibe,
            conf: false,
          }
          : item
        ),
      };
    });
    setDays(nextDays);
    lastEditedDayRef.current = target.day.d;
    const nextRef = storedActivityRefFromEntry({
      day: nextDays[target.dayIdx],
      item: nextDays[target.dayIdx]?.items?.[target.itemIdx],
    });
    lastModifiedActivityRef.current = nextRef;
    setSelectedItem(nextRef ? { ...nextRef, dayIdx: target.dayIdx, itemIdx: target.itemIdx } : null);
    await persistTimelineDays(nextDays);
    return true;
  };
  const moveActivity = async (source, target) => {
    const safeDays = normalizeDays(days).map(day => ({ ...day, items: [...day.items] }));
    if (!source?.item || !source?.day) return false;

    const targetDayNumber = Number(target?.day);
    if (!Number.isFinite(targetDayNumber) || targetDayNumber < 1 || !target?.slot) return false;

    const maxDay = maxTimelineDay(safeDays);
    if (targetDayNumber > maxDay) {
      for (let dayNumber = maxDay + 1; dayNumber <= targetDayNumber; dayNumber += 1) {
        safeDays.push(placeholderDay(dayNumber));
      }
    }

    const sourceDay = safeDays.find(day => day.d === source.day.d);
    const targetDay = safeDays.find(day => day.d === targetDayNumber);
    if (!sourceDay || !targetDay) return false;

    const sourceIndex = sourceDay.items.findIndex((item, index) => {
      if (source.item?.id && item.id === source.item.id) return true;
      return index === source.itemIdx && normText(item.title) === normText(source.item.title);
    });
    if (sourceIndex < 0) return false;

    const [movedItem] = sourceDay.items.splice(sourceIndex, 1);
    const nextItem = { ...movedItem, t: target.slot };
    targetDay.items.push(nextItem);

    const nextDays = safeDays.sort((a, b) => a.d - b.d);
    lastEditedDayRef.current = targetDayNumber;
    const targetEntry = {
      day: nextDays.find(day => day.d === targetDayNumber),
      item: nextItem,
    };
    lastModifiedActivityRef.current = storedActivityRefFromEntry(targetEntry);
    setSelectedItem(null);
    await commitTimelineDays(nextDays);
    return true;
  };
  const removeActivity = async (source) => {
    const safeDays = normalizeDays(days).map(day => ({ ...day, items: [...day.items] }));
    if (!source?.item || !source?.day) return false;

    const sourceDay = safeDays.find(day => day.d === source.day.d);
    if (!sourceDay) return false;

    const sourceIndex = sourceDay.items.findIndex((item, index) => {
      if (source.item?.id && item.id === source.item.id) return true;
      return index === source.itemIdx && normText(item.title) === normText(source.item.title);
    });
    if (sourceIndex < 0) return false;

    sourceDay.items.splice(sourceIndex, 1);
    lastEditedDayRef.current = source.day.d;
    lastModifiedActivityRef.current = null;
    setSelectedItem(null);
    await commitTimelineDays(safeDays);
    return true;
  };
  const applyPendingReplan = async (messageIndex) => {
    const message = chat[messageIndex];
    const action = message?.pendingAction;
    if (action?.type !== 'PENDING_REPLAN') return 'none';
    const nextDays = normalizeDays(action.payload?.nextDays);
    if (nextDays.length === 0) return 'none';
    await commitTimelineDays(nextDays);
    setChat(current => current.map((item, index) => index === messageIndex
      ? { ...item, cta: ['Aplicado'], ctaApplied: true }
      : item
    ));
    const reply = 'Pronto — reorganizei o roteiro com essas mudanças.';
    setChat(current => [...current, { who: 'gaid', text: reply, source: 'replanning-engine' }]);
    persistPlanMessage('assistant', reply, {
      source: 'replanning-engine',
      intent: 'REPLAN_ITINERARY',
      replanType: action.payload?.replanType,
      replanSummary: action.payload?.summary,
      changes: action.payload?.changes?.map(({ item, ...change }) => change),
      knowledgeSource: action.payload?.source,
      confidence: action.payload?.confidence,
      reasoningHint: action.payload?.reasoningHint,
    });
    toast({ title: 'Roteiro reorganizado', desc: action.payload?.summary || 'Mudanças aplicadas.', tone: 'success' });
    return 'applied';
  };
  const clearPendingItineraryActions = () => {
    setChat(current => current.map((item) => {
      const hasPendingItineraryAction = item?.pendingAction?.type === 'ADD_ACTIVITY' ||
        item?.pendingAction?.type === 'ADD_DAY' ||
        (Array.isArray(item?.itinerarySuggestions) && item.itinerarySuggestions.length > 0);
      return hasPendingItineraryAction
        ? { ...item, cta: null, ctaApplied: true, pendingAction: null }
        : item;
    }));
    setPendingPlacementMessageIndex(null);
  };

  // If trip changes (user opened a different trip), reset state.
  useEffect(() => {
    setDays(safeClone(tripData.days));
    setActiveMode(null);
    setEditing(null);
    setAdding(null);
    setSelectedItem(null);
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

  const buildTimelineWithNewDay = (baseDays, targetDay, suggestions = []) => {
    const slots = ['manhã', 'tarde', 'noite'];
    const existingDays = normalizeDays(baseDays).map(day => ({ ...day, items: [...day.items] }));
    const newItems = normalizeItinerarySuggestions(suggestions)
      .map((item, index) => ({
        ...item,
        day: targetDay,
        slot: item.slot || slots[index % slots.length],
      }))
      .filter(item => item.title && item.slot)
      .map(item => ({
        t: item.slot,
        title: item.title,
        place: item.place,
        dur: item.dur,
        tag: item.tag,
        vibe: item.vibe,
        conf: false,
      }));
    return [
      ...existingDays.filter(day => day.d !== targetDay),
      { ...placeholderDay(targetDay), items: newItems },
    ].sort((a, b) => a.d - b.d);
  };

  const buildTimelineWithSuggestions = (baseDays, suggestions, placement = null) => {
    const normalized = normalizeItinerarySuggestions(suggestions);
    const placedSuggestions = normalized.map(item => ({
      ...item,
      day: item.day || placement?.day,
      slot: item.slot || placement?.slot,
    })).filter(item => item.day && item.slot);
    const nextDays = normalizeDays(baseDays).map(day => ({ ...day, items: [...day.items] }));
    if (placedSuggestions.length === 0) return { nextDays, count: 0 };
    const maxDay = Math.max(...placedSuggestions.map(item => item.day));
    for (let dayNumber = 1; dayNumber <= maxDay; dayNumber += 1) {
      if (!nextDays.some(day => day.d === dayNumber)) nextDays.push(placeholderDay(dayNumber));
    }
    placedSuggestions.forEach((suggestion) => {
      const day = nextDays.find(item => item.d === suggestion.day);
      if (!day) return;
      lastEditedDayRef.current = suggestion.day;
      const nextItem = {
        t: suggestion.slot,
        title: suggestion.title,
        place: suggestion.place,
        dur: suggestion.dur,
        tag: suggestion.tag,
        vibe: suggestion.vibe,
        conf: false,
      };
      day.items.push(nextItem);
      lastModifiedActivityRef.current = storedActivityRefFromEntry({ day, item: nextItem });
    });
    return { nextDays: nextDays.sort((a, b) => a.d - b.d), count: placedSuggestions.length };
  };

  const applySuggestionListToTimeline = async (suggestions, placement = null) => {
    const { nextDays, count } = buildTimelineWithSuggestions(days, suggestions, placement);
    if (count === 0) return 0;
    await commitTimelineDays(nextDays);
    return count;
  };

  const applyItinerarySuggestions = async (messageIndex, placement = null, { confirm = false, confirmText = 'Pronto — adicionei isso ao roteiro.' } = {}) => {
    const message = chat[messageIndex];
    const suggestions = getMessageSuggestions(message);
    if (suggestions.length === 0 || message?.ctaApplied) return 'none';
    const guard = validateItineraryAction({
      action: 'ADD_TO_ITINERARY',
      trip: tripData,
      days,
      suggestions,
      targetDay: placement?.day || null,
    });
    if (guard) {
      setChat(current => [...current, { who: 'gaid', text: guard, source: 'state-guard' }]);
      return 'blocked';
    }
    if (!placement && !suggestionsHavePlacement(suggestions)) {
      setPendingPlacementMessageIndex(messageIndex);
      setChat(current => [...current, {
        who: 'gaid',
        text: 'Claro. Em qual dia e período você quer encaixar isso? Exemplos: “Dia 2 de manhã”, “Dia 3 à tarde”, “No primeiro dia à noite”.',
        source: 'local',
      }]);
      return 'needs-placement';
    }
    const appliedCount = await applySuggestionListToTimeline(suggestions, placement);
    if (appliedCount === 0) return 'none';
    setChat(current => {
      const next = current.map((item, index) => index === messageIndex
        ? { ...item, cta: ['Adicionado ao roteiro'], ctaApplied: true }
        : item
      );
      return confirm
        ? [...next, { who: 'gaid', text: confirmText, source: 'local' }]
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
    const planKnowledge = isWizardKickoff
      ? getKnowledgeForRequest('PLAN_TRIP', buildPlanKnowledgeRequest(tripData, duration))
      : null;
    const planKnowledgeContext = compactPlanKnowledgeContext(planKnowledge);
    const planKnowledgeMetadata = activePlanKnowledgeMetadata(planKnowledge);
    if (isWizardKickoff) {
      logKnowledgeDecision({
        surface: 'plan',
        flow: 'initial-itinerary',
        intent: 'PLAN_TRIP',
        destination: knownTripDestination(tripData),
        durationDays: duration.days,
        sources: planKnowledge?.context?.sourceMetadata,
        selectedSource: planKnowledgeContext?.source || 'openai',
        confidence: planKnowledgeContext?.confidence || 0,
        fallbackUsed: !planKnowledgeContext,
      });
    }
    const chatMessage = isWizardKickoff
      ? buildInitialItineraryPrompt(kickoff, tripData, duration, planKnowledge)
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
        ...(planKnowledgeContext ? {
          destinationKnowledge: planKnowledgeContext.destinationKnowledge,
          travelerRules: planKnowledgeContext.travelerRules,
          knowledgeHints: planKnowledgeContext.knowledgeHints,
          sourceMetadata: planKnowledgeContext.sourceMetadata,
          knowledgeSource: planKnowledgeContext.source,
          knowledgeConfidence: planKnowledgeContext.confidence,
        } : {}),
      },
    }).then(async (response) => {
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
          const { nextDays, count } = buildTimelineWithSuggestions(days, initialSuggestions);
          if (count > 0) await commitTimelineDays(nextDays);
        }
        logToolExecution({
          surface: 'plan',
          flow: 'initial-itinerary',
          tool: 'Trip Planner',
          action: initialSuggestions.length > 0 ? 'apply_initial_itinerary' : 'fallback_empty_structure',
          generationSource: initialSuggestions.length > 0 && planKnowledgeContext ? planKnowledgeContext.source : initialSuggestions.length > 0 ? response.source : 'local',
          confidence: initialSuggestions.length > 0 && planKnowledgeContext ? planKnowledgeContext.confidence : 0,
          fallbackUsed: initialSuggestions.length === 0,
          suggestionCount: initialSuggestions.length,
          durationDays: duration.days,
        });
        setChat(c => [...c, {
          who: 'gaid',
          text,
          source: initialSuggestions.length > 0 && planKnowledgeContext ? planKnowledgeContext.source : initialSuggestions.length > 0 ? response.source : 'local',
          itinerarySuggestions: initialSuggestions,
          knowledge: planKnowledgeContext || null,
          knowledgeSource: initialSuggestions.length > 0 && planKnowledgeContext ? planKnowledgeContext.source : null,
          confidence: initialSuggestions.length > 0 && planKnowledgeContext ? planKnowledgeContext.confidence : null,
          cta: null,
          ctaApplied: initialSuggestions.length > 0,
          initialKickoff: true,
        }]);
        persistPlanMessage('assistant', text, {
          source: initialSuggestions.length > 0 && planKnowledgeContext ? planKnowledgeContext.source : initialSuggestions.length > 0 ? response.source : 'local',
          initialItinerary: true,
          knowledge: planKnowledgeContext || null,
          confidence: initialSuggestions.length > 0 && planKnowledgeContext ? planKnowledgeContext.confidence : null,
          reasoningHint: initialSuggestions.length > 0 && planKnowledgeContext ? planKnowledgeMetadata.reasoningHint : null,
        });
      } else {
        setChat(c => [...c, assistantResponseToBubble(response)]);
        persistPlanMessage('assistant', response.text, { source: response.source });
      }
      clearKickoff && clearKickoff();
    }).catch((error) => {
      if (!alive) return;
      setTyping(false);
      const fallback = isWizardKickoff
        ? 'Criei a estrutura dos dias do roteiro. Me peça para montar uma primeira versão quando quiser.'
        : 'Não consegui responder agora. Tente novamente em instantes.';
      logBrainError({
        surface: 'plan',
        flow: isWizardKickoff ? 'initial-itinerary' : 'chat',
        tool: 'Trip Planner',
        fallbackUsed: true,
        generationSource: 'error',
        error,
      });
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
    const lastAssistant = latestAssistantMessage(chat);
    const selectedTarget = resolveStoredActivityRef(days, selectedItem);
    let planIntent = classifyPlanChatIntent(t, tripData, lastAssistant);
    if (selectedTarget?.item && isSelectedItemApplyCommand(t)) {
      planIntent = {
        intent: 'REPLACE_ACTIVITY',
        confidence: 0.96,
        requiresTrip: true,
        nextTool: 'Itinerary Editor',
        reason: 'Usuário pediu aplicação/troca enquanto havia um item selecionado.',
      };
    }
    setChat(nextChat);
    setDraft('');
    setTyping(true);
    persistPlanMessage('user', t);

    if (pendingPlacementMessageIndex !== null) {
      const placement = parsePlacement(t);
      setTyping(false);
      if (placement) {
        const reply = 'Pronto — adicionei esse dia ao roteiro.';
        await applyItinerarySuggestions(pendingPlacementMessageIndex, placement, { confirm: true, confirmText: reply });
        persistPlanMessage('assistant', reply, { source: 'local' });
      } else {
        const placementReply = 'Claro. Em qual dia e período você quer encaixar isso? Exemplos: “Dia 2 de manhã”, “Dia 3 à tarde”, “No primeiro dia à noite”.';
        setChat(c => [...c, { who: 'gaid', text: placementReply, source: 'local' }]);
        persistPlanMessage('assistant', placementReply, { source: 'local' });
      }
      return;
    }

    if (isApplyIntent(t) && planIntent.intent !== 'REPLACE_ACTIVITY') {
      const replanIndex = latestPendingActionMessageIndex(nextChat, 'PENDING_REPLAN');
      if (replanIndex >= 0) {
        setTyping(false);
        const result = await applyPendingReplan(replanIndex);
        if (result === 'none') {
          const reply = 'Não encontrei uma reorganização pendente para aplicar.';
          setChat(c => [...c, { who: 'gaid', text: reply, source: 'state-guard' }]);
          persistPlanMessage('assistant', reply, { source: 'state-guard', intent: 'REPLAN_ITINERARY' });
        }
        return;
      }
    }

    if (planIntent.intent === 'CHANGE_DATES') {
      setTyping(false);
      if (!tripData.id) {
        const reply = 'Abra ou crie uma viagem antes de alterar as datas.';
        setChat(c => [...c, { who: 'gaid', text: reply, source: 'state-guard' }]);
        persistPlanMessage('assistant', reply, { source: 'state-guard', intent: planIntent.intent });
        return;
      }
      const parsed = parsePlanDateRange(t, tripData.tripContext?.dates);
      if (!parsed) {
        const reply = 'Claro. Qual é o intervalo da viagem? Pode me dizer, por exemplo: “20 a 27 de setembro”.';
        setChat(c => [...c, { who: 'gaid', text: reply, source: 'date-tool' }]);
        persistPlanMessage('assistant', reply, { source: 'date-tool', intent: planIntent.intent });
        return;
      }
      const nextDays = resizeDaysForDateRange(days, parsed, tripData.destination || tripData.tripContext?.destination || TBD);
      const hasExtraDays = nextDays.length > parsed.durationDays;
      await tripStore.patchItinerary(tripData.id, {
        context: {
          dates: parsed.dates,
          nights: parsed.nights,
          durationDays: parsed.durationDays,
        },
        days: nextDays,
      });
      setDays(nextDays);
      const reply = hasExtraDays
        ? `Pronto — atualizei a viagem para ${parsed.dates.label}. Seu roteiro ainda tem dias extras; quer que eu revise esses dias antes de remover qualquer coisa?`
        : `Pronto — atualizei a viagem para ${parsed.dates.label}.`;
      setChat(c => [...c, { who: 'gaid', text: reply, source: 'date-tool', status: 'applied', ctaApplied: true }]);
      persistPlanMessage('assistant', reply, {
        source: 'date-tool',
        intent: planIntent.intent,
        status: 'applied',
        dates: parsed.dates,
        nights: parsed.nights,
        durationDays: parsed.durationDays,
      });
      toast({ title: 'Datas atualizadas', desc: parsed.dates.label, tone: 'success' });
      return;
    }

    if (planIntent.intent === 'MOVE_ACTIVITY') {
      setTyping(false);
      if (!tripData.id) {
        const reply = 'Abra ou crie uma viagem antes de mover um item do roteiro.';
        setChat(c => [...c, { who: 'gaid', text: reply, source: 'state-guard' }]);
        persistPlanMessage('assistant', reply, { source: 'state-guard', intent: planIntent.intent });
        return;
      }
      const source = resolveStoredActivityRef(days, selectedItem) ||
        resolveStoredActivityRef(days, lastModifiedActivityRef.current);
      if (!source?.item) {
        const reply = 'Qual item você quer mover?';
        setChat(c => [...c, { who: 'gaid', text: reply, source: 'state-guard' }]);
        persistPlanMessage('assistant', reply, { source: 'state-guard', intent: planIntent.intent });
        return;
      }
      const target = parseMoveTarget(t, days, source);
      if (target.needsNextDay) {
        const reply = 'Ainda não existe um dia seguinte no roteiro. Quer que eu crie mais um dia primeiro?';
        setChat(c => [...c, { who: 'gaid', text: reply, source: 'state-guard' }]);
        persistPlanMessage('assistant', reply, { source: 'state-guard', intent: planIntent.intent });
        return;
      }
      if (!target.day || !target.slot) {
        const reply = 'Para qual dia e período você quer mover esse item?';
        setChat(c => [...c, { who: 'gaid', text: reply, source: 'state-guard' }]);
        persistPlanMessage('assistant', reply, { source: 'state-guard', intent: planIntent.intent });
        return;
      }
      const moved = await moveActivity(source, target);
      if (!moved) {
        const reply = 'Não consegui mover esse item agora. Tente selecionar o item de novo e me dizer o dia ou período.';
        setChat(c => [...c, { who: 'gaid', text: reply, source: 'error' }]);
        persistPlanMessage('assistant', reply, { source: 'error', intent: planIntent.intent });
        return;
      }
      const reply = `Pronto — movi esse item para o Dia ${target.day}, ${target.slot}.`;
      setChat(c => [...c, { who: 'gaid', text: reply, source: 'itinerary-tool' }]);
      persistPlanMessage('assistant', reply, {
        source: 'itinerary-tool',
        intent: planIntent.intent,
        moved: source.item.title,
        from: { day: source.day.d, slot: source.item.t },
        to: { day: target.day, slot: target.slot },
      });
      toast({ title: `Movido para o Dia ${target.day}`, desc: target.slot, tone: 'success' });
      return;
    }

    if (planIntent.intent === 'REMOVE_ACTIVITY') {
      setTyping(false);
      if (!tripData.id) {
        const reply = 'Abra ou crie uma viagem antes de remover um item do roteiro.';
        setChat(c => [...c, { who: 'gaid', text: reply, source: 'state-guard' }]);
        persistPlanMessage('assistant', reply, { source: 'state-guard', intent: planIntent.intent });
        return;
      }
      const hadSelectedItem = !!selectedItem;
      const source = resolveStoredActivityRef(days, selectedItem) ||
        resolveStoredActivityRef(days, lastModifiedActivityRef.current);
      if (!source?.item) {
        if (hadSelectedItem) setSelectedItem(null);
        const reply = hadSelectedItem
          ? 'Não encontrei mais esse item no roteiro. Selecione outro item para remover.'
          : 'Qual item você quer remover?';
        setChat(c => [...c, { who: 'gaid', text: reply, source: 'state-guard' }]);
        persistPlanMessage('assistant', reply, { source: 'state-guard', intent: planIntent.intent });
        return;
      }
      const removed = await removeActivity(source);
      if (!removed) {
        setSelectedItem(null);
        const reply = 'Não encontrei mais esse item no roteiro. Selecione outro item para remover.';
        setChat(c => [...c, { who: 'gaid', text: reply, source: 'state-guard' }]);
        persistPlanMessage('assistant', reply, { source: 'state-guard', intent: planIntent.intent });
        return;
      }
      const reply = 'Pronto — removi esse item do roteiro.';
      setChat(c => [...c, { who: 'gaid', text: reply, source: 'itinerary-tool' }]);
      persistPlanMessage('assistant', reply, {
        source: 'itinerary-tool',
        intent: planIntent.intent,
        removed: source.item.title,
        from: { day: source.day.d, slot: source.item.t },
      });
      toast({ title: 'Item removido', desc: source.item.title, tone: 'success' });
      return;
    }

    if (planIntent.intent === 'REPLAN_ITINERARY') {
      setTyping(false);
      const guard = validateItineraryAction({
        action: 'REPLAN_ITINERARY',
        trip: tripData,
        days,
      });
      if (guard) {
        const guardText = inferReplanType(t) === 'WEATHER'
          ? 'Entendi a previsão de chuva. Consigo ajustar, mas preciso que o roteiro tenha atividades definidas para saber o que mover ou trocar.'
          : guard;
        setChat(c => [...c, { who: 'gaid', text: guardText, source: 'state-guard' }]);
        persistPlanMessage('assistant', guardText, { source: 'state-guard', intent: planIntent.intent });
        return;
      }
      const preview = buildReplanPreview({ message: t, trip: tripData, days });
      const text = previewTextForReplan(preview);
      if (!Array.isArray(preview.changes) || preview.changes.length === 0) {
        setChat(c => [...c, { who: 'gaid', text, source: 'replanning-engine' }]);
        persistPlanMessage('assistant', text, {
          source: 'replanning-engine',
          intent: planIntent.intent,
          replanType: preview.type,
          knowledgeSource: preview.source,
          confidence: preview.confidence,
          reasoningHint: preview.reasoningHint,
        });
        return;
      }
      setChat(c => [...c, {
        who: 'gaid',
        text,
        source: 'replanning-engine',
        pendingAction: {
          type: 'PENDING_REPLAN',
          payload: {
            replanType: preview.type,
            nextDays: preview.nextDays,
            changes: preview.changes,
            summary: preview.summary,
            source: preview.source,
            confidence: preview.confidence,
            reasoningHint: preview.reasoningHint,
          },
          expiresAfterTurns: 3,
        },
        cta: ['Aplicar'],
      }]);
      persistPlanMessage('assistant', text, {
        source: 'replanning-engine',
        intent: planIntent.intent,
        replanType: preview.type,
        changes: preview.changes.map(({ item, ...change }) => change),
        knowledgeSource: preview.source,
        confidence: preview.confidence,
        reasoningHint: preview.reasoningHint,
      });
      return;
    }

    if (planIntent.intent === 'ADD_TO_ITINERARY') {
      const suggestionIndex = latestSuggestionMessageIndex(nextChat);
      if (suggestionIndex >= 0) {
        setTyping(false);
        const message = nextChat[suggestionIndex];
        const suggestions = getMessageSuggestions(message);
        const guard = validateItineraryAction({
          action: 'ADD_TO_ITINERARY',
          trip: tripData,
          days,
          suggestions,
        });
        if (guard) {
          setChat(c => [...c, { who: 'gaid', text: guard, source: 'state-guard' }]);
          persistPlanMessage('assistant', guard, { source: 'state-guard', intent: planIntent.intent });
          return;
        }
        if (suggestionsHavePlacement(suggestions)) {
          const createsNewDay = suggestions.some(item => Number(item.day) > maxTimelineDay(days));
          const reply = createsNewDay ? 'Pronto — adicionei esse dia ao roteiro.' : 'Pronto — adicionei isso ao roteiro.';
          await applyItinerarySuggestions(suggestionIndex, null, { confirm: true, confirmText: reply });
          persistPlanMessage('assistant', reply, { source: 'local' });
        } else {
          setPendingPlacementMessageIndex(suggestionIndex);
          const placementReply = 'Claro. Em qual dia e período você quer encaixar isso? Exemplos: “Dia 2 de manhã”, “Dia 3 à tarde”, “No primeiro dia à noite”.';
          setChat(c => [...c, { who: 'gaid', text: placementReply, source: 'local' }]);
          persistPlanMessage('assistant', placementReply, { source: 'local' });
        }
        return;
      }
      const targetDay = maxTimelineDay(days) + 1;
      const fallbackSuggestions = dayTripFallbackFromText(lastAssistant?.text, tripData, targetDay);
      if (fallbackSuggestions.length > 0) {
        setTyping(false);
        const guard = validateItineraryAction({
          action: 'ADD_TO_ITINERARY',
          trip: tripData,
          days,
          suggestions: fallbackSuggestions,
        });
        if (guard) {
          setChat(current => [...current, { who: 'gaid', text: guard, source: 'state-guard' }]);
          persistPlanMessage('assistant', guard, { source: 'state-guard', intent: planIntent.intent });
          return;
        }
        await applySuggestionListToTimeline(fallbackSuggestions);
        const reply = 'Pronto — adicionei esse dia ao roteiro.';
        setChat(current => [...current, { who: 'gaid', text: reply, source: 'local' }]);
        persistPlanMessage('assistant', reply, { source: 'local' });
        return;
      }
      setTyping(false);
      const resolvedDay = resolveTargetDay({ message: t, days, lastEditedDay: lastEditedDayRef.current });
      const guard = validateItineraryAction({
        action: 'CREATE_ITINERARY_ITEM',
        trip: tripData,
        days,
        targetDay: resolvedDay,
      });
      if (guard) {
        setChat(current => [...current, { who: 'gaid', text: guard, source: 'state-guard' }]);
        persistPlanMessage('assistant', guard, { source: 'state-guard', intent: planIntent.intent });
        return;
      }
      const targetDayData = normalizeDays(days).find(day => day.d === resolvedDay);
      const item = buildLocalItineraryItem(t, tripData, resolvedDay, targetDayData);
      const nextDays = normalizeDays(days).map(day => day.d === resolvedDay
        ? {
          ...day,
          items: [...day.items, {
            t: item.slot,
            title: item.title,
            place: item.place,
            dur: item.dur,
            tag: item.tag,
            vibe: item.vibe,
            conf: false,
          }],
        }
        : { ...day, items: [...day.items] }
      );
      lastEditedDayRef.current = resolvedDay;
      lastModifiedActivityRef.current = {
        dayNumber: resolvedDay,
        itemTitle: item.title,
        itemPlace: item.place,
        itemSlot: item.slot,
        itemTag: item.tag,
      };
      setDays(nextDays);
      await persistTimelineDays(nextDays);
      const reply = `Pronto — adicionei ${item.tag === 'café' ? 'o café' : item.tag === 'restaurante' ? 'o restaurante' : item.tag === 'bate-volta' ? 'o bate-volta' : item.tag === 'bar' ? 'o rooftop' : 'a sugestão'} ao Dia ${resolvedDay}.`;
      setChat(current => [...current, { who: 'gaid', text: reply, source: 'itinerary-tool' }]);
      persistPlanMessage('assistant', reply, { source: 'itinerary-tool', intent: planIntent.intent, targetDay: resolvedDay, item });
      toast({ title: `Adicionado ao Dia ${resolvedDay}`, desc: item.title, tone: 'success' });
      return;
    }

    if (planIntent.intent === 'ADD_DAY') {
      const targetDay = maxTimelineDay(days) + 1;
      if (!tripData.id) {
        setTyping(false);
        const reply = 'Abra ou crie uma viagem antes de adicionar um novo dia ao roteiro.';
        setChat(c => [...c, { who: 'gaid', text: reply, source: 'state-guard' }]);
        persistPlanMessage('assistant', reply, { source: 'state-guard', intent: planIntent.intent });
        return;
      }
      if (!knownTripDestination(tripData)) {
        setTyping(false);
        const reply = 'Para adicionar um novo dia, preciso saber o destino da viagem. Para onde é esse roteiro?';
        setChat(c => [...c, { who: 'gaid', text: reply, source: 'state-guard' }]);
        persistPlanMessage('assistant', reply, { source: 'state-guard', intent: planIntent.intent });
        return;
      }
      try {
        const baseDays = normalizeDays(days);
        const dayOnlyTimeline = buildTimelineWithNewDay(baseDays, targetDay, []);
        setDays(dayOnlyTimeline);
        await persistTimelineDays(dayOnlyTimeline);

        const response = await tripApi.sendChatMessage({
          message: buildAddDayPrompt({ message: t, trip: tripData, targetDay }),
          history: nextChat
            .filter(m => m.text)
            .map(m => ({ role: m.who === 'user' ? 'user' : 'assistant', text: m.text })),
          context: {
            surface: 'plan',
            tripTitle: tripData.title,
            planEdit: 'ADD_DAY',
            targetDay,
            tripContext: tripData.tripContext,
          },
        });
        const slots = ['manhã', 'tarde', 'noite'];
        const structured = normalizeItinerarySuggestions(response.itinerarySuggestions)
          .map((item, index) => ({ ...item, day: targetDay, slot: item.slot || slots[index % slots.length] }));
        const fallback = structured.length > 0 ? [] : dayTripFallbackFromText(`${t}\n${response.text || ''}`, tripData, targetDay);
        const suggestions = structured.length > 0 ? structured : fallback;
        const finalTimeline = buildTimelineWithNewDay(baseDays, targetDay, suggestions);
        setDays(finalTimeline);
        await persistTimelineDays(finalTimeline);
        const text = suggestions.length > 0
          ? `Pronto — criei o dia ${targetDay} e adicionei as atividades ao roteiro.`
          : `Pronto — criei o dia ${targetDay} no roteiro. Não consegui gerar atividades claras agora, mas os dias anteriores ficaram intactos.`;
        setChat(c => [...c, { who: 'gaid', text, source: suggestions.length > 0 ? response.source : 'local' }]);
        persistPlanMessage('assistant', text, {
          source: suggestions.length > 0 ? response.source : 'local',
          planEdit: 'ADD_DAY',
          targetDay,
          generatedItems: suggestions.length,
        });
        toast({ title: `Dia ${targetDay} adicionado`, desc: suggestions.length > 0 ? `${suggestions.length} atividades criadas.` : 'Novo dia criado sem alterar os anteriores.', tone: 'success' });
      } catch (_error) {
        const fallback = `Criei o dia ${targetDay}, mas não consegui gerar atividades agora. Tente novamente em instantes.`;
        setChat(c => [...c, { who: 'gaid', text: fallback, source: 'error' }]);
        persistPlanMessage('assistant', fallback, { source: 'error', planEdit: 'ADD_DAY', targetDay });
      } finally {
        setTyping(false);
      }
      return;
    }

    if (planIntent.intent === 'REPLACE_ACTIVITY') {
      const target = resolveActivityTarget({
        message: t,
        days,
        editing: selectedItem || editing,
        lastModifiedRef: lastModifiedActivityRef,
        chat,
      });
      const guard = validateReplaceActivity({
        trip: tripData,
        days,
        target,
      });
      if (guard) {
        setTyping(false);
        setChat(c => [...c, { who: 'gaid', text: guard, source: 'state-guard' }]);
        persistPlanMessage('assistant', guard, { source: 'state-guard', intent: planIntent.intent });
        return;
      }
      try {
        const replacementInstruction = replacementInstructionFromMessage(t, target);
        const response = await tripApi.sendChatMessage({
          message: buildReplaceActivityPrompt({ message: t, trip: tripData, target, instruction: replacementInstruction }),
          history: nextChat
            .filter(m => m.text)
            .map(m => ({ role: m.who === 'user' ? 'user' : 'assistant', text: m.text })),
          context: {
            surface: 'plan',
            tripTitle: tripData.title,
            planEdit: 'REPLACE_ACTIVITY',
            replacementTarget: {
              day: target.day.d,
              slot: target.item.t,
              title: target.item.title,
              place: target.item.place,
              tag: target.item.tag,
            },
            tripContext: tripData.tripContext,
          },
        });
        const structured = normalizeItinerarySuggestions(response.itinerarySuggestions)
          .find(item => item.title);
        const suggestion = structured
          ? { ...structured, day: target.day.d, slot: target.item.t }
          : localReplacementSuggestion(t, tripData, target, replacementInstruction);
        await replaceActivity(target, suggestion);
        clearPendingItineraryActions();
        setSelectedItem(null);
        const oldShort = String(target.item.title || 'a atividade').split(/\s+\+\s+|,\s*/)[0];
        const newShort = /caminhada/i.test(suggestion.title)
          ? 'uma caminhada a dois no mesmo período'
          : suggestion.title;
        const reply = `Pronto — substituí ${oldShort} por ${newShort}.`;
        setChat(c => [...c, { who: 'gaid', text: reply, source: structured ? response.source : 'local', status: 'applied', ctaApplied: true }]);
        persistPlanMessage('assistant', reply, {
          source: structured ? response.source : 'local',
          intent: planIntent.intent,
          status: 'applied',
          replaced: target.item.title,
          replacement: suggestion.title,
        });
        toast({ title: 'Atividade substituída', desc: suggestion.title, tone: 'success' });
      } catch (_error) {
        const fallback = 'Não consegui substituir essa atividade agora. Tente novamente em instantes.';
        setChat(c => [...c, { who: 'gaid', text: fallback, source: 'error' }]);
        persistPlanMessage('assistant', fallback, { source: 'error', intent: planIntent.intent });
      } finally {
        setTyping(false);
      }
      return;
    }

    if (planIntent.intent === 'OPTIMIZE_ITINERARY') {
      setTyping(false);
      const guard = validateItineraryAction({
        action: planIntent.intent,
        trip: tripData,
        days,
      });
      const reply = guard || 'Claro. Qual foco você quer para a otimização: mais leve, mais barato, mais premium ou menos deslocamento?';
      const source = guard ? 'state-guard' : 'intent-router';
      setChat(c => [...c, { who: 'gaid', text: reply, source }]);
      persistPlanMessage('assistant', reply, { source, intent: planIntent.intent });
      return;
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
    lastEditedDayRef.current = days[dayIdx]?.d || lastEditedDayRef.current;
    const currentDay = days[dayIdx];
    const currentItem = currentDay?.items?.[itemIdx];
    if (currentDay && currentItem) {
      lastModifiedActivityRef.current = storedActivityRefFromEntry({ day: currentDay, item: currentItem });
      const selected = resolveStoredActivityRef(days, selectedItem);
      if (selected?.dayIdx === dayIdx && selected?.itemIdx === itemIdx) setSelectedItem(null);
    }
    updateDays(ds => ds.map((d, i) => i === dayIdx ? { ...d, items: d.items.filter((_, j) => j !== itemIdx) } : d));
    toast({ title: 'Item removido', tone: 'success' });
  };
  const togglePin = (dayIdx, itemIdx) => {
    lastEditedDayRef.current = days[dayIdx]?.d || lastEditedDayRef.current;
    const currentDay = days[dayIdx];
    const currentItem = currentDay?.items?.[itemIdx];
    if (currentDay && currentItem) {
      lastModifiedActivityRef.current = storedActivityRefFromEntry({ day: currentDay, item: currentItem });
    }
    updateDays(ds => ds.map((d, i) => i === dayIdx
      ? { ...d, items: d.items.map((it, j) => j === itemIdx ? { ...it, conf: !it.conf } : it) }
      : d));
  };
  const updateItem = (dayIdx, itemIdx, patch) => {
    lastEditedDayRef.current = days[dayIdx]?.d || lastEditedDayRef.current;
    const currentDay = days[dayIdx];
    const currentItem = currentDay?.items?.[itemIdx];
    if (currentDay && currentItem) {
      lastModifiedActivityRef.current = storedActivityRefFromEntry({
        day: currentDay,
        item: { ...currentItem, ...patch },
      });
    }
    updateDays(ds => ds.map((d, i) => i === dayIdx
      ? { ...d, items: d.items.map((it, j) => j === itemIdx ? { ...it, ...patch } : it) }
      : d));
  };
  const addItem = (dayIdx, slot, payload) => {
    lastEditedDayRef.current = days[dayIdx]?.d || lastEditedDayRef.current;
    if (days[dayIdx]) {
      lastModifiedActivityRef.current = storedActivityRefFromEntry({
        day: days[dayIdx],
        item: { t: slot, ...payload, conf: false },
      });
    }
    updateDays(ds => ds.map((d, i) => i === dayIdx
      ? { ...d, items: [...d.items, { t: slot, ...payload, conf: false }] }
      : d));
    toast({ title: 'Adicionado ao roteiro', tone: 'success', desc: payload.title });
  };
  const selectItem = (dayIdx, itemIdx) => {
    const day = days[dayIdx];
    const item = day?.items?.[itemIdx];
    if (!day || !item) return;
    const nextRef = storedActivityRefFromEntry({ day, item });
    setSelectedItem({ ...nextRef, dayIdx, itemIdx });
    lastEditedDayRef.current = day.d;
    lastModifiedActivityRef.current = nextRef;
  };
  const selectedEntry = useMemo(
    () => resolveStoredActivityRef(days, selectedItem),
    [days, selectedItem]
  );

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,400px)_1fr] xl:grid-cols-[minmax(0,440px)_1fr] h-full lg:h-screen lg:sticky lg:top-0 min-h-0">
      {isMobile && (
        <div className="shrink-0 px-4 py-2 border-b hairline bg-paper flex gap-1">
          <button
            type="button"
            onClick={() => setMobilePane('chat')}
            className={`flex-1 h-9 rounded-xl text-[13px] font-medium transition-colors
              ${mobilePane === 'chat' ? 'bg-ink-900 text-paper' : 'bg-ink-100 text-ink-700'}`}>
            Concierge
          </button>
          <button
            type="button"
            onClick={() => setMobilePane('timeline')}
            className={`flex-1 h-9 rounded-xl text-[13px] font-medium transition-colors
              ${mobilePane === 'timeline' ? 'bg-ink-900 text-paper' : 'bg-ink-100 text-ink-700'}`}>
            Roteiro
          </button>
        </div>
      )}
      {/* ---- LEFT: chat ---- */}
      <section className={`border-r hairline flex flex-col bg-paper min-h-0 min-w-0
        ${isMobile && mobilePane !== 'chat' ? 'hidden' : 'flex'}
        ${isMobile ? 'flex-1' : ''}`}>
        <header className="px-4 lg:px-7 h-[56px] lg:h-[60px] shrink-0 border-b hairline bg-paper flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-white border-half flex items-center justify-center">
              <GaidLogo className="h-3 w-auto max-w-[18px]"/>
            </div>
            <span className="text-[15px] font-medium tracking-tight text-ink-900">Concierge AI</span>
          </div>
          <button className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500"><Icon.MoreH size={16}/></button>
        </header>

        <div ref={chatEndRef} className="flex-1 overflow-y-auto px-4 lg:px-7 py-4 lg:py-5 space-y-4">
          {chat.map((m, i) => <Bubble key={i} m={m} onCta={(t) => {
            if (t === 'Adicionar ao roteiro' || t === 'Aplicar ao roteiro') void applyItinerarySuggestions(i);
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
        <div className="px-4 lg:px-7 pb-2 flex items-center gap-2 flex-wrap">
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
        <div className="p-4 lg:p-5 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] lg:pb-5">
          <div className={`bg-white border-half shadow-card transition-shadow hover:shadow-lift focus-within:shadow-lift focus-within:border-brand-200 focus-within:ring-4 focus-within:ring-brand-50 ${
            selectedEntry
              ? 'rounded-[28px] min-h-[92px] px-3 py-3 flex flex-col items-stretch gap-2'
              : 'rounded-full h-[56px] pl-5 pr-[6px] flex items-center gap-2'
          }`}>
            {selectedEntry && (
              <div className="inline-flex self-start max-w-full items-center gap-2 rounded-full border border-ink-200 bg-ink-50 px-3 h-8 text-[12px] text-ink-800">
                <Icon.Edit size={12} className="text-ink-500 shrink-0"/>
                <span className="truncate">
                  {selectedEntry.item.title} · Dia {selectedEntry.day.d} / {selectedEntry.item.t || 'item'}
                </span>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="h-5 w-5 rounded-full hover:bg-ink-100 text-ink-500 flex items-center justify-center shrink-0"
                  title="Remover seleção">
                  <Icon.X size={12}/>
                </button>
              </div>
            )}
            <div className={selectedEntry ? 'flex items-center gap-2 w-full pl-2' : 'contents'}>
              <Icon.Sparkles size={15} className="text-ink-500 shrink-0"/>
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Pergunte qualquer coisa sobre sua viagem…"
                className={`${selectedEntry ? 'h-10' : 'h-full'} flex-1 outline-none text-[14px] placeholder:text-ink-400 bg-transparent leading-none min-w-0`}/>
              <button className="h-9 w-9 rounded-full hover:bg-ink-100 text-ink-600 flex items-center justify-center shrink-0" title="Anexar">
                <Icon.Plus size={15}/>
              </button>
              <button onClick={() => send()}
                className="h-11 px-5 rounded-full bg-ink-900 text-paper hover:bg-brand-700 focus-visible:ring-4 focus-visible:ring-brand-200 transition-colors flex items-center gap-2 text-[13.5px] font-medium shrink-0">
                <Icon.Send size={14}/>
                Enviar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ---- RIGHT: timeline ---- */}
      <section className={`overflow-y-auto bg-canvas min-h-0 min-w-0
        ${isMobile && mobilePane !== 'timeline' ? 'hidden' : 'block'}
        ${isMobile ? 'flex-1' : ''}`}>
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
          trip={tripData}
          selectedItem={selectedItem}
          onSelect={selectItem}
          onAdd={(dayIdx, slot) => setAdding({ dayIdx, slot })}
          onEdit={(dayIdx, itemIdx) => { selectItem(dayIdx, itemIdx); setEditing({ dayIdx, itemIdx }); }}
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
  const hasPendingAction = !!m.pendingAction;
  const showCta = ctas.length > 0 && hasPendingAction && !m.initialKickoff && !m.ctaApplied && m.status !== 'applied';
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
                  : 'text-ink-800 hover:border-brand-200 hover:bg-brand-50'
              }`}>
              {m.ctaApplied ? <Icon.Check size={12} className="text-sage-700"/> : <Icon.Sparkles size={12} className="text-brand-700"/>}{c}
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
    <div className="px-4 sm:px-6 lg:px-8 pt-5 lg:pt-7 pb-4 lg:pb-5 border-b hairline bg-paper">
      <div className="flex items-center gap-3 lg:gap-4">
        <SmartImg src={trip.coverImage?.url} seed={trip.coverSeed} tone={trip.cover} w={240} h={180} className="h-16 w-[88px] lg:h-[72px] lg:w-[100px] rounded-xl shrink-0"/>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 lg:gap-4">
            <div className="min-w-0 flex-1">
              <div className="label mb-1">{trip.status || 'Em planejamento'}</div>
              <h1 className="text-[18px] lg:text-[22px] tracking-tight font-serif font-medium text-ink-900 leading-tight truncate">{trip.title}</h1>
              <p className="text-[12px] lg:text-[13px] text-ink-600 mt-0.5 truncate">{subtitle}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <OptimizeMenu onApply={onApplyMode}/>
              <div className="hidden sm:block w-px h-5 bg-ink-200 mx-1"/>
              <button onClick={onCalendar} title="Agenda" className="h-8 w-8 rounded-lg hover:bg-ink-100 text-ink-700 flex items-center justify-center"><Icon.Calendar size={15}/></button>
              <button onClick={onExport} title="Exportar PDF" className="hidden sm:flex h-8 w-8 rounded-lg hover:bg-ink-100 text-ink-700 items-center justify-center"><Icon.Download size={15}/></button>
              <Button variant="secondary" size="sm" icon={Icon.Share} onClick={onShare} className="hidden md:inline-flex">Compartilhar</Button>
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
          <div className="h-full bg-brand-700 rounded-full transition-all duration-500"
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
        <div className="h-9 w-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0"><Icon.Sparkles size={16}/></div>
        <div className="flex-1 min-w-0">
          <div className="label">Concierge proativo</div>
          <div className="text-[16px] font-medium tracking-tight text-ink-900 mt-0.5">{trip.prepTitle}</div>
          <div className="text-[12.5px] text-ink-600 mt-1 leading-relaxed max-w-[640px]">{trip.prepIntro}</div>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
          <div className="h-full bg-brand-700 transition-all duration-300" style={{ width: `${pct}%` }}/>
        </div>
        <div className="text-[11.5px] text-ink-500 shrink-0"><span className="font-medium text-ink-900">{doneItems}</span>/{totalItems} resolvidos</div>
      </div>

      {/* Hint about chat */}
      <div className="mb-4 bg-ink-50 border-half rounded-lg px-3 py-2 flex items-center gap-2 text-[12px] text-ink-600">
        <Icon.Sparkles size={13} className="text-brand-700 shrink-0"/>
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
                          ${isActive ? 'bg-brand-50 text-brand-700 border-brand-200' : 'bg-white text-ink-700 hover:border-brand-200'}`}>
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
                              ${it.done ? 'bg-brand-700 text-paper' : 'border-half bg-white group-hover:border-brand-200'}`}>
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
const MONTHS_SHORT_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const COUNTRY_ONLY_NAMES = new Set([
  'portugal', 'franca', 'frança', 'espanha', 'italia', 'itália', 'japao', 'japão',
  'colombia', 'colômbia', 'peru', 'brasil', 'argentina', 'chile', 'estados unidos',
  'eua', 'usa', 'reino unido', 'inglaterra',
]);
function localDateFromIso(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}
function addCalendarDays(date, count) {
  const next = new Date(date);
  next.setDate(date.getDate() + count);
  return next;
}
function timelineDateMarker(day, trip) {
  const start = localDateFromIso(trip?.tripContext?.dates?.start);
  if (!start) return { number: String(day?.d || 1).padStart(2, '0'), label: TBD };
  const date = addCalendarDays(start, Math.max(Number(day?.d || 1) - 1, 0));
  return { number: String(date.getDate()).padStart(2, '0'), label: MONTHS_SHORT_PT[date.getMonth()] || TBD };
}
function dayLocationLabel(day, trip) {
  const raw = String(
    (day?.city && day.city !== TBD ? day.city : '') ||
    trip?.tripContext?.city ||
    trip?.tripContext?.destinationCity ||
    trip?.destination ||
    trip?.tripContext?.destination ||
    ''
  ).trim();
  if (!raw) return TBD;
  const first = raw.split(',')[0].trim();
  return COUNTRY_ONLY_NAMES.has(normText(first)) ? TBD : first || TBD;
}
const Timeline = ({ days, trip, selectedItem, onSelect, onAdd, onEdit, onTogglePin, onRemove }) => {
  const safeDays = normalizeDays(days);
  const selectedEntry = resolveStoredActivityRef(safeDays, selectedItem);
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
            {(() => {
              const marker = timelineDateMarker(day, trip);
              return (
                <>
                  <div className="text-[42px] tracking-tight font-serif font-medium text-ink-900 leading-none">{marker.number}</div>
                  <div className="text-[12px] text-ink-500 mt-1">{marker.label}</div>
                </>
              );
            })()}
            <div className="text-[12.5px] font-medium text-ink-800 mt-2 flex items-center gap-1.5">
              <Icon.MapPin size={12}/> {dayLocationLabel(day, trip)}
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
                    <div className="h-6 w-6 rounded-md bg-brand-50 text-brand-700 flex items-center justify-center"><Ic size={12}/></div>
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
                        className="w-full text-left bg-ink-50/60 border border-dashed border-ink-200 rounded-xl px-4 py-3 text-[12.5px] text-ink-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 transition-colors">
                        Bloco livre · clique para adicionar
                      </button>
                    ) : items.map((it, idx) => {
                      // we need the absolute item index
                      const itemIdx = day.items.indexOf(it);
                      return (
                        <ItemCard key={it.id || `${day.d}-${slot}-${idx}`} it={it}
                          selected={selectedEntry?.dayIdx === di && selectedEntry?.itemIdx === itemIdx}
                          onSelect={() => onSelect(di, itemIdx)}
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

const ItemCard = ({ it, selected = false, onSelect, onEdit, onTogglePin, onRemove }) => {
  const cfg = tagPalette[it.tag] || { tone:'ink', icon: Icon.MapPin };
  const Ic = cfg.icon;
  const stop = (handler) => (event) => {
    event.stopPropagation();
    handler && handler(event);
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect && onSelect();
        }
      }}
      className={`group bg-white border hairline rounded-xl p-4 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-50 transition-colors flex items-start gap-3 ${
        selected
          ? 'border-[var(--gaid-halo)] ring-2 ring-[rgba(139,111,232,0.14)] shadow-[0_10px_28px_rgba(139,111,232,0.12)]'
          : 'hover:border-brand-200 focus-within:border-brand-200'
      }`}>
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
        <button onClick={stop(onTogglePin)} className="h-7 w-7 rounded-md hover:bg-ink-100 text-ink-600 flex items-center justify-center" title="Alternar confirmação">
          <Icon.Check size={14}/>
        </button>
        <button onClick={stop(onEdit)} className="h-7 w-7 rounded-md hover:bg-ink-100 text-ink-600 flex items-center justify-center" title="Editar">
          <Icon.Edit size={14}/>
        </button>
        <button onClick={stop(onRemove)} className="h-7 w-7 rounded-md hover:bg-coral-50 text-coral-700 flex items-center justify-center" title="Remover">
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
                       ${tab === 'alts' ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-brand-50 hover:text-brand-700'}`}>
            <Icon.Sparkles size={12} className="inline -mt-0.5 mr-1"/> Alternativas curadas
          </button>
          <button onClick={()=>setTab('edit')}
            className={`h-8 px-3 rounded-lg text-[12.5px] font-medium transition-colors
                       ${tab === 'edit' ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-brand-50 hover:text-brand-700'}`}>
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
            <button className="w-full bg-white border-half rounded-xl px-4 py-3 flex items-center gap-3 hover:border-brand-200 transition-colors text-left">
              <div className="h-9 w-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center"><Icon.Wand size={15}/></div>
              <div className="flex-1">
                <div className="text-[13.5px] font-medium text-ink-900">Pedir algo personalizado</div>
                <div className="text-[12px] text-ink-500">Descreva no chat e a Gaid monta a alternativa</div>
              </div>
              <Icon.ArrowRight size={14} className="text-ink-500"/>
            </button>
            <button className="w-full bg-white border-half rounded-xl px-4 py-3 flex items-center gap-3 hover:border-brand-200 transition-colors text-left mt-2">
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
    className="w-full text-left bg-white border-half rounded-xl overflow-hidden hover:border-brand-200 transition-colors flex group">
    <SmartImg seed={alt.seed || alt.title} tone="warm" w={200} h={200} className="h-[112px] w-[112px] shrink-0"/>
    <div className="flex-1 p-3.5 min-w-0">
      <div className="text-[13.5px] font-medium text-ink-900 leading-tight">{alt.title}</div>
      <div className="text-[11.5px] text-ink-500 mt-1 flex items-center gap-2">
        <span>{alt.place}</span>
        {alt.dur && <><span className="text-ink-300">·</span><span>{alt.dur}</span></>}
      </div>
      <div className="text-[11.5px] text-ink-700 mt-1.5 italic">{alt.vibe}</div>
      <div className="text-[11.5px] text-ink-600 mt-2 leading-snug flex items-start gap-1.5">
        <Icon.Sparkles size={11} className="text-brand-700 mt-0.5 shrink-0"/>
        <span>{alt.why}</span>
      </div>
    </div>
    <div className="flex items-center pr-3">
      <div className="h-7 w-7 rounded-md bg-ink-100 group-hover:bg-brand-50 group-hover:text-brand-700 text-ink-700 flex items-center justify-center transition-colors">
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
              className="w-full text-left bg-white border hairline rounded-xl p-3 hover:border-brand-200 flex items-center gap-3 group">
              <Placeholder tone="warm" className="h-10 w-12 rounded-md shrink-0"/>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-ink-900">{s.title}</div>
                <div className="text-[12px] text-ink-500">{s.place} · {s.dur} · {s.vibe}</div>
              </div>
              <Icon.Plus size={16} className="text-ink-500 group-hover:text-brand-700"/>
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
          <Placeholder tone="warm" className="h-14 w-20 rounded-lg shrink-0"/>
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
        className={`h-6 w-10 rounded-full transition-colors relative ${on ? 'bg-brand-700' : 'bg-ink-200'}`}>
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
                        ${on ? 'bg-brand-700 border-brand-700 text-paper' : 'bg-white border-ink-300'}`}>
        {on && <Icon.Check size={10}/>}
      </span>
      <span>{label}</span>
    </button>
  );
};


export { PlanScreen };
