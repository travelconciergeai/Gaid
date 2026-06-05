import { normText } from './intentRouter.js';

const SOURCE = 'gaid_knowledge_core';

const DESTINATION_ALIASES = {
  paris: 'paris',
  franca: 'paris',
  frança: 'paris',
  orlando: 'orlando',
  disney: 'orlando',
  rio: 'rio de janeiro',
  'rio de janeiro': 'rio de janeiro',
  bogota: 'bogotá',
  bogotá: 'bogotá',
  turquia: 'turquia',
  istambul: 'turquia',
  capadocia: 'turquia',
  capadócia: 'turquia',
  japao: 'japão',
  japão: 'japão',
  tokyo: 'japão',
  toquio: 'japão',
  tóquio: 'japão',
  lisboa: 'lisboa/porto',
  porto: 'lisboa/porto',
  portugal: 'lisboa/porto',
  peru: 'peru',
  lima: 'peru',
  cusco: 'peru',
  machu: 'peru',
};

const DESTINATION_KNOWLEDGE = {
  paris: {
    label: 'Paris',
    bestTripStyles: ['cultura', 'gastronomia', 'romântico', 'clássicos bem dosados', 'compras'],
    commonTravelerProfiles: ['casal', 'solo', 'família com crianças maiores', 'comfort-focused'],
    familySuitability: 'Boa para famílias, especialmente com crianças que aguentam caminhar; alternar museus curtos, parques e pausas.',
    coupleSuitability: 'Muito forte para casais: jantares, cafés, bairros caminháveis e hotéis boutique.',
    rainyDayAlternatives: ['Musée de l’Orangerie', 'Sainte-Chapelle', 'Galeries Lafayette', 'passagens cobertas', 'cafés em Saint-Germain'],
    foodStrengths: ['bistrôs', 'pâtisseries', 'cafés clássicos', 'mercados', 'alta gastronomia'],
    shoppingStrengths: ['Le Marais', 'Saint-Germain', 'Galeries Lafayette', 'lojas de design'],
    culturalStrengths: ['museus', 'arquitetura', 'bairros históricos', 'arte impressionista'],
    pacingAdvice: 'Evitar dias com muitos museus grandes. Agrupar por bairros e reservar pausas para cafés.',
    attentionNotes: ['Filas podem ser longas em atrações óbvias.', 'Metrô é eficiente, mas caminhadas somam rápido.', 'Restaurantes bons pedem reserva.'],
  },
  orlando: {
    label: 'Orlando',
    bestTripStyles: ['parques', 'família', 'compras', 'resort', 'ritmo planejado'],
    commonTravelerProfiles: ['família', 'crianças', 'casal fã de parques', 'grupo de amigos'],
    familySuitability: 'Excelente para famílias, mas exige alternância entre dias intensos e descanso.',
    coupleSuitability: 'Funciona para casais que gostam de parques, compras ou resorts; menos romântico por padrão.',
    rainyDayAlternatives: ['Disney Springs', 'shopping', 'experiências indoor', 'restaurantes temáticos', 'Kennedy Space Center em dia viável'],
    foodStrengths: ['Disney Springs', 'Winter Park', 'restaurantes temáticos', 'jantares familiares'],
    shoppingStrengths: ['outlets', 'shoppings', 'Disney Springs', 'lojas temáticas'],
    culturalStrengths: ['experiências imersivas', 'Kennedy Space Center', 'Winter Park'],
    pacingAdvice: 'Intercalar parque, descanso e compras. Crianças pequenas precisam de pausas e dias menos ambiciosos.',
    attentionNotes: ['Calor e filas drenam energia.', 'Deslocamentos dependem muito de carro.', 'Planejar ingressos e reservas evita desperdício.'],
  },
  'rio de janeiro': {
    label: 'Rio de Janeiro',
    bestTripStyles: ['praia', 'cultura leve', 'gastronomia brasileira', 'natureza', 'vida urbana'],
    commonTravelerProfiles: ['casal', 'solo', 'família', 'amigos'],
    familySuitability: 'Boa para famílias quando a base é bem escolhida e os passeios têm logística simples.',
    coupleSuitability: 'Forte para casais: vistas, praia, restaurantes e bairros com atmosfera.',
    rainyDayAlternatives: ['Museu do Amanhã', 'Centro Cultural Banco do Brasil', 'Confeitaria Colombo', 'Forte de Copacabana com tempo aberto parcial'],
    foodStrengths: ['cozinha brasileira', 'bares de bairro', 'brunch', 'frutos do mar', 'alta gastronomia carioca'],
    shoppingStrengths: ['Ipanema', 'Leblon', 'lojas autorais', 'feiras locais'],
    culturalStrengths: ['música', 'arquitetura histórica', 'museus', 'bairros como Santa Teresa'],
    pacingAdvice: 'Planejar por zonas da cidade para reduzir deslocamento. Alternar praia, mirantes e refeições boas.',
    attentionNotes: ['Trânsito muda muito o tempo real.', 'Segurança e escolha de bairro importam.', 'Passeios ao ar livre dependem do clima.'],
  },
  'bogotá': {
    label: 'Bogotá',
    bestTripStyles: ['cultura', 'gastronomia', 'cafés', 'história', 'bate-voltas'],
    commonTravelerProfiles: ['casal', 'solo', 'amigos', 'comfort-focused'],
    familySuitability: 'Boa com crianças maiores; altitude e deslocamentos pedem ritmo mais leve.',
    coupleSuitability: 'Boa para casais que gostam de gastronomia, cafés e cultura urbana.',
    rainyDayAlternatives: ['Museo del Oro', 'Museo Botero', 'cafés em Chapinero', 'restaurantes na Zona G'],
    foodStrengths: ['cafés especiais', 'cozinha colombiana contemporânea', 'Zona G', 'Chapinero'],
    shoppingStrengths: ['design local', 'artesanato curado', 'Zona T'],
    culturalStrengths: ['La Candelaria', 'Museo del Oro', 'Botero', 'Monserrate'],
    pacingAdvice: 'Começar leve por causa da altitude. Agrupar centro histórico em um dia e Chapinero/Zona G em outro.',
    attentionNotes: ['Altitude pode cansar.', 'Chuva é comum.', 'Monserrate depende de clima e visibilidade.'],
  },
  turquia: {
    label: 'Turquia',
    bestTripStyles: ['cultura', 'história', 'gastronomia', 'experiências locais', 'multi-região'],
    commonTravelerProfiles: ['casal', 'família com crianças maiores', 'solo', 'comfort-focused'],
    familySuitability: 'Boa, mas deslocamentos entre regiões devem ser dosados para não cansar.',
    coupleSuitability: 'Muito forte para casais: Istambul, Capadócia, hotéis especiais e experiências gastronômicas.',
    rainyDayAlternatives: ['Grand Bazaar', 'Hagia Sophia', 'palácios', 'banhos turcos', 'aulas de culinária'],
    foodStrengths: ['mezzes', 'kebabs', 'cafés turcos', 'baklava', 'mercados'],
    shoppingStrengths: ['Grand Bazaar', 'Spice Bazaar', 'tapetes', 'cerâmica', 'design local'],
    culturalStrengths: ['Istambul histórica', 'Capadócia', 'mesquitas', 'palácios', 'arqueologia'],
    pacingAdvice: 'Separar Istambul e Capadócia com respiro. Não empilhar muitos deslocamentos em poucos dias.',
    attentionNotes: ['Balão na Capadócia depende do clima.', 'Bazaars exigem tempo e negociação.', 'Roteiros multi-região precisam de logística clara.'],
  },
  'japão': {
    label: 'Japão',
    bestTripStyles: ['cultura', 'gastronomia', 'tecnologia', 'tradição', 'natureza urbana'],
    commonTravelerProfiles: ['casal', 'solo', 'família', 'amigos', 'comfort-focused'],
    familySuitability: 'Boa, organizada e segura; requer ritmo realista e atenção a deslocamentos.',
    coupleSuitability: 'Muito boa para casais que gostam de gastronomia, design, cultura e hotéis especiais.',
    rainyDayAlternatives: ['museus', 'lojas de departamento', 'cafés temáticos', 'mercados cobertos', 'onsen quando aplicável'],
    foodStrengths: ['sushi', 'ramen', 'izakayas', 'mercados', 'kaiseki', 'cafés'],
    shoppingStrengths: ['Ginza', 'Shibuya', 'lojas de design', 'eletrônicos', 'papelaria'],
    culturalStrengths: ['templos', 'jardins', 'bairros históricos', 'cerimônias', 'museus'],
    pacingAdvice: 'Para primeira viagem, equilibrar Tóquio, Kyoto e uma extensão. Evitar trocar de base todo dia.',
    attentionNotes: ['Reservas e horários importam.', 'Deslocamentos são eficientes, mas exigem planejamento.', 'Templos em excesso podem cansar.'],
  },
  'lisboa/porto': {
    label: 'Lisboa/Porto',
    bestTripStyles: ['cultura', 'gastronomia', 'vinhos', 'ritmo confortável', 'city break'],
    commonTravelerProfiles: ['casal', 'solo', 'família', 'idosos', 'budget-conscious'],
    familySuitability: 'Boa para famílias, mas ladeiras e carrinhos exigem atenção.',
    coupleSuitability: 'Muito forte para casais: hotéis charmosos, vinhos, miradouros e restaurantes.',
    rainyDayAlternatives: ['Museu Nacional do Azulejo', 'MAAT', 'livrarias', 'caves em Gaia', 'mercados'],
    foodStrengths: ['frutos do mar', 'pastel de nata', 'vinhos', 'tabernas', 'cozinha autoral portuguesa'],
    shoppingStrengths: ['cerâmicas', 'design português', 'livrarias', 'mercados'],
    culturalStrengths: ['azulejos', 'arquitetura', 'fado', 'caves do Porto', 'centros históricos'],
    pacingAdvice: 'Alternar caminhadas com pausas. Lisboa e Porto funcionam melhor com bairros agrupados.',
    attentionNotes: ['Ladeiras cansam.', 'Elétricos lotam.', 'Reservas ajudam nos restaurantes mais desejados.'],
  },
  peru: {
    label: 'Peru',
    bestTripStyles: ['cultura', 'gastronomia', 'natureza', 'história', 'aventura leve'],
    commonTravelerProfiles: ['casal', 'solo', 'família com crianças maiores', 'amigos'],
    familySuitability: 'Boa com crianças maiores; altitude e deslocamentos exigem adaptação.',
    coupleSuitability: 'Boa para casais que gostam de experiências culturais, gastronomia e paisagem.',
    rainyDayAlternatives: ['museus em Lima', 'aulas de culinária', 'mercados cobertos', 'experiências gastronômicas'],
    foodStrengths: ['ceviche', 'cozinha andina', 'alta gastronomia em Lima', 'mercados', 'pisco'],
    shoppingStrengths: ['artesanato', 'têxteis', 'mercados locais'],
    culturalStrengths: ['Machu Picchu', 'Vale Sagrado', 'Cusco', 'Lima histórica'],
    pacingAdvice: 'Respeitar aclimatação. Evitar Machu Picchu logo após chegar em altitude.',
    attentionNotes: ['Altitude pode impactar muito.', 'Temporada de chuvas altera passeios.', 'Trem e ingressos precisam de antecedência.'],
  },
};

