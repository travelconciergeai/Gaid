const MONTH_PATTERN = /\b(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|f[eé]rias|fim de ano|carnaval|ver[aã]o)\b/i;

const BLOCKED_DESTINATIONS = new Set([
  'ola', 'olá', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'teste', 'ok', 'sim', 'nao', 'não',
  'roteiro', 'viagem', 'gerar roteiro novo', 'criar viagem', 'quero montar um roteiro',
]);

const LOCAL_RECOMMENDATIONS = {
  paris: [
    { id: 'paris-1', name: 'Bistrô intimista em Saint-Germain', category: 'Restaurante', area: 'Saint-Germain', reason: 'Clima elegante, bom para casal e gastronomia sem virar programa engessado.', idealFor: 'Casal, gastronomia e noite confortável', caution: 'Reserve se for jantar no fim de semana.', tags: ['romântico', 'gastronomia', 'clássico'] },
    { id: 'paris-2', name: 'Mesa moderna perto do Marais', category: 'Restaurante', area: 'Le Marais', reason: 'Boa mistura de cozinha atual, bairro vivo e caminhada gostosa depois.', idealFor: 'Jantar moderno e pouco deslocamento', caution: 'Evite horários muito cheios.', tags: ['moderno', 'vida local', 'gastronomia'] },
    { id: 'paris-3', name: 'Café com pâtisserie na Rive Gauche', category: 'Café', area: 'Rive Gauche', reason: 'Ótimo para pausa entre museus, com experiência parisiense sem pressa.', idealFor: 'Café, doces e ritmo leve', caution: 'Pode ficar turístico no meio da manhã.', tags: ['café', 'leve', 'clássico'] },
  ],
  rio: [
    { id: 'rio-1', name: 'Fim de tarde na Urca', category: 'Experiência', area: 'Urca', reason: 'Entrega vista, clima carioca e logística simples para uma primeira noite.', idealFor: 'Casais, amigos e primeira vez no Rio', caution: 'Chegue antes do pôr do sol.', tags: ['vista', 'local', 'leve'] },
    { id: 'rio-2', name: 'Manhã no Jardim Botânico', category: 'Atração', area: 'Jardim Botânico', reason: 'Funciona bem para família e reduz o risco de um dia cansativo.', idealFor: 'Famílias, natureza e crianças', caution: 'Melhor em dia seco.', tags: ['natureza', 'crianças', 'leve'] },
    { id: 'rio-3', name: 'Almoço descontraído no Leblon', category: 'Restaurante', area: 'Leblon', reason: 'Boa comida, bairro agradável e fácil de encaixar em roteiro pela zona sul.', idealFor: 'Gastronomia sem formalidade', caution: 'Pode ter espera no domingo.', tags: ['gastronomia', 'zona sul', 'conforto'] },
  ],
  bogota: [
    { id: 'bogota-1', name: 'Café autoral em Chapinero', category: 'Café', area: 'Chapinero', reason: 'Boa entrada para café colombiano com vibe mais local.', idealFor: 'Café, gastronomia e pausa urbana', caution: 'Confira horário antes de sair.', tags: ['café', 'local', 'gastronomia'] },
    { id: 'bogota-2', name: 'Candelaria com Museu do Ouro', category: 'Atração', area: 'La Candelaria', reason: 'Dá contexto histórico e cultural sem depender de uma agenda externa.', idealFor: 'Cultura e primeira visita', caution: 'Vá de dia e planeje deslocamento.', tags: ['cultura', 'história', 'arte'] },
    { id: 'bogota-3', name: 'Monserrate em dia aberto', category: 'Experiência', area: 'Monserrate', reason: 'Vista marcante da cidade e programa forte sem ocupar o dia inteiro.', idealFor: 'Vista, fotografia e cultura', caution: 'Evite com clima fechado.', tags: ['vista', 'clássico', 'natureza'] },
  ],
  default: [
    { id: 'default-1', name: 'Experiência local de meio período', category: 'Experiência', area: 'Área central', reason: 'Boa opção para conhecer o destino sem deixar o dia pesado.', idealFor: 'Primeira visita e ritmo equilibrado', caution: 'Confirme horários antes de sair.', tags: ['local', 'leve'] },
    { id: 'default-2', name: 'Restaurante confortável no bairro certo', category: 'Restaurante', area: 'Bairro principal', reason: 'Ajuda a comer bem sem gastar energia com deslocamento.', idealFor: 'Gastronomia e conforto', caution: 'A Gaid ainda não consultou dados vivos.', tags: ['gastronomia', 'conforto'] },
    { id: 'default-3', name: 'Passeio cultural com pausa', category: 'Atração', area: 'Região histórica', reason: 'Dá contexto e ainda preserva espaço para descanso.', idealFor: 'Cultura e roteiro flexível', caution: 'Pode variar conforme clima.', tags: ['cultura', 'flexível'] },
  ],
};