const TRAVELER_RULES = {
  solo: {
    priorities: ['segurança', 'base bem localizada', 'flexibilidade', 'experiências sociais quando fizer sentido'],
    pacing: 'Permitir tempo livre e evitar depender de reservas rígidas todos os dias.',
    avoid: ['roteiros com deslocamentos noturnos desnecessários', 'atividades muito isoladas sem contexto'],
  },
  casal: {
    priorities: ['bons jantares', 'momentos de respiro', 'bairros caminháveis', 'experiências memoráveis'],
    pacing: 'Misturar clássicos com pausas, cafés, vistas e noites bem escolhidas.',
    avoid: ['dias excessivamente cheios', 'trocas constantes de base'],
  },
  família: {
    priorities: ['logística simples', 'pausas', 'opções indoor', 'alimentação previsível', 'ritmo realista'],
    pacing: 'Alternar atividades principais com descanso e manter deslocamentos curtos.',
    avoid: ['muitos museus longos no mesmo dia', 'programas sem pausa para crianças'],
  },
  crianças: {
    priorities: ['duração curta por atividade', 'banheiro/alimentação perto', 'programas interativos', 'pausas'],
    pacing: 'Planejar blocos menores e deixar margem para cansaço.',
    avoid: ['filas longas sem plano B', 'jantares tarde demais'],
  },
  idosos: {
    priorities: ['conforto', 'acessibilidade', 'menos deslocamento', 'pausas', 'hotel bem localizado'],
    pacing: 'Preferir bases centrais, transfers simples e poucas atividades por dia.',
    avoid: ['roteiros com muitas ladeiras', 'trocas frequentes de hotel'],
  },
  pets: {
    priorities: ['regras pet-friendly', 'transporte adequado', 'áreas abertas', 'documentação futura'],
    pacing: 'Validar restrições antes de recomendar experiências.',
    avoid: ['assumir que hotéis/restaurantes aceitam pets sem confirmação'],
  },
  'budget-conscious': {
    priorities: ['custo-benefício', 'transporte eficiente', 'atrações gratuitas', 'refeições boas sem luxo'],
    pacing: 'Concentrar atividades por região e evitar deslocamentos caros.',
    avoid: ['sugerir experiências premium como padrão'],
  },
  'comfort-focused': {
    priorities: ['hotel/base confortável', 'reservas', 'transfers simples', 'experiências curadas'],
    pacing: 'Menos quantidade, mais qualidade e margem entre compromissos.',
    avoid: ['dias corridos demais', 'logística improvisada'],
  },
};

const REPLANNING_RULES = {
  rain: {
    action: 'Trocar atividades abertas por opções cobertas próximas, mantendo o mesmo bairro quando possível.',
    priorities: ['museus', 'mercados cobertos', 'cafés', 'compras', 'experiências indoor'],
  },
  tired_traveler: {
    action: 'Reduzir deslocamentos e manter apenas uma atividade principal no próximo bloco.',
    priorities: ['pausa', 'refeição confortável', 'programa leve perto da base'],
  },
  lost_morning: {
    action: 'Condensar o dia preservando a atividade mais valiosa e empurrando o restante para tarde/noite.',
    priorities: ['atividade âncora', 'almoço simples', 'fim de tarde estratégico'],
  },
  child_tired: {
    action: 'Priorizar pausa, alimentação e atividade curta/interativa depois.',
    priorities: ['descanso', 'programa indoor', 'praça/parque leve', 'jantar cedo'],
  },
  more_gastronomy: {
    action: 'Substituir atividades genéricas por refeições, mercados, cafés e experiências culinárias.',
    priorities: ['restaurantes', 'cafés', 'mercados', 'aulas ou degustações'],
  },
  reduce_displacement: {
    action: 'Agrupar o roteiro por zona/bairro e evitar cruzar a cidade mais de uma vez no dia.',
    priorities: ['proximidade', 'sequência por bairro', 'transporte simples'],
  },
};