function normalize(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function titleCase(value) {
  return String(value || '').trim().split(/\s+/).map(part =>
    part ? `${part.charAt(0).toLocaleUpperCase('pt-BR')}${part.slice(1).toLocaleLowerCase('pt-BR')}` : ''
  ).join(' ');
}

function cleanDestination(value) {
  const cleaned = String(value || '')
    .replace(MONTH_PATTERN, '')
    .replace(/\b(?:por|durante)\s+\d+\s*(?:dias|noites).*/i, '')
    .replace(/[,.!?;:].*$/, '')
    .trim();
  const norm = normalize(cleaned);
  if (!norm || BLOCKED_DESTINATIONS.has(norm) || /^(quero|gerar|criar|montar|planejar|roteiro|viagem)\b/.test(norm)) return '';
  return titleCase(cleaned);
}

function parsePeriod(value) {
  const match = String(value || '').match(MONTH_PATTERN)?.[1];
  return match ? titleCase(match) : '';
}

function parseDuration(value) {
  const text = normalize(value);
  if (/fim de semana/.test(text)) return { durationDays: 3, nights: 2 };
  const days = Number(text.match(/\b(\d+)\s*dias?\b/)?.[1] || text.match(/^(\d+)$/)?.[1]);
  if (Number.isFinite(days) && days > 0) return { durationDays: days, nights: Math.max(days - 1, 0) };
  const nights = Number(text.match(/\b(\d+)\s*noites?\b/)?.[1]);
  if (Number.isFinite(nights) && nights > 0) return { durationDays: nights + 1, nights };
  return {};
}

function parseTravelers(value) {
  const text = normalize(value);
  if (/sozinh|so eu|só eu|solo/.test(text)) return { travelers: { count: 1, composition: 'Solo' }, travelerComposition: 'Solo' };
  if (/casal|esposa|marido|a dois/.test(text)) return { travelers: { count: 2, composition: 'Casal' }, travelerComposition: 'Casal' };
  const adults = Number(text.match(/(\d+)\s*adult/)?.[1]) || 0;
  const children = Number(text.match(/(\d+)\s*(crianca|criança|filh)/)?.[1]) || 0;
  const count = Number(text.match(/^(\d+)$/)?.[1]) || null;
  if (adults || children || /famil/.test(text)) return { travelers: { count: adults + children || count, composition: 'Família' }, travelerComposition: 'Família' };
  if (/amig/.test(text)) return { travelers: { count, composition: 'Amigos' }, travelerComposition: 'Amigos' };
  if (count) return { travelers: { count, composition: 'A definir' }, travelerComposition: 'A definir' };
  return {};
}

function explicitDestination(value) {
  const raw = String(value || '').trim();
  const patterns = [
    /\broteiro\s+(?:para|pra|em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i,
    /\bviagem\s+(?:para|pra|em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i,
    /\b(?:quero|queria|gostaria|pretendo)\s+ir\s+(?:para|pra|em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i,
    /\b(?:vou|vamos)\s+viajar\s+(?:para|pra|em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i,
    /\bf[eé]rias\s+(?:em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i,
  ];
  return cleanDestination(patterns.map(pattern => raw.match(pattern)?.[1]).find(Boolean) || '');
}

function recommendationDestination(value) {
  const raw = String(value || '').trim();
  const patterns = [
    /\bonde\s+jantar\s+(?:em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i,
    /\bo que fazer\s+(?:em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i,
    /\bdicas?\s+(?:em|no|na|para|pra)\s+([\wÀ-ÿ' -]{2,80})/i,
    /\b(?:me indica|me indique)\s+(?:um|uma)?\s*(?:caf[ée]|restaurante|lugar)?\s*(?:em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i,
    /\b(?:caf[ée]|restaurante|hotel)\s+(?:em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i,
  ];
  return cleanDestination(patterns.map(pattern => raw.match(pattern)?.[1]).find(Boolean) || '');
}

function classifyIntent(value, state = {}) {
  const text = normalize(value);
  if (/^(ola|olá|oi|bom dia|boa tarde|boa noite|tudo bem)[!.?\s]*$/.test(text)) return 'GREETING';
  if (/\b(visto|passaporte|documentos?|seguro|vacina|autorizacao|autorização|o que levar)\b/.test(text)) return 'DOCUMENTATION';
  if (/\b(vai chover|chuva|temporal|calor|frio|perdi a manha|perdi a manhã|atrasamos|estou cansado|filho cansou|lugar fechado)\b/.test(text)) return 'REPLAN_TRIP';
  if (state.activeTrip && /\b(troca|troque|substitui|remove|tira|move|mover|adiciona|inclui|coloca)\b/.test(text)) return 'EDIT_TRIP';
  if (/\b(nao gostei|não gostei|outras|traga outras|mais barato|mais romantico|mais romântico|menos turistico|menos turístico|mais perto)\b/.test(text)) return 'REFINE_RECOMMENDATION';
  if (/\b(onde jantar|o que fazer|me indica|me indique|cafe|café|restaurante|dicas?|lugar para ir)\b/.test(text)) return 'GET_RECOMMENDATION';
  if (/\b(quero montar um roteiro|criar roteiro|gerar roteiro novo|planejar viagem|roteiro|viagem para|quero ir para|vou viajar para|criar viagem|ferias em|férias em)\b/.test(text)) return 'PLAN_TRIP';
  return 'GENERAL';
}

function profileContext(profile = {}) {
  return {
    defaultComposition: profile.travelerProfile?.defaultComposition || '',
    companions: profile.travelerProfile?.commonCompanions || [],
    interests: profile.preferences?.interests || [],
    pace: profile.preferences?.pace || '',
    budgetStyle: profile.preferences?.budgetStyle || '',
    priorityRanking: profile.preferences?.priorityRanking || [],
  };
}

function recKey(destination) {
  const text = normalize(destination);
  if (/paris/.test(text)) return 'paris';
  if (/rio/.test(text)) return 'rio';
  if (/bogota|bogotá/.test(text)) return 'bogota';
  return 'default';
}

function getRecommendationCards(destination, profile, variant = 0) {
  const pool = LOCAL_RECOMMENDATIONS[recKey(destination)] || LOCAL_RECOMMENDATIONS.default;
  const rotated = [...pool.slice(variant % pool.length), ...pool.slice(0, variant % pool.length)];
  const profileTags = profileContext(profile).interests.slice(0, 2);
  return rotated.map(item => ({
    ...item,
    source: 'Curadoria Gaid',
    confidence: 0.84,
    tags: Array.from(new Set([...(item.tags || []), ...profileTags])).slice(0, 4),
    cta: 'Ver detalhes',
  }));
}

function itineraryItem(destination, slot, interests = []) {
  const wantsFood = interests.some(item => /gastronomia|romântico/.test(normalize(item)));
  const wantsCulture = interests.some(item => /cultura|museu|experiencias locais|experiências locais/.test(normalize(item)));
  const wantsNature = interests.some(item => /natureza|praia|descanso|crian/.test(normalize(item)));
  if (slot === 'manhã') {
    return wantsCulture
      ? { title: `Passeio cultural em ${destination}`, place: 'Área histórica principal', duration: '2h30', tag: 'cultura', vibe: 'contexto e ritmo leve' }
      : { title: `Reconhecimento tranquilo em ${destination}`, place: 'Região central', duration: '2h', tag: 'primeiro contato', vibe: 'sem pressa' };
  }
  if (slot === 'tarde') {
    return wantsNature
      ? { title: `Programa leve ao ar livre em ${destination}`, place: 'Parque ou bairro agradável', duration: '2h', tag: 'respiro', vibe: 'confortável' }
      : { title: `Experiência local em ${destination}`, place: 'Bairro recomendado pela Gaid', duration: '3h', tag: 'vida local', vibe: 'descoberta' };
  }
  return wantsFood
    ? { title: `Jantar especial em ${destination}`, place: 'Restaurante de boa curadoria', duration: '2h', tag: 'gastronomia', vibe: 'memorável' }
    : { title: `Noite leve em ${destination}`, place: 'Área segura e agradável', duration: '1h30', tag: 'noite', vibe: 'tranquilo' };
}

function buildTimeline(context, profile = {}) {
  const duration = Math.max(1, Math.min(Number(context.durationDays || 3), 14));
  const interests = context.interests?.length ? context.interests : profileContext(profile).interests;
  return Array.from({ length: duration }, (_, index) => ({
    d: index + 1,
    city: context.destination,
    date: context.period || 'A definir',
    items: ['manhã', 'tarde', 'noite'].map(slot => ({ id: `${Date.now()}-${index}-${slot}`, slot, ...itineraryItem(context.destination, slot, interests), confirmed: false })),
  }));
}

function requiredWizardStep(context) {
  if (!context.destination) return 'destination';
  if (!context.durationDays) return 'duration';
  if (!context.travelers) return 'travelers';
  if (!context.interests?.length) return 'interests';
  return 'review';
}

function makeDestinationEvidence(destination, source, originalText) {
  return { destination, source, originalText, confidence: 0.94, confirmed: true };
}

function parsePlanContext(text) {
  const destination = explicitDestination(text);
  const period = parsePeriod(text);
  const duration = parseDuration(text);
  return {
    ...(destination ? { destination, destinationEvidence: makeDestinationEvidence(destination, 'explicit_pattern', text) } : {}),
    ...(period ? { period, dates: { label: period } } : {}),
    ...duration,
  };
}

function wizardAnswerPatch(step, answer) {
  if (step === 'destination') {
    const destination = cleanDestination(answer);
    if (!destination) return null;
    return { destination, destinationEvidence: makeDestinationEvidence(destination, 'wizard_answer', answer) };
  }
  if (step === 'duration') return parseDuration(answer);
  if (step === 'travelers') return parseTravelers(answer);
  if (step === 'interests') return { interests: String(answer || '').split(',').map(item => item.trim()).filter(Boolean) };
  return {};
}

function buildSummary(answers, context) {
  const rows = answers.length ? answers : [
    { question: 'Para onde você quer viajar?', answer: context.destination },
    { question: 'Quantos dias?', answer: `${context.durationDays} dias` },
  ];
  return rows.filter(row => row.question && row.answer).map(row => `p: ${row.question}\nr: ${row.answer}`).join('\n\n');
}

function editTimeline(timeline, text) {
  if (!timeline?.days?.length) return { timeline, message: 'Abra ou crie um roteiro antes de editar.' };
  const command = normalize(text);
  const next = { ...timeline, days: timeline.days.map(day => ({ ...day, items: [...day.items] })) };
  const firstDay = next.days[0];
  if (/\b(remove|tira|exclui|apaga)\b/.test(command)) {
    for (const day of next.days) {
      if (day.items.length) {
        day.items.shift();
        return { timeline: next, message: 'Pronto — removi o primeiro item encontrado no roteiro.' };
      }
    }
  }
  if (/\b(troca|troque|substitui)\b/.test(command)) {
    const targetDay = next.days.find(day => day.items.length) || firstDay;
    if (targetDay?.items?.length) {
      targetDay.items[0] = { ...targetDay.items[0], ...itineraryItem(next.destination, targetDay.items[0].slot, ['vida local']), title: `Alternativa mais alinhada em ${next.destination}` };
      return { timeline: next, message: 'Pronto — substituí esse item por uma alternativa mais alinhada ao pedido.' };
    }
  }
  const slot = /\bnoite\b/.test(command) ? 'noite' : /\btarde\b/.test(command) ? 'tarde' : 'manhã';
  firstDay.items.push({ id: `${Date.now()}-added`, slot, ...itineraryItem(next.destination, slot, ['gastronomia']), title: `Nova sugestão em ${next.destination}`, confirmed: false });
  return { timeline: next, message: `Pronto — adicionei uma nova sugestão ao Dia 1, ${slot}.` };
}

function replanPreview(timeline, text) {
  if (!timeline?.days?.length) return { type: 'short_message', body: 'Crie ou abra um roteiro para eu conseguir replanejar.' };
  const rainy = /chuva|chover|temporal/.test(normalize(text));
  return {
    type: 'replanning_preview',
    problem: rainy ? 'Possível chuva impactando atividades externas.' : 'O roteiro pode ficar pesado para o contexto informado.',
    changes: [
      { day: 1, from: 'Atividade externa ou longa', to: rainy ? 'Programa coberto com pausa gastronômica' : 'Programa mais leve com menos deslocamento' },
    ],
    impact: rainy ? 'Mantém o dia útil sem depender do clima.' : 'Reduz cansaço e deixa margem para descanso.',
  };
}

function documentationChecklist(text, state = {}) {
  const destination = state.activeTrip?.destination || recommendationDestination(text) || explicitDestination(text) || 'destino';
  return {
    type: 'checklist',
    title: `Checklist geral para ${destination}`,
    items: [
      'Documento de identificação ou passaporte válido.',
      'Regras de visto conforme nacionalidade e destino.',
      'Seguro viagem, especialmente em viagem internacional.',
      'Autorizações extras se houver criança viajando sem ambos os responsáveis.',
      'Confirmação em fonte oficial antes da compra final.',
    ],
    context: 'Orientação geral da Gaid. Regras podem mudar.',
  };
}

function decide(message, state = {}, profile = {}) {
  const intent = classifyIntent(message, state);
  if (intent === 'GREETING') return { surface: 'short_message', message: 'Oi! Posso montar um roteiro, recomendar lugares ou melhorar uma viagem existente.' };
  if (intent === 'PLAN_TRIP') {
    const context = { ...parsePlanContext(message) };
    const step = requiredWizardStep(context);
    if (step === 'review') return { surface: 'generate_itinerary', context, summary: buildSummary([], context) };
    return { surface: 'wizard', context, step };
  }
  if (intent === 'GET_RECOMMENDATION') {
    const destination = recommendationDestination(message) || state.activeTrip?.destination;
    if (!destination) return { surface: 'short_message', message: 'Claro — para qual cidade você quer essa dica?' };
    return { surface: 'recommendation_cards', destination, cards: getRecommendationCards(destination, profile, 0), refinementQuestion: 'Você prefere algo mais local, mais confortável ou mais especial?' };
  }
  if (intent === 'REFINE_RECOMMENDATION') {
    const destination = state.lastRecommendation?.destination || state.activeTrip?.destination;
    if (!destination) return { surface: 'short_message', message: 'Claro — você quer novas opções para qual cidade?' };
    const variant = (state.lastRecommendation?.variant || 0) + 1;
    return { surface: 'recommendation_cards', destination, cards: getRecommendationCards(destination, profile, variant), variant, refinementQuestion: 'Essas estão em outra linha. Quer algo mais local ou mais sofisticado?' };
  }
  if (intent === 'EDIT_TRIP') return { surface: 'timeline_action', edit: editTimeline(state.activeTrip, message) };
  if (intent === 'REPLAN_TRIP') return { surface: 'replanning_preview', preview: replanPreview(state.activeTrip, message) };
  if (intent === 'DOCUMENTATION') return { surface: 'checklist', checklist: documentationChecklist(message, state) };
  return { surface: 'short_message', message: 'Posso te ajudar com roteiro, recomendações, documentação ou ajustes numa viagem existente.' };
}

export {
  buildSummary,
  buildTimeline,
  cleanDestination,
  decide,
  getRecommendationCards,
  parseDuration,
  profileContext,
  requiredWizardStep,
  wizardAnswerPatch,
};