function meta(confidence, reasoningHint) {
  return { source: SOURCE, confidence, reasoningHint };
}

function destinationKey(destination) {
  const text = normText(destination);
  if (!text) return '';
  const exact = DESTINATION_ALIASES[text];
  if (exact) return exact;
  return Object.entries(DESTINATION_ALIASES).find(([alias]) => text.includes(alias))?.[1] || '';
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function contextText(context = {}) {
  return normText([
    context.destination,
    context.tripStyle,
    context.stylePace,
    context.travelerComposition,
    context.profile,
    context.weather,
    ...(Array.isArray(context.priorities) ? context.priorities : []),
    ...(Array.isArray(context.interests) ? context.interests : []),
  ].join(' '));
}

export function getDestinationKnowledge(destination) {
  const key = destinationKey(destination);
  const knowledge = key ? DESTINATION_KNOWLEDGE[key] : null;
  if (!knowledge) {
    return {
      destination: destination || '',
      knowledge: null,
      ...meta(0.25, 'Destino fora do catálogo v1; usar regras gerais e pedir mais contexto.'),
    };
  }
  return {
    destination: knowledge.label,
    knowledge,
    ...meta(0.86, `Conhecimento curado v1 encontrado para ${knowledge.label}.`),
  };
}

export function getTravelerRules(profile) {
  const text = normText(profile);
  const key = Object.keys(TRAVELER_RULES).find(rule => text.includes(normText(rule))) ||
    (/(famil|crianc|filh)/.test(text) ? 'família' : '') ||
    (/casal|esposa|marido|romant/.test(text) ? 'casal' : '') ||
    (/solo|sozinh|so eu/.test(text) ? 'solo' : '') ||
    (/idos/.test(text) ? 'idosos' : '') ||
    (/budget|econom|barat/.test(text) ? 'budget-conscious' : '') ||
    (/confort|premium|luxo/.test(text) ? 'comfort-focused' : '');
  const rules = key ? TRAVELER_RULES[key] : null;
  return {
    profile: key || profile || '',
    rules,
    ...meta(rules ? 0.82 : 0.35, rules ? `Regras de perfil aplicadas para ${key}.` : 'Perfil não reconhecido; usar recomendações neutras.'),
  };
}

export function getReplanningRules(context = {}) {
  const text = contextText(context);
  const matches = [];
  if (/chuva|chov|rain/.test(text)) matches.push('rain');
  if (/cansad|exaust|leve|pausa/.test(text)) matches.push('tired_traveler');
  if (/perdi.*manha|perdeu.*manha|atras/.test(text)) matches.push('lost_morning');
  if (/crianc.*cans|filh.*cans/.test(text)) matches.push('child_tired');
  if (/gastronom|restaurante|comer|jantar|almoco|almoço/.test(text)) matches.push('more_gastronomy');
  if (/menos desloc|reduz.*desloc|perto|proximo|próximo/.test(text)) matches.push('reduce_displacement');

  const rules = unique(matches).map(key => ({ key, ...REPLANNING_RULES[key] }));
  return {
    rules,
    ...meta(rules.length ? 0.78 : 0.32, rules.length ? 'Regras de replanning selecionadas pelo contexto.' : 'Nenhuma condição específica de replanning detectada.'),
  };
}

function scoreCandidate(candidate, context = {}) {
  const text = normText([
    candidate.name,
    candidate.title,
    candidate.category,
    candidate.tag,
    candidate.reason,
    candidate.vibe,
    candidate.area,
  ].join(' '));
  const ctx = contextText(context);
  let score = 0;
  const reasons = [];

  unique([...(context.priorities || []), ...(context.interests || [])]).forEach(priority => {
    if (text.includes(normText(priority))) {
      score += 3;
      reasons.push(`combina com ${priority}`);
    }
  });
  if (/famil|crianc|filh/.test(ctx) && /famil|crianc|parque|interativo|leve/.test(text)) {
    score += 3;
    reasons.push('adequado para família/crianças');
  }
  if (/casal|romant/.test(ctx) && /romant|jantar|vista|charme|cafe|café/.test(text)) {
    score += 2;
    reasons.push('bom para casal');
  }
  if (/chuva|rain/.test(ctx) && /museu|indoor|coberto|shopping|cafe|café|mercado/.test(text)) {
    score += 3;
    reasons.push('funciona melhor com chuva');
  }
  if (/confort|premium|luxo/.test(ctx) && /premium|hotel|reserva|confort|autor/.test(text)) {
    score += 2;
    reasons.push('alinha com conforto');
  }
  if (/econom|budget|barat/.test(ctx) && /gratuito|mercado|bairro|custo|acess/.test(text)) {
    score += 2;
    reasons.push('bom custo-benefício');
  }

  return {
    ...candidate,
    knowledgeScore: score,
    knowledgeReasons: reasons,
    ...meta(Math.min(0.9, 0.45 + score * 0.08), reasons[0] || 'Pontuação neutra pelo Knowledge Core.'),
  };
}

export function rankRecommendationCandidates(candidates = [], context = {}) {
  return [...candidates]
    .map(candidate => scoreCandidate(candidate, context))
    .sort((a, b) => (b.knowledgeScore || 0) - (a.knowledgeScore || 0));
}

export function buildKnowledgeHints(context = {}) {
  const destination = getDestinationKnowledge(context.destination);
  const profile = getTravelerRules(context.travelerComposition || context.profile || context.travelers?.composition);
  const replanning = getReplanningRules(context);
  const knowledge = destination.knowledge;

  const hints = [
    knowledge?.pacingAdvice,
    knowledge?.attentionNotes?.length ? `Atenções: ${knowledge.attentionNotes.join(' ')}` : '',
    profile.rules?.pacing,
    replanning.rules?.map(rule => rule.action).join(' '),
  ].filter(Boolean);

  return {
    destination,
    traveler: profile,
    replanning,
    hints,
    ...meta(
      Math.max(destination.confidence || 0, profile.confidence || 0, replanning.confidence || 0),
      hints.length ? 'Hints consolidados para orientar resposta ou geração.' : 'Poucos hints disponíveis; coletar mais contexto.'
    ),
  };
}

