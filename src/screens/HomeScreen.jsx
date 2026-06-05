import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '../components/icons.jsx';
import { Placeholder, Button, Tag, Card, Modal, Drawer, SmartImg, Portrait, useToast, Topbar, SectionHeader, Stat, TabRow, OptimizeMenu, AddToTripDrawer, GaidLogo, ConciergeLoading } from '../components/ui.jsx';
import { EmptyState, EmptyInline } from './EmptyStates.jsx';
import { Async, CardSkeleton, CatalogCarousel, Carousel, Skeleton, ErrorState, CarouselSkeleton } from '../core/states.jsx';
import { useAccount, useCatalog } from '../core/store.jsx';
import { TBD, has, orTBD, fmtDuration, fmtMoney } from '../core/contracts.jsx';
import {
  normText,
  PLANNER_IDLE,
  PLANNER_COLLECTING,
  PLANNER_GENERATING,
  PLANNER_COMPLETE,
  getKnowledgeForRequest,
  logKnowledgeDecision,
  logToolExecution,
  rankRecommendationCandidates,
  buildGaidContext,
} from '../core/brain/index.js';
// Home — conversational landing.
// Two modes:
//   • 'idle': hero with centered chatbar + starters carousel + cards below
//   • 'chat': full chat layout (sidebar still visible) — user/agent messages flow
//             top-to-bottom, chatbar pinned to the BOTTOM and always visible.
//             The Disney wizard renders inline inside agent messages (list of
//             single-click options + "outra opção" free-text field).

// LEGACY_UNUSED_DO_NOT_CALL: old adaptive wizard definitions kept temporarily for
// visual compatibility while the active Home flow uses the simple wizard below.
const BASE_TRIP_WIZARD = [
  {
    id: 'destination',
    q: 'Para onde você quer viajar?',
    sub: 'Pode ser um destino exato, uma região ou uma ideia ainda aberta.',
    options: [
      { id: 'paris', label: 'Paris', hint: 'clássico, gastronomia e cultura' },
      { id: 'orlando', label: 'Orlando', hint: 'parques, família e descanso bem dosado' },
      { id: 'lisboa', label: 'Lisboa e Porto', hint: 'Portugal com ritmo gostoso' },
      { id: 'japao', label: 'Japão', hint: 'Tóquio, Kyoto e experiências locais' },
      { id: 'praia', label: 'Praia', hint: 'quero sol, mar e descanso' },
    ],
  },
  {
    id: 'period',
    q: 'Quando você imagina viajar?',
    sub: 'Se ainda não tiver data, um mês ou estação já ajuda.',
    options: [
      { id: 'julho', label: 'Julho', hint: 'férias escolares' },
      { id: 'dezembro', label: 'Dezembro', hint: 'fim de ano' },
      { id: 'flexivel', label: 'Datas flexíveis', hint: 'a Gaid pode sugerir melhor janela', recommended: true },
      { id: 'nao-sei', label: 'Ainda não sei', hint: 'vamos deixar em aberto' },
    ],
  },
  {
    id: 'duration',
    q: 'Quantas noites você quer ficar?',
    sub: 'Uso isso para abrir os dias do roteiro sem inventar atividades.',
    options: [
      { id: '3', label: '3 noites', hint: 'escapada curta' },
      { id: '5', label: '5 noites', hint: 'ritmo enxuto' },
      { id: '7', label: '7 noites', hint: 'uma semana completa', recommended: true },
      { id: '10', label: '10+ noites', hint: 'viagem mais profunda' },
    ],
  },
  {
    id: 'travelers',
    q: 'Quem vai viajar?',
    sub: 'Isso muda ritmo, hotel, deslocamentos e experiências.',
    options: [
      { id: 'solo', label: 'Só eu', hint: 'liberdade total' },
      { id: 'couple', label: 'Casal', hint: 'ritmo mais íntimo' },
      { id: 'family', label: 'Família', hint: 'com crianças ou parentes', recommended: true },
      { id: 'friends', label: 'Amigos', hint: 'grupo e energia social' },
    ],
  },
];

const DISCOVERY_PLACES = [
  { city: 'Rio de Janeiro', aliases: ['rio', 'rio de janeiro'], neighborhoods: ['Ipanema', 'Leblon', 'Copacabana', 'Botafogo', 'Santa Teresa', 'Centro', 'Lapa'] },
  { city: 'São Paulo', aliases: ['sao paulo', 'são paulo', 'sp'], neighborhoods: ['Jardins', 'Pinheiros', 'Vila Madalena', 'Itaim Bibi', 'Liberdade', 'Centro'] },
  { city: 'Paris', aliases: ['paris'], neighborhoods: ['Marais', 'Saint-Germain', 'Montmartre', 'Latin Quarter'] },
  { city: 'Orlando', aliases: ['orlando'], neighborhoods: ['Lake Buena Vista', 'Winter Park', 'International Drive'] },
  { city: 'Lisboa', aliases: ['lisboa'], neighborhoods: ['Chiado', 'Príncipe Real', 'Alfama', 'Baixa'] },
  { city: 'Porto', aliases: ['porto'], neighborhoods: ['Ribeira', 'Cedofeita', 'Foz'] },
  { city: 'Bogotá', aliases: ['bogota', 'bogotá'], neighborhoods: ['La Candelaria', 'Chapinero', 'Usaquén', 'Zona T'] },
  { city: 'Tóquio', aliases: ['tokyo', 'toquio', 'tóquio'], neighborhoods: ['Shibuya', 'Ginza', 'Asakusa', 'Shinjuku'] },
  { city: 'Bahia', aliases: ['bahia', 'salvador'], neighborhoods: ['Pelourinho', 'Rio Vermelho', 'Barra', 'Itapuã'] },
];

const DISCOVERY_CATALOG = {
  'Rio de Janeiro': {
    restaurant: [
      { name: 'Zazá Bistrô Tropical', area: 'Ipanema', reason: 'Boa pedida para jantar com clima brasileiro, leve e especial.', rating: 'Curadoria Gaid' },
      { name: 'Oro', area: 'Leblon', reason: 'Para uma noite mais autoral e gastronômica, sem cara de escolha genérica.', rating: 'Referência local' },
      { name: 'Aprazível', area: 'Santa Teresa', reason: 'Vista bonita, comida brasileira e um clima ótimo para casal ou família.', rating: 'Curadoria Gaid' },
    ],
    cafe: [
      { name: 'Confeitaria Colombo', area: 'Centro', reason: 'Clássico histórico para café com arquitetura marcante.', rating: 'Clássico local' },
      { name: 'Empório Jardim', area: 'Ipanema', reason: 'Funciona bem para café da manhã sem pressa ou brunch.', rating: 'Curadoria Gaid' },
      { name: 'Café 18 do Forte', area: 'Copacabana', reason: 'Café com vista e programa fácil de encaixar no dia.', rating: 'Curadoria Gaid' },
    ],
    attraction: [
      { name: 'Forte de Copacabana', area: 'Copacabana', reason: 'Passeio leve, bonito e fácil mesmo quando o dia está meio incerto.', rating: 'Curadoria Gaid' },
      { name: 'Jardim Botânico', area: 'Jardim Botânico', reason: 'Ótimo para desacelerar, com crianças ou em casal.', rating: 'Curadoria Gaid' },
      { name: 'Museu do Amanhã', area: 'Centro', reason: 'Boa alternativa para chuva, com estrutura e conteúdo acessível.', rating: 'Curadoria Gaid' },
    ],
    hotel: [
      { name: 'Janeiro Hotel', area: 'Leblon', reason: 'Base premium, discreta e muito bem localizada.', rating: 'Curadoria Gaid' },
      { name: 'Santa Teresa Hotel RJ', area: 'Santa Teresa', reason: 'Mais charmoso e romântico, com outra leitura da cidade.', rating: 'Curadoria Gaid' },
      { name: 'Emiliano Rio', area: 'Copacabana', reason: 'Conforto alto e vista icônica, para viagem mais especial.', rating: 'Curadoria Gaid' },
    ],
  },
  Paris: {
    restaurant: [
      { name: 'Frenchie Bar à Vins', area: 'Sentier', reason: 'Gastronomia parisiense atual, boa para casal ou amigos.', rating: 'Curadoria Gaid' },
      { name: 'Le Comptoir du Relais', area: 'Saint-Germain', reason: 'Clássico confortável para jantar com cara de Paris.', rating: 'Curadoria Gaid' },
      { name: 'Bouillon République', area: 'République', reason: 'Opção animada e mais acessível para comida francesa.', rating: 'Curadoria Gaid' },
    ],
    cafe: [
      { name: 'Café de Flore', area: 'Saint-Germain', reason: 'Clássico para quem quer o ritual parisiense.', rating: 'Clássico local' },
      { name: 'Boot Café', area: 'Marais', reason: 'Pequeno, charmoso e ótimo para uma pausa no Marais.', rating: 'Curadoria Gaid' },
      { name: 'Coutume Café', area: '7º arrondissement', reason: 'Café mais contemporâneo, bom para começar o dia.', rating: 'Curadoria Gaid' },
    ],
    attraction: [
      { name: 'Musée de l’Orangerie', area: 'Tuileries', reason: 'Mais compacto que o Louvre e excelente para arte sem exaustão.', rating: 'Curadoria Gaid' },
      { name: 'Le Marais', area: 'Marais', reason: 'Bairro ótimo para caminhar, comer e descobrir lojas pequenas.', rating: 'Curadoria Gaid' },
      { name: 'Sainte-Chapelle', area: 'Île de la Cité', reason: 'Impactante, relativamente curta e perfeita para encaixar no centro.', rating: 'Curadoria Gaid' },
    ],
    hotel: [
      { name: 'Le Pigalle', area: 'Pigalle', reason: 'Boutique, jovem e com personalidade.', rating: 'Curadoria Gaid' },
      { name: 'Hôtel des Grands Boulevards', area: 'Grands Boulevards', reason: 'Boa base para explorar com conforto e estilo.', rating: 'Curadoria Gaid' },
      { name: 'Relais Christine', area: 'Saint-Germain', reason: 'Mais romântico e discreto para casal.', rating: 'Curadoria Gaid' },
    ],
  },
  Orlando: {
    restaurant: [
      { name: 'The Boathouse', area: 'Disney Springs', reason: 'Funciona bem para família, com ambiente gostoso e fácil acesso.', rating: 'Curadoria Gaid' },
      { name: 'Wine Bar George', area: 'Disney Springs', reason: 'Mais adulto, bom para um jantar sem cara de parque.', rating: 'Curadoria Gaid' },
      { name: 'Prato', area: 'Winter Park', reason: 'Alternativa fora do circuito de parques, com clima local.', rating: 'Curadoria Gaid' },
    ],
    cafe: [
      { name: 'Foxtail Coffee', area: 'Winter Park', reason: 'Café local bom para uma pausa fora dos parques.', rating: 'Curadoria Gaid' },
      { name: 'Lineage Coffee', area: 'Orlando', reason: 'Boa opção para café especial e ritmo mais tranquilo.', rating: 'Curadoria Gaid' },
      { name: 'Le Cafe de Paris', area: 'Dr. Phillips', reason: 'Café simples e agradável perto de áreas hoteleiras.', rating: 'Curadoria Gaid' },
    ],
    attraction: [
      { name: 'Disney Springs', area: 'Lake Buena Vista', reason: 'Boa opção sem ingresso, com restaurantes e lojas.', rating: 'Curadoria Gaid' },
      { name: 'Winter Park Scenic Boat Tour', area: 'Winter Park', reason: 'Passeio leve e diferente para descansar dos parques.', rating: 'Curadoria Gaid' },
      { name: 'Kennedy Space Center', area: 'Costa Leste', reason: 'Bate-volta forte para famílias e crianças curiosas.', rating: 'Curadoria Gaid' },
    ],
    hotel: [
      { name: 'Four Seasons Resort Orlando', area: 'Golden Oak', reason: 'Base premium para família com alto conforto.', rating: 'Curadoria Gaid' },
      { name: 'Loews Royal Pacific Resort', area: 'Universal Orlando', reason: 'Conveniente para foco em Universal.', rating: 'Curadoria Gaid' },
      { name: 'Wyndham Grand Orlando Bonnet Creek', area: 'Bonnet Creek', reason: 'Boa estrutura familiar perto da Disney.', rating: 'Curadoria Gaid' },
    ],
  },
  'São Paulo': {
    restaurant: [
      { name: 'Maní', area: 'Jardins', reason: 'Boa escolha para uma noite autoral e brasileira, com cara de ocasião especial.', rating: 'Curadoria Gaid' },
      { name: 'Mocotó', area: 'Vila Medeiros', reason: 'Experiência paulistana forte, afetiva e excelente para comida brasileira.', rating: 'Referência local' },
      { name: 'A Casa do Porco', area: 'Centro', reason: 'Opção marcante para quem quer gastronomia premiada e urbana.', rating: 'Referência local' },
    ],
    cafe: [
      { name: 'Coffee Lab', area: 'Vila Madalena', reason: 'Café especial com personalidade e bom para uma pausa sem pressa.', rating: 'Curadoria Gaid' },
      { name: 'Futuro Refeitório', area: 'Pinheiros', reason: 'Funciona bem para café, brunch e um começo de dia mais cool.', rating: 'Curadoria Gaid' },
      { name: 'King of the Fork', area: 'Pinheiros', reason: 'Boa combinação de café, comida simples e clima de bairro.', rating: 'Curadoria Gaid' },
    ],
    attraction: [
      { name: 'Instituto Moreira Salles', area: 'Paulista', reason: 'Boa opção cultural, compacta e ótima para dia de chuva.', rating: 'Curadoria Gaid' },
      { name: 'Liberdade', area: 'Liberdade', reason: 'Bairro forte para comida, lojas e caminhada com personalidade.', rating: 'Curadoria Gaid' },
      { name: 'Pinacoteca', area: 'Luz', reason: 'Museu essencial, bonito e fácil de encaixar em meio período.', rating: 'Curadoria Gaid' },
    ],
    hotel: [
      { name: 'Rosewood São Paulo', area: 'Bela Vista', reason: 'Base premium e arquitetonicamente especial.', rating: 'Curadoria Gaid' },
      { name: 'Emiliano São Paulo', area: 'Jardins', reason: 'Clássico discreto para conforto alto e localização forte.', rating: 'Curadoria Gaid' },
      { name: 'Pulso Hotel', area: 'Faria Lima', reason: 'Mais contemporâneo e prático para uma estadia urbana.', rating: 'Curadoria Gaid' },
    ],
  },
  Bogotá: {
    restaurant: [
      { name: 'Leo', area: 'Chapinero', reason: 'Experiência gastronômica colombiana sofisticada e muito ligada ao território.', rating: 'Referência local' },
      { name: 'El Chato', area: 'Chapinero', reason: 'Cozinha atual, ótima para quem quer uma Bogotá contemporânea.', rating: 'Referência local' },
      { name: 'Andrés Carne de Res', area: 'Chía', reason: 'Mais festivo e icônico, bom quando a ideia é viver algo bem colombiano.', rating: 'Curadoria Gaid' },
    ],
    cafe: [
      { name: 'Azahar Café', area: 'Chapinero', reason: 'Café colombiano bem cuidado, ótimo para uma pausa local.', rating: 'Curadoria Gaid' },
      { name: 'Café Cultor', area: 'Quinta Camacho', reason: 'Boa opção para café especial com clima tranquilo.', rating: 'Curadoria Gaid' },
      { name: 'Amor Perfecto', area: 'Chapinero', reason: 'Referência em cafés colombianos, fácil de recomendar.', rating: 'Curadoria Gaid' },
    ],
    attraction: [
      { name: 'Museo del Oro', area: 'La Candelaria', reason: 'Essencial, coberto e excelente para dia de chuva.', rating: 'Curadoria Gaid' },
      { name: 'Monserrate', area: 'Centro', reason: 'Vista forte da cidade e ótima abertura de roteiro se o clima ajudar.', rating: 'Curadoria Gaid' },
      { name: 'La Candelaria', area: 'Centro histórico', reason: 'Bairro ideal para caminhar, história, cafés e museus.', rating: 'Curadoria Gaid' },
    ],
    hotel: [
      { name: 'Four Seasons Hotel Casa Medina', area: 'Zona G', reason: 'Charme clássico e localização muito boa para gastronomia.', rating: 'Curadoria Gaid' },
      { name: 'Sofitel Bogotá Victoria Regia', area: 'Zona T', reason: 'Base confortável e prática para restaurantes e vida urbana.', rating: 'Curadoria Gaid' },
      { name: 'The Click Clack Hotel', area: 'Parque 93', reason: 'Mais jovem, urbano e conveniente.', rating: 'Curadoria Gaid' },
    ],
  },
  Lisboa: {
    restaurant: [
      { name: 'Prado', area: 'Baixa', reason: 'Cozinha portuguesa atual, ótima para uma noite especial sem formalidade pesada.', rating: 'Curadoria Gaid' },
      { name: 'Taberna da Rua das Flores', area: 'Chiado', reason: 'Pequena, disputada e com cara local.', rating: 'Curadoria Gaid' },
      { name: 'Cervejaria Ramiro', area: 'Intendente', reason: 'Clássico para frutos do mar, direto e muito lisboeta.', rating: 'Clássico local' },
    ],
    cafe: [
      { name: 'The Mill', area: 'Santos', reason: 'Bom para brunch e café com clima contemporâneo.', rating: 'Curadoria Gaid' },
      { name: 'Hello, Kristof', area: 'São Bento', reason: 'Pequeno, bonito e ótimo para café sem pressa.', rating: 'Curadoria Gaid' },
      { name: 'Manteigaria', area: 'Chiado', reason: 'Parada rápida e certeira para pastel de nata.', rating: 'Clássico local' },
    ],
    attraction: [
      { name: 'Museu Nacional do Azulejo', area: 'Xabregas', reason: 'Lindo, coberto e menos óbvio que os clássicos centrais.', rating: 'Curadoria Gaid' },
      { name: 'Alfama', area: 'Alfama', reason: 'Caminhada com história, miradouros e ritmo lisboeta.', rating: 'Curadoria Gaid' },
      { name: 'MAAT', area: 'Belém', reason: 'Boa opção de arquitetura, arte e passeio à beira do Tejo.', rating: 'Curadoria Gaid' },
    ],
    hotel: [
      { name: 'Memmo Príncipe Real', area: 'Príncipe Real', reason: 'Boutique, elegante e muito bem localizado.', rating: 'Curadoria Gaid' },
      { name: 'Bairro Alto Hotel', area: 'Chiado', reason: 'Base premium e clássica para explorar a pé.', rating: 'Curadoria Gaid' },
      { name: 'The Ivens', area: 'Chiado', reason: 'Mais autoral e sofisticado, com personalidade forte.', rating: 'Curadoria Gaid' },
    ],
  },
};

function extractDiscoveryContext(message) {
  const raw = String(message || '').trim();
  const text = normText(raw);
  const place = DISCOVERY_PLACES.find(item =>
    item.aliases.some(alias => text.includes(alias)) ||
    item.neighborhoods.some(area => text.includes(normText(area)))
  );
  const neighborhood = DISCOVERY_PLACES
    .flatMap(item => item.neighborhoods.map(area => ({ city: item.city, area })))
    .find(item => text.includes(normText(item.area)));
  const category =
    /\b(restaurante|jantar|almoco|almoço|comer)\b/.test(text) ? 'Restaurant' :
    /\b(cafe|café|cafeteria|brunch)\b/.test(text) ? 'Cafe' :
    /\b(hotel|hoteis|hotéis|hospedagem|pousada)\b/.test(text) ? 'Hotel' :
    /\b(museu|atracao|atração|passeio|atividade|chuva|crianca|criança|o que fazer)\b/.test(text) ? 'Attraction' :
    'Activity';
  return {
    destination: neighborhood?.city || place?.city || null,
    neighborhood: neighborhood?.area || null,
    category,
    moment: /\bjantar\b|noite/.test(text) ? 'dinner' : /\balmoco|almoço\b/.test(text) ? 'lunch' : /\bhoje|agora\b/.test(text) ? 'today' : null,
    weatherHint: /\bchuva|chovendo\b/.test(text) ? 'rain' : null,
    travelStyle: /\bromant|casal\b/.test(text) ? 'couple' : /\bbarato|econom\b/.test(text) ? 'budget' : /\bpremium|especial\b/.test(text) ? 'premium' : null,
    children: /\bcrianca|criança|filho|filhos\b/.test(text),
    couple: /\bcasal|romant\b/.test(text),
    family: /\bfamilia|família|crianca|criança|filho|filhos\b/.test(text),
    budget: /\bbarato|econom\b/.test(text) ? 'budget' : /\bpremium|luxo|especial\b/.test(text) ? 'premium' : null,
  };
}

function hasEnoughDiscoveryContext(context) {
  return Boolean(context.destination || context.neighborhood);
}

function discoveryIntentForCategory(category) {
  if (category === 'Restaurant') return 'FIND_RESTAURANT';
  if (category === 'Cafe') return 'FIND_CAFE';
  if (category === 'Hotel') return 'FIND_HOTEL';
  if (category === 'Attraction') return 'FIND_ATTRACTION';
  return 'GET_RECOMMENDATION';
}

function discoveryKnowledgeContext(context) {
  const travelerComposition = context.family || context.children
    ? 'família'
    : context.couple
      ? 'casal'
      : '';
  const priorities = [
    context.category === 'Restaurant' ? 'gastronomia' : '',
    context.category === 'Cafe' ? 'cafés' : '',
    context.category === 'Hotel' ? 'conforto' : '',
    context.category === 'Attraction' ? 'cultura' : '',
    context.weatherHint === 'rain' ? 'chuva' : '',
    context.children ? 'crianças' : '',
    context.travelStyle === 'budget' ? 'econômico' : '',
    context.travelStyle === 'premium' ? 'premium' : '',
    ...(Array.isArray(context.profileInterests) ? context.profileInterests : []),
    ...(Array.isArray(context.profilePriorities) ? context.profilePriorities : []),
  ].filter(Boolean);

  return {
    destination: context.destination,
    travelerComposition,
    priorities,
    weather: context.weatherHint,
    tripStyle: context.travelStyle,
  };
}

function enrichDiscoveryReason(item, context, knowledgeContext) {
  const destination = knowledgeContext?.destinationKnowledge?.knowledge;
  if (!destination) return item.reason;
  if (context.category === 'Restaurant' && destination.foodStrengths?.length) {
    return `${item.reason} Combina com a força gastronômica de ${destination.label}.`;
  }
  if (context.category === 'Hotel' && destination.pacingAdvice) {
    return `${item.reason} Ajuda a manter um ritmo mais confortável no destino.`;
  }
  if (context.weatherHint === 'rain' && destination.rainyDayAlternatives?.length) {
    return `${item.reason} Também conversa com bons planos cobertos no destino.`;
  }
  if (context.children && destination.familySuitability) {
    return `${item.reason} ${destination.familySuitability}`;
  }
  return item.reason;
}

function sourceDiscoveryCards(context) {
  const destination = context.destination || 'Rio de Janeiro';
  const catalog = DISCOVERY_CATALOG[destination] || DISCOVERY_CATALOG['Rio de Janeiro'];
  const key = context.category === 'Restaurant' ? 'restaurant'
    : context.category === 'Cafe' ? 'cafe'
      : context.category === 'Hotel' ? 'hotel'
        : 'attraction';
  const rows = catalog[key] || catalog.attraction;
  const intent = discoveryIntentForCategory(context.category);
  const routedKnowledge = getKnowledgeForRequest(intent, discoveryKnowledgeContext(context));
  const source = routedKnowledge.context.sourceMetadata.find(item => item.enabled)?.source || 'gaid-local-discovery';
  const metadata = routedKnowledge.context.sourceMetadata.find(item => item.enabled);
  logKnowledgeDecision({
    surface: 'home',
    flow: 'discovery',
    intent,
    destination,
    category: context.category,
    sources: routedKnowledge.context.sourceMetadata,
    selectedSource: source === 'KNOWLEDGE_CORE' ? 'gaid_knowledge_core' : source,
    confidence: metadata?.confidence || 0,
    fallbackUsed: !routedKnowledge.context.destinationKnowledge?.knowledge,
  });
  const cards = rows.map((item, index) => {
    const baseReason = context.weatherHint === 'rain' && key === 'attraction'
      ? `${item.reason} Também funciona melhor que programa aberto em dia de chuva.`
      : context.children
        ? `${item.reason} É uma opção mais fácil de adaptar para crianças.`
        : item.reason;
    const card = {
      id: `${destination}-${key}-${index + 1}`.toLowerCase().replace(/\s+/g, '-'),
      category: context.category,
      name: item.name,
      area: context.neighborhood || item.area,
      rating: item.rating,
      reason: enrichDiscoveryReason({ ...item, reason: baseReason }, context, routedKnowledge.context),
      shortReason: enrichDiscoveryReason({ ...item, reason: baseReason }, context, routedKnowledge.context),
      idealFor: context.children ? 'famílias com crianças' : context.couple ? 'casais' : context.category === 'Restaurant' ? 'quem quer comer bem' : 'viajantes curiosos',
      caution: context.weatherHint === 'rain' ? 'Confirme deslocamento e tempo de permanência antes de sair.' : 'Curadoria inicial; dados ao vivo entram em integração futura.',
      source: source === 'KNOWLEDGE_CORE' ? 'gaid_knowledge_core' : source,
      confidence: metadata?.confidence || 0.45,
      reasoningHint: metadata?.reasoningHint || 'Discovery local sem conhecimento adicional.',
      tags: [context.category, context.neighborhood || destination, ...(context.profileInterests || []).slice(0, 2)].filter(Boolean),
      actions: [{ id: 'details', label: 'Ver detalhes' }],
      knowledge: routedKnowledge.context,
    };
    return card;
  });
  const rankedCards = rankRecommendationCandidates(cards, discoveryKnowledgeContext(context));
  logToolExecution({
    surface: 'home',
    flow: 'discovery',
    tool: 'Discovery Engine',
    action: 'rankRecommendationCandidates',
    selectedSource: source === 'KNOWLEDGE_CORE' ? 'gaid_knowledge_core' : source,
    resultCount: rankedCards.length,
  });
  return rankedCards;
}

function buildLocalRecommendations(message) {
  return sourceDiscoveryCards(extractDiscoveryContext(message));
}

function discoveryIntro(context) {
  const label = context.category === 'Restaurant' ? 'restaurantes'
    : context.category === 'Cafe' ? 'cafés'
      : context.category === 'Hotel' ? 'hotéis'
        : 'ideias';
  const place = context.neighborhood || context.destination;
  return `Claro. Separei ${label} em ${place} sem abrir um roteiro completo.`;
}

function discoveryRefinementQuestion(context) {
  if (context?.category === 'Restaurant') return 'Quer algo mais romântico, clássico ou moderno?';
  if (context?.category === 'Cafe') return 'Prefere café rápido, brunch ou uma pausa mais charmosa?';
  if (context?.category === 'Hotel') return 'Quer algo mais central, boutique ou com mais conforto?';
  if (context?.category === 'Attraction') return 'Quer algo cultural, ao ar livre ou bom para chuva?';
  const place = context?.neighborhood || context?.destination;
  return place ? `Quer algo mais leve, cultural ou local em ${place}?` : 'Quer algo mais leve, cultural ou local?';
}

function buildDiscoveryResponse(context, cards = null) {
  return {
    cards: Array.isArray(cards) ? cards : sourceDiscoveryCards(context),
    refinementQuestion: discoveryRefinementQuestion(context),
    followupSuggestions: [
      'Mais romântico',
      'Mais local',
      context?.category === 'Hotel' ? 'Mais confortável' : 'Mais econômico',
    ],
  };
}

function discoveryMessage(context, cards = null) {
  const response = buildDiscoveryResponse(context, cards);
  return {
    id: `rec-${Date.now()}`,
    who: 'agent',
    source: 'discovery-engine',
    discoveryResponse: response,
    refinementQuestion: response.refinementQuestion,
    followupSuggestions: response.followupSuggestions,
    recommendations: response.cards,
    discoveryContext: context,
  };
}

function profileAwareDiscoveryContext(context, gaidContext) {
  const familyProfile = /fam/i.test(gaidContext.userProfile.defaultComposition || '') ||
    gaidContext.userProfile.commonCompanions.some(item => /crian|beb/i.test(item));
  const coupleProfile = /casal/i.test(gaidContext.userProfile.defaultComposition || '') ||
    gaidContext.userProfile.commonCompanions.some(item => /parceir|marido|esposa/i.test(item));
  return {
    ...context,
    family: context.family || familyProfile,
    children: context.children || gaidContext.userProfile.childrenAges.length > 0,
    couple: context.couple || coupleProfile,
    travelStyle: context.travelStyle || gaidContext.preferences.pace || null,
    budget: context.budget || gaidContext.preferences.budgetStyle || null,
    profileInterests: gaidContext.preferences.interests,
    profilePriorities: gaidContext.preferences.priorityRanking,
  };
}

function shortContractMessage(response, source = 'conversation-controller') {
  return {
    id: `a-${Date.now()}`,
    who: 'agent',
    text: [response?.title, response?.body].filter(Boolean).join('\n\n') || 'Como você prefere seguir?',
    sections: response?.sections || [],
    actions: response?.actions || [],
    source,
  };
}

function checklistContractMessage(response) {
  return {
    id: `checklist-${Date.now()}`,
    who: 'agent',
    checklist: response,
    source: 'conversation-controller',
  };
}

const CONTEXTUAL_TRIP_STEPS = {
  familyCount: {
    id: 'travelerCount',
    q: 'Quantas pessoas vão viajar no total?',
    sub: 'Inclua adultos e crianças para eu calibrar quartos, ritmo e logística.',
    options: [
      { id: '3', label: '3 pessoas', hint: 'família pequena' },
      { id: '4', label: '4 pessoas', hint: 'formato clássico', recommended: true },
      { id: '5', label: '5 pessoas', hint: 'precisa de mais estrutura' },
      { id: '6', label: '6+ pessoas', hint: 'grupo familiar maior' },
    ],
  },
  friendsCount: {
    id: 'travelerCount',
    q: 'Quantas pessoas vão viajar?',
    sub: 'Isso ajuda a pensar em quartos, transfers e reservas.',
    options: [
      { id: '3', label: '3 pessoas', hint: 'grupo pequeno' },
      { id: '4', label: '4 pessoas', hint: 'fácil de coordenar', recommended: true },
      { id: '5', label: '5 pessoas', hint: 'mais energia e logística' },
      { id: '6', label: '6+ pessoas', hint: 'grupo maior' },
    ],
  },
  childrenAges: {
    id: 'childrenAges',
    q: 'Qual a idade das crianças?',
    sub: 'Isso muda o ritmo dos dias, pausas, deslocamentos e escolha de hotel.',
    options: [
      { id: 'baby', label: 'Bebê ou toddler', hint: '0 a 3 anos' },
      { id: 'kids', label: 'Crianças', hint: '4 a 11 anos' },
      { id: 'teens', label: 'Adolescentes', hint: '12+ anos' },
      { id: 'mixed', label: 'Idades misturadas', hint: 'precisa equilibrar interesses' },
    ],
  },
  coupleStyle: {
    id: 'stylePace',
    type: 'multiselect',
    q: 'Vocês procuram uma viagem mais romântica, gastronômica, cultural ou um mix?',
    sub: 'Vou usar isso para calibrar experiências, bairros e ritmo.',
    options: [
      { id: 'romance', label: 'Romântica', hint: 'hotéis charmosos, jantares e respiro' },
      { id: 'food', label: 'Gastronômica', hint: 'restaurantes, mercados e experiências locais' },
      { id: 'culture', label: 'Cultural', hint: 'museus, bairros e clássicos bem escolhidos' },
      { id: 'mixed', label: 'Um mix', hint: 'equilíbrio entre tudo', recommended: true },
    ],
  },
  soloObjective: {
    id: 'tripPriority',
    type: 'multiselect',
    q: 'Qual é o principal objetivo dessa viagem?',
    sub: 'Assim eu monto uma base que combine com seu momento.',
    options: [
      { id: 'reset', label: 'Descansar e resetar', hint: 'ritmo leve e confortável' },
      { id: 'discover', label: 'Explorar bastante', hint: 'dias mais cheios e descobertas' },
      { id: 'food-culture', label: 'Comer bem e ver cultura', hint: 'restaurantes, bairros e museus' },
      { id: 'meet', label: 'Conhecer pessoas', hint: 'experiências sociais e lugares vivos' },
    ],
  },
  friendsVibe: {
    id: 'tripPriority',
    type: 'multiselect',
    q: 'Qual vibe combina mais com o grupo?',
    sub: 'Grupo bom precisa de roteiro com energia certa e combinados claros.',
    options: [
      { id: 'nightlife', label: 'Vida noturna', hint: 'bares, jantares e agenda mais tarde' },
      { id: 'beach', label: 'Praia e descanso', hint: 'menos deslocamento, mais respiro' },
      { id: 'food', label: 'Gastronomia', hint: 'reservas e experiências locais' },
      { id: 'adventure', label: 'Aventura', hint: 'natureza, passeios e movimento' },
    ],
  },
  orlandoPriority: {
    id: 'tripPriority',
    type: 'multiselect',
    q: 'Vocês querem focar em parques ou misturar parques e descanso?',
    sub: 'Orlando funciona melhor quando o ritmo é decidido cedo.',
    options: [
      { id: 'parks', label: 'Foco total em parques', hint: 'dias intensos e logística afiada' },
      { id: 'parks-rest', label: 'Parques + descanso', hint: 'equilíbrio para não cansar', recommended: true },
      { id: 'parks-shopping', label: 'Parques + compras', hint: 'outlets e pausas planejadas' },
      { id: 'resort', label: 'Resort e experiências leves', hint: 'menos fila, mais conforto' },
    ],
  },
  japanFamiliarity: {
    id: 'firstTime',
    q: 'É sua primeira vez no Japão ou você já conhece o país?',
    sub: 'Com 10+ noites, isso muda bastante a rota ideal.',
    options: [
      { id: 'first-time', label: 'Primeira vez', hint: 'Tóquio, Kyoto e clássicos essenciais', recommended: true },
      { id: 'returning', label: 'Já conheço', hint: 'dá para ir mais autoral e regional' },
      { id: 'mixed-group', label: 'Grupo misto', hint: 'alguns conhecem, outros não' },
      { id: 'not-sure', label: 'Ainda não sei', hint: 'começamos com uma rota equilibrada' },
    ],
  },
  beachPriority: {
    id: 'tripPriority',
    type: 'multiselect',
    q: 'Na praia, o que importa mais para você?',
    sub: 'Isso define se a base vai ser descanso, natureza ou estrutura.',
    options: [
      { id: 'rest', label: 'Descanso total', hint: 'hotel bom, pouca logística' },
      { id: 'nature', label: 'Natureza e passeios', hint: 'barcos, trilhas leves e paisagens' },
      { id: 'family', label: 'Estrutura para família', hint: 'segurança, piscina e quartos práticos' },
      { id: 'scene', label: 'Lugar com movimento', hint: 'restaurantes, bares e energia' },
    ],
  },
  defaultStyle: {
    id: 'stylePace',
    type: 'multiselect',
    q: 'Qual estilo de viagem você prefere?',
    sub: 'Isso define o ritmo do roteiro.',
    options: [
      { id: 'relaxed', label: 'Mais respiro', hint: 'menos correria, mais tempo livre' },
      { id: 'classic', label: 'Clássicos bem feitos', hint: 'principais atrações com curadoria' },
      { id: 'food-culture', label: 'Gastronomia e cultura', hint: 'restaurantes, arte e bairros' },
      { id: 'mixed', label: 'Misturado', hint: 'equilíbrio entre tudo', recommended: true },
    ],
  },
};

const BUDGET_STEP = {
  id: 'budget',
  q: 'Qual faixa de orçamento combina melhor?',
  sub: 'Não precisa ser exato. É só para calibrar as sugestões.',
  options: [
    { id: 'smart', label: 'Custo-benefício', hint: 'bom padrão sem exageros' },
    { id: 'premium', label: 'Premium', hint: 'conforto e boas escolhas', recommended: true },
    { id: 'luxury', label: 'Luxo', hint: 'hotéis e experiências especiais' },
    { id: 'open', label: 'A definir', hint: 'vamos calibrar depois' },
  ],
};

function answerLabel(answers, key) {
  if (answers[key]?.skipped) return '';
  return answers[key]?.label || '';
}

function answerId(answers, key) {
  if (answers[key]?.skipped) return '';
  return answers[key]?.optId || '';
}

function answerLabels(answers, key) {
  if (answers[key]?.skipped) return [];
  const value = answers[key]?.label;
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function answerIds(answers, key) {
  if (answers[key]?.skipped) return [];
  const value = answers[key]?.optId;
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function filledString(...values) {
  return values.find(value => typeof value === 'string' && value.trim())?.trim() || '';
}

function answerText(answers, key) {
  return answerLabels(answers, key).join(', ') || answerIds(answers, key).join(', ') || '';
}

function isMultiField(field) {
  return ['priorities', 'interests', 'tripPriority', 'stylePace', 'experiences'].includes(field);
}

function isMultiStep(step) {
  return step?.type === 'multiselect' || step?.multiple === true || step?.multiselect === true || isMultiField(step?.id);
}

function destinationText(answers) {
  return normText(`${answerIds(answers, 'destination').join(' ')} ${answerLabels(answers, 'destination').join(' ')}`);
}

function isDestination(answers, pattern) {
  return pattern.test(destinationText(answers));
}

function parseNights(answer) {
  const value = Number(answerId(answer, 'duration') || String(answerText(answer, 'duration')).match(/\d+/)?.[0]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parseNumberFromText(value) {
  const match = String(value || '').match(/\d+/);
  const parsed = match ? Number(match[0]) : null;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function travelerCountFrom(answer) {
  const id = answerId(answer, 'travelers');
  if (id === 'solo') return 1;
  if (id === 'couple') return 2;
  const composition = parseTravelerComposition(answerText(answer, 'travelers') || answerText(answer, 'travelerCount'));
  if (composition.count) return composition.count;
  return parseNumberFromText(
    answerId(answer, 'travelerCount') ||
    answerText(answer, 'travelerCount') ||
    answerText(answer, 'travelers') ||
    answerId(answer, 'travelers')
  );
}

function travelerCompositionFrom(answer) {
  const id = answerId(answer, 'travelers');
  if (id === 'solo') return 'Solo';
  if (id === 'couple') return 'Casal';
  if (id === 'family') return 'Família';
  if (id === 'friends') return 'Amigos';
  const label = answerText(answer, 'travelers');
  const text = normText(`${id} ${label}`);
  if (/famil|crianc|filh/.test(text)) return 'Família';
  if (/casal/.test(text)) return 'Casal';
  if (/solo|so eu|sozinh/.test(text)) return 'Solo';
  if (/amig|grupo/.test(text)) return 'Amigos';
  return answerLabel(answer, 'travelers') || null;
}

function parseTravelerComposition(value) {
  const text = normText(value);
  const adults = Number(text.match(/(\d+)\s*adult/)?.[1]) || null;
  const childrenCount = Number(text.match(/(\d+)\s*(crianc|filh)/)?.[1]) || null;
  const ageSection = text.match(/(?:criancas?|filhos?).*?(?:de|com)?\s*((?:\d+\s*(?:,|e|\+)?\s*)+)/)?.[1] || '';
  const ages = [...ageSection.matchAll(/\d+/g)].map(match => Number(match[0])).filter(age => age >= 0 && age <= 17);
  const total = adults || childrenCount ? (adults || 0) + (childrenCount || ages.length || 0) : null;
  return {
    count: total,
    adults,
    children: childrenCount || (ages.length || null),
    ages,
    composition: total || /crianc|filh|famil/.test(text) ? 'Família' : null,
  };
}

const PT_MONTHS = {
  janeiro: 1,
  jan: 1,
  fevereiro: 2,
  fev: 2,
  marco: 3,
  mar: 3,
  abril: 4,
  abr: 4,
  maio: 5,
  mai: 5,
  junho: 6,
  jun: 6,
  julho: 7,
  jul: 7,
  agosto: 8,
  ago: 8,
  setembro: 9,
  set: 9,
  outubro: 10,
  out: 10,
  novembro: 11,
  nov: 11,
  dezembro: 12,
  dez: 12,
};

function isoDate(year, month, day) {
  if (!year || !month || !day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDateRange(value) {
  const label = filledString(value);
  if (!label) return null;
  const numeric = label.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\s*(?:a|ate|até|-)\s*(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/i);
  if (numeric) {
    const startYear = Number(numeric[3]?.length === 2 ? `20${numeric[3]}` : numeric[3]);
    const endYear = Number((numeric[6] || numeric[3])?.length === 2 ? `20${numeric[6] || numeric[3]}` : numeric[6] || numeric[3]);
    if (Number.isFinite(startYear) && Number.isFinite(endYear)) {
      return {
        label,
        start: isoDate(startYear, Number(numeric[2]), Number(numeric[1])),
        end: isoDate(endYear, Number(numeric[5]), Number(numeric[4])),
      };
    }
  }
  const text = normText(label);
  const monthName = Object.keys(PT_MONTHS).find(month => text.includes(month));
  const year = Number(text.match(/\b(20\d{2})\b/)?.[1]);
  const days = [...text.matchAll(/\b(\d{1,2})\b/g)].map(match => Number(match[1])).filter(day => day >= 1 && day <= 31);
  if (monthName && Number.isFinite(year) && days.length >= 2) {
    return {
      label,
      start: isoDate(year, PT_MONTHS[monthName], days[0]),
      end: isoDate(year, PT_MONTHS[monthName], days[1]),
    };
  }
  return { label };
}

function extractPeriodLabel(value) {
  const text = normText(value);
  const monthName = Object.keys(PT_MONTHS).find(month => text.includes(month));
  if (monthName) return monthName;
  const season = text.match(/\b(verao|verão|inverno|primavera|outono|ferias|férias|fim de ano|carnaval|reveillon|réveillon)\b/)?.[1];
  return season || '';
}

function inferPlannerDestination(value) {
  const raw = String(value || '').trim();
  if (!raw || isGenericInitialPrompt(raw)) return '';
  const match = raw.match(/\b(?:para|pra|em|no|na)\s+(?:a|o|os|as)?\s*([\wÀ-ÿ' -]{2,80})/i);
  const candidate = (match?.[1] || raw)
    .replace(/\b(?:em|no|na|de|do|da)?\s*(?:janeiro|jan|fevereiro|fev|mar[cç]o|mar|abril|abr|maio|mai|junho|jun|julho|jul|agosto|ago|setembro|set|outubro|out|novembro|nov|dezembro|dez)\b.*$/i, '')
    .replace(/\b(?:por|durante)\s+\d+.*$/i, '')
    .replace(/[,.!?;:].*$/, '')
    .trim();
  if (isGenericInitialPrompt(candidate) || /\b(roteiro|viagem|viajar|planej|planejar|montar|criar|crie|monte|gerar|gere|novo|nova)\b/i.test(candidate)) return '';
  return candidate.length >= 2 ? candidate : '';
}

function extractInitialPlannerContext(value, seedContext = {}) {
  const promptDates = parseDateRange(value);
  const periodLabel = extractPeriodLabel(value);
  const destination = inferPlannerDestination(value);
  const dates = promptDates
    ? { ...promptDates, label: periodLabel || promptDates.label }
    : periodLabel
      ? { label: periodLabel }
      : null;
  return {
    ...(seedContext && typeof seedContext === 'object' && !Array.isArray(seedContext) ? seedContext : {}),
    ...(destination ? { destination } : {}),
    ...(dates ? { dates, period: dates.label } : {}),
  };
}

function cleanDateLabel(value) {
  const label = filledString(value);
  if (!label) return '';
  const text = normText(label);
  if (label.length > 90 || /\b(quero|roteiro|viagem|viajar|criar|montar)\b/.test(text)) return '';
  return label;
}

function normalizeDates(answers, context) {
  const incoming = context?.dates && typeof context.dates === 'object' && !Array.isArray(context.dates) ? context.dates : null;
  const label = filledString(answerText(answers, 'period'), incoming?.label, context?.period);
  const parsed = parseDateRange(label);
  if (incoming || parsed) {
    return {
      ...(incoming || {}),
      ...(parsed || {}),
      label: filledString(parsed?.label, incoming?.label, label),
    };
  }
  return null;
}

function dateDiffNights(dates) {
  if (!dates?.start || !dates?.end) return null;
  const start = new Date(`${dates.start}T00:00:00`);
  const end = new Date(`${dates.end}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
  return diff > 0 ? diff : null;
}

function isClearDateLabel(value) {
  const text = normText(value).trim();
  if (!text) return false;
  return ![
    /^a definir$/,
    /^datas flexiveis$/,
    /^flexivel$/,
    /^ainda nao sei$/,
    /^nao sei$/,
  ].some(pattern => pattern.test(text));
}

function isGenericInitialPrompt(value) {
  const text = normText(value).trim();
  if (!text) return true;
  return [
    /^ola\b/,
    /^oi\b/,
    /^quero viajar$/,
    /^quero uma viagem$/,
    /^quero ir$/,
    /^quero montar (um )?roteiro$/,
    /^quero criar (um )?roteiro$/,
    /^quero montar uma viagem$/,
    /^quero criar uma viagem$/,
    /^planejar viagem$/,
    /^criar roteiro$/,
    /^criar viagem$/,
    /^montar roteiro$/,
    /^gerar roteiro$/,
    /^gerar roteiro novo$/,
    /^gerar viagem$/,
    /^novo roteiro$/,
    /^nova viagem$/,
    /^roteiro novo$/,
    /^me ajuda/,
    /^nao sei/,
    /^ainda nao sei/,
  ].some(pattern => pattern.test(text));
}

function initialDestinationAnswer(destination) {
  const label = filledString(destination);
  if (!label) return null;
  return { optId: 'custom', label };
}

function initialAnswersFromContext(context = {}) {
  const next = {};
  const destination = filledString(context.destination);
  if (destination) next.destination = { optId: 'custom', label: destination };
  const datesLabel = filledString(context.dates?.label, context.period);
  if (datesLabel) next.period = { optId: 'custom', label: datesLabel };
  const duration = filledString(context.duration) || (context.nights ? `${context.nights} noites` : '');
  if (duration) next.duration = { optId: 'custom', label: duration };
  const travelerCount = parseNumberFromText(context.travelers?.count);
  const travelerComposition = filledString(context.travelers?.composition, context.travelerComposition);
  if (travelerCount && travelerComposition) {
    next.travelers = { optId: 'custom', label: `${travelerCount} ${travelerCount === 1 ? 'pessoa' : 'pessoas'} · ${travelerComposition}` };
  } else if (travelerComposition) {
    next.travelers = { optId: 'custom', label: travelerComposition };
  }
  const ages = Array.isArray(context.childrenAges)
    ? context.childrenAges
    : Array.isArray(context.travelers?.children?.ages)
      ? context.travelers.children.ages
      : [];
  if (ages.length > 0) next.childrenAges = { optId: 'custom', label: ages.join(', ') };
  return next;
}

function periodStepForDestination(destination) {
  const label = filledString(destination);
  return {
    ...BASE_TRIP_WIZARD[1],
    q: label ? `Quando você imagina viajar para ${label}?` : BASE_TRIP_WIZARD[1].q,
  };
}

function chooseDestinationStep(answers) {
  const nights = parseNights(answers) || 0;
  if (isDestination(answers, /orlando|disney/)) return CONTEXTUAL_TRIP_STEPS.orlandoPriority;
  if (isDestination(answers, /japao|japan|tokyo|toquio|kyoto|quioto/) && nights >= 10) return CONTEXTUAL_TRIP_STEPS.japanFamiliarity;
  if (isDestination(answers, /praia|beach|caribe|nordeste|mar/)) return CONTEXTUAL_TRIP_STEPS.beachPriority;
  return null;
}

function chooseTravelerStep(answers) {
  const travelers = answerId(answers, 'travelers');
  if (travelers === 'couple') return CONTEXTUAL_TRIP_STEPS.coupleStyle;
  if (travelers === 'solo') return CONTEXTUAL_TRIP_STEPS.soloObjective;
  if (travelers === 'friends') return CONTEXTUAL_TRIP_STEPS.friendsVibe;
  return CONTEXTUAL_TRIP_STEPS.defaultStyle;
}

function buildAdaptiveTripWizard(answers) {
  const steps = [...BASE_TRIP_WIZARD];
  const travelers = answerId(answers, 'travelers');
  const composition = parseTravelerComposition(answerText(answers, 'travelers'));
  const clearFamilyComposition = composition.composition === 'Família' && composition.count && (composition.children || composition.ages.length > 0);
  if (travelers === 'family' || clearFamilyComposition) {
    if (!clearFamilyComposition) steps.push(CONTEXTUAL_TRIP_STEPS.familyCount);
    if (answerId(answers, 'travelerCount') && !clearFamilyComposition) {
      steps.push(CONTEXTUAL_TRIP_STEPS.childrenAges);
    }
    if (answerId(answers, 'childrenAges') || clearFamilyComposition) {
      const destinationStep = chooseDestinationStep(answers);
      if (destinationStep) steps.push(destinationStep);
      if (!destinationStep || (destinationStep.id === 'firstTime' && answerId(answers, 'firstTime'))) {
        steps.push(CONTEXTUAL_TRIP_STEPS.defaultStyle);
      }
    }
  } else if (travelers === 'friends') {
    steps.push(CONTEXTUAL_TRIP_STEPS.friendsCount);
    if (answerId(answers, 'travelerCount')) {
      const destinationStep = chooseDestinationStep(answers);
      if (destinationStep) steps.push(destinationStep);
      steps.push(CONTEXTUAL_TRIP_STEPS.friendsVibe);
    }
  } else if (travelers) {
    const destinationStep = chooseDestinationStep(answers);
    if (destinationStep) steps.push(destinationStep);
    if (!destinationStep || (destinationStep.id === 'firstTime' && answerId(answers, 'firstTime'))) {
      steps.push(chooseTravelerStep(answers));
    }
  }
  steps.push(BUDGET_STEP);
  return steps;
}

function mergeWizardContext(base, patch) {
  const out = { ...(base || {}) };
  Object.entries(patch && typeof patch === 'object' && !Array.isArray(patch) ? patch : {}).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value) && out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) {
      out[key] = mergeWizardContext(out[key], value);
    } else {
      out[key] = value;
    }
  });
  return out;
}

// LEGACY_UNUSED_DO_NOT_CALL: old AI wizard adapter. Active Home never calls /api/wizard-next.
function aiQuestionToStep(question) {
  if (!question || question.isComplete || !question.question) return null;
  const field = question.field || 'notes';
  const inputType = question.type || question.inputType;
  const multi = question.multiselect === true || question.multiple === true || inputType === 'multiselect' || isMultiField(field);
  return {
    id: field,
    type: multi ? 'multiselect' : inputType,
    q: question.question,
    sub: 'Escolha uma opção ou descreva com suas palavras.',
    options: Array.isArray(question.options)
      ? question.options.map((option) => ({
        id: option.id || option.label,
        label: option.label || option.id,
        hint: '',
      })).filter(option => option.label)
      : [],
    allowFreeText: question.allowFreeText !== false,
  };
}

function syncWizardHistory(history, index, currentStep, nextStep) {
  const next = [...history];
  if (currentStep) next[index] = currentStep;
  if (nextStep) next[index + 1] = nextStep;
  return next;
}

function hasClearTravelerComposition(answers) {
  const composition = parseTravelerComposition(answerText(answers, 'travelers'));
  return composition.composition === 'Família' && composition.count && (composition.children || composition.ages.length > 0);
}

function fieldKnown(field, answers, context = {}) {
  if (!field) return false;
  if (answers?.[field]?.skipped || context?.skippedFields?.[field]?.skipped) return true;
  const dates = normalizeDates(answers, context);
  const parsedTravelers = parseTravelerComposition(`${answerText(answers, 'travelers')} ${answerText(answers, 'travelerCount')} ${answerText(answers, 'childrenAges')}`);
  const travelerCount = travelerCountFrom(answers) ?? parsedTravelers.count ?? parseNumberFromText(context.travelers?.count);
  const travelerComposition = filledString(travelerCompositionFrom(answers), parsedTravelers.composition, context.travelerComposition, context.travelers?.composition);
  const childrenAges = parsedTravelers.ages.length > 0
    ? parsedTravelers.ages
    : Array.isArray(context.childrenAges)
      ? context.childrenAges
      : Array.isArray(context.travelers?.children?.ages)
        ? context.travelers.children.ages
        : [];

  switch (field) {
    case 'destination':
      return !!filledString(answerText(answers, 'destination'), context.destination);
    case 'period':
    case 'dates':
      return !!(dates?.start && dates?.end) || isClearDateLabel(dates?.label);
    case 'duration':
      return !!(parseNights(answers) ?? context.nights ?? parseNumberFromText(context.duration) ?? dateDiffNights(dates));
    case 'travelers':
    case 'travelerCount':
      return !!(travelerCount && travelerComposition);
    case 'childrenAges':
      return childrenAges.length > 0 || hasClearTravelerComposition(answers);
    case 'budget':
      return !!filledString(answerText(answers, 'budget'), context.budget?.label, context.budget, context.comfortLevel);
    default:
      return false;
  }
}

function shouldSkipWizardStep(step, answers, context = {}) {
  if (!step) return false;
  return fieldKnown(step.id, answers, context);
}

function nextUnknownStepIndex(steps, startIndex, answers, context = {}) {
  return steps.findIndex((step, index) => index >= startIndex && !shouldSkipWizardStep(step, answers, context));
}

// LEGACY_UNUSED_DO_NOT_CALL: old completion helpers. Active generation uses completeWizard().
function plannerCompletionStatus(answers, context = {}) {
  const destinationKnown = !!filledString(answerText(answers, 'destination'), context.destination);
  const periodKnown = fieldKnown('period', answers, context);
  const dates = normalizeDates(answers, context);
  const durationKnown = !!(parseNights(answers) ?? context.nights ?? parseNumberFromText(context.duration) ?? dateDiffNights(dates));
  const assumptionsBlocked = context?.assumptionsBlocked === true || context?.blockAssumptions === true;
  const explicitAssumptionMode = context?.skippedAll === true || context?.wizard?.skippedAll === true;
  return {
    ready: destinationKnown && (durationKnown || explicitAssumptionMode) && !assumptionsBlocked,
    destinationKnown,
    periodKnown,
    durationKnown,
    assumptionsBlocked,
    explicitAssumptionMode,
  };
}

function requiredPlannerStep(answers, context = {}) {
  const completion = plannerCompletionStatus(answers, context);
  if (!completion.destinationKnown) return BASE_TRIP_WIZARD[0];
  if (!completion.durationKnown && !completion.explicitAssumptionMode) return BASE_TRIP_WIZARD[2];
  return null;
}

function buildWizardQa(answers, history = []) {
  const seen = new Set();
  return (history || [])
    .filter(step => step && answers?.[step.id] && !seen.has(step.id))
    .map((step) => {
      seen.add(step.id);
      return {
        question: step.q,
        answer: answers?.[step.id]?.skipped ? 'Gaid sugere' : answerText(answers, step.id),
      };
    })
    .filter(item => item.question && item.answer);
}

function wizardQaText(step, label) {
  return `P: ${step?.q || 'Pergunta'}\nR: ${label}`;
}

function sentenceList(values) {
  const items = values.flatMap(value => Array.isArray(value) ? value : [value]).map(value => filledString(value)).filter(Boolean);
  if (items.length <= 1) return items[0] || '';
  if (items.length === 2) return `${items[0]} e ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

function buildWizardSummary(context) {
  const destination = filledString(context.destination, 'uma viagem');
  const dates = cleanDateLabel(context.dates?.label) || cleanDateLabel(context.period);
  const count = parseNumberFromText(context.travelers?.count);
  const composition = filledString(context.travelers?.composition, context.travelerComposition);
  const travelerText = context.travelers?.adults && context.travelers?.children?.count
    ? `${context.travelers.adults} adultos e ${context.travelers.children.count} crianças${context.travelers.children.ages?.length ? ` de ${sentenceList(context.travelers.children.ages.map(String))} anos` : ''}`
    : count
    ? `${count} ${count === 1 ? 'pessoa' : 'pessoas'}`
    : composition || '';
  const budget = filledString(
    typeof context.budget === 'object' ? context.budget?.label : context.budget,
    context.comfortLevel
  );
  const style = Array.isArray(context.stylePace) ? context.stylePace : filledString(context.stylePace);
  const priorities = Array.isArray(context.priorities) ? context.priorities : [];
  const focus = sentenceList([style, ...priorities].filter(Boolean));
  const parts = [`Quero criar um roteiro para ${destination}`];
  if (dates) parts.push(`de ${dates}`);
  if (travelerText) parts.push(`para ${travelerText}`);
  const qualifiers = sentenceList([
    budget ? `uma viagem ${budget}` : '',
    focus ? `foco em ${focus}` : '',
  ]);
  if (qualifiers) parts.push(`com ${qualifiers}`);
  if (context.wizard?.skippedAll || Object.keys(context.skippedFields || {}).length > 0) {
    parts.push('com alguns detalhes sugeridos pela Gaid');
  }
  return `${parts.join(', ')}.`;
}

function buildTripContext(answers, prompt, { context = {}, mode = 'deterministic', qa = [] } = {}) {
  const destination = filledString(answerText(answers, 'destination'), context.destination);
  const period = cleanDateLabel(answerText(answers, 'period')) || cleanDateLabel(context.period) || cleanDateLabel(context.dates?.label);
  const dates = normalizeDates(answers, { ...context, period });
  const parsedComposition = parseTravelerComposition(`${answerText(answers, 'travelers')} ${answerText(answers, 'travelerCount')} ${answerText(answers, 'childrenAges')}`);
  const childrenAges = parsedComposition.ages.length > 0
    ? parsedComposition.ages
    : filledString(answerText(answers, 'childrenAges'), context.childrenAges) || null;
  const travelerCount = travelerCountFrom(answers);
  const contextTravelerCount = parseNumberFromText(context.travelers?.count);
  const travelerComposition = filledString(travelerCompositionFrom(answers), context.travelerComposition, context.travelers?.composition);
  const budget = filledString(answerText(answers, 'budget'), context.budget?.label, context.budget);
  const stylePace = answerLabels(answers, 'stylePace').length > 0 ? answerLabels(answers, 'stylePace') : filledString(context.stylePace) || null;
  const priorities = [
    ...answerLabels(answers, 'tripPriority'),
    ...answerLabels(answers, 'priorities'),
    ...answerLabels(answers, 'interests'),
    ...answerLabels(answers, 'experiences'),
    filledString(context.tripPriority),
    filledString(answerText(answers, 'firstTime'), context.firstTime),
    ...(Array.isArray(context.priorities) ? context.priorities : []),
  ].filter(Boolean);
  return {
    ...context,
    prompt,
    destination: destination || null,
    period: period || null,
    dates,
    nights: parseNights(answers) ?? context.nights ?? null,
    duration: filledString(answerText(answers, 'duration'), context.duration) || null,
    travelers: {
      ...(context.travelers && typeof context.travelers === 'object' && !Array.isArray(context.travelers) ? context.travelers : {}),
      count: travelerCount ?? parsedComposition.count ?? contextTravelerCount ?? null,
      composition: travelerComposition || null,
      adults: parsedComposition.adults ?? context.travelers?.adults ?? null,
      children: {
        count: parsedComposition.children ?? context.travelers?.children?.count ?? null,
        ages: parsedComposition.ages.length > 0 ? parsedComposition.ages : context.travelers?.children?.ages ?? [],
      },
    },
    travelerComposition: travelerComposition || null,
    childrenAges,
    comfortLevel: budget || context.comfortLevel || null,
    budget: budget || context.budget || null,
    stylePace: stylePace || null,
    priorities,
    tripPriority: answerLabels(answers, 'tripPriority').length > 0 ? answerLabels(answers, 'tripPriority') : filledString(context.tripPriority) || null,
    firstTime: filledString(answerText(answers, 'firstTime'), context.firstTime) || null,
    wizard: {
      completed: true,
      mode,
      originalPrompt: prompt,
      qa,
      answers,
    },
  };
}

const WIZARD_V3_MAX_INTERACTIONS = 7;

const WIZARD_V3_INITIAL = {
  active: false,
  status: 'idle',
  stepIndex: 0,
  maxInteractions: WIZARD_V3_MAX_INTERACTIONS,
  context: {
    destination: '',
    period: '',
    dates: null,
    durationDays: null,
    nights: null,
    travelers: null,
    travelerComposition: '',
    interests: [],
    priorityRanking: [],
    budget: '',
    stylePace: '',
    skippedFields: {},
    assumptions: {},
  },
  answers: [],
};

// LEGACY_UNUSED_DO_NOT_CALL: superseded by simpleWizardQuestion().
const WIZARD_V3_QUESTIONS = [
  {
    id: 'destination',
    question: 'Para onde você quer viajar?',
    componentType: 'free_text',
    required: true,
    options: [],
  },
  {
    id: 'duration',
    question: 'Quantos dias você quer viajar?',
    componentType: 'single_select',
    required: true,
    options: [
      { id: '4-dias', label: '4 dias' },
      { id: '7-dias', label: '7 dias' },
      { id: '8-dias', label: '8 dias' },
      { id: '14-dias', label: '14 dias' },
    ],
    allowFreeText: true,
  },
  {
    id: 'travelers',
    question: 'Quem vai viajar?',
    componentType: 'single_select',
    required: false,
    options: [
      { id: 'solo', label: 'Sozinho' },
      { id: 'casal', label: 'Casal' },
      { id: 'familia', label: 'Família' },
      { id: 'amigos', label: 'Amigos' },
    ],
    allowFreeText: true,
  },
  {
    id: 'interests',
    question: 'O que é mais importante nessa viagem?',
    componentType: 'multi_select',
    required: false,
    options: [
      { id: 'cultura', label: 'Cultura' },
      { id: 'gastronomia', label: 'Gastronomia' },
      { id: 'compras', label: 'Compras' },
      { id: 'parques', label: 'Parques' },
      { id: 'descanso', label: 'Descanso' },
      { id: 'praia', label: 'Praia' },
      { id: 'natureza', label: 'Natureza' },
      { id: 'museus', label: 'Museus' },
      { id: 'vida-noturna', label: 'Vida noturna' },
      { id: 'romantico', label: 'Romântico' },
    ],
  },
  {
    id: 'priorityRanking',
    question: 'Ordene as prioridades principais.',
    componentType: 'ranking',
    required: false,
    options: [],
  },
  {
    id: 'budget',
    question: 'Qual estilo de orçamento combina melhor?',
    componentType: 'single_select',
    required: false,
    options: [
      { id: 'economico', label: 'Econômico' },
      { id: 'moderado', label: 'Moderado' },
      { id: 'confortavel', label: 'Confortável' },
      { id: 'luxo', label: 'Luxo' },
      { id: 'nao-sei', label: 'Não sei' },
    ],
  },
  {
    id: 'period',
    question: 'Quando você imagina viajar?',
    componentType: 'free_text',
    required: false,
    options: [],
  },
];

function cloneWizardV3() {
  return JSON.parse(JSON.stringify(WIZARD_V3_INITIAL));
}

function isDestinationOnlyMessage(value) {
  const raw = filledString(value);
  return /^[A-Za-zÀ-ÿ\s]{2,32}$/.test(raw) && !isGenericInitialPrompt(raw);
}

function isTripPlanningIntent(value) {
  const text = normText(value);
  return /(montar|criar|planejar|gerar|monte|crie|planeje|gere).*(roteiro|viagem)|(?:novo|nova).*(roteiro|viagem)|quero ir para|vou viajar para|viajar para|roteiro para|viagem para/.test(text);
}

function isDiscoveryIntent(value) {
  const text = normText(value);
  return /(o que fazer|onde jantar|me indica|me indique|recomendacao rapida|recomendação rápida|me mostra hoteis|me mostra hotéis|cafe|café|restaurante|hotel)/.test(text);
}

function titleCaseDestination(value) {
  return filledString(value).replace(/\s+/g, ' ').trim().replace(/\b\p{L}/gu, char => char.toUpperCase());
}

function parseWizardDestination(value) {
  const candidate = inferPlannerDestination(value);
  return titleCaseDestination(candidate || (isDestinationOnlyMessage(value) ? value : ''));
}

function parseWizardPeriod(value) {
  const raw = filledString(value);
  if (!raw) return {};
  const label = extractPeriodLabel(raw);
  const parsed = parseDateRange(raw);
  if (label) return { period: titleCaseDestination(label), dates: { ...(parsed || {}), label: titleCaseDestination(label) } };
  if (parsed && !/\b(quero|roteiro|viagem|viajar|criar|montar)\b/.test(normText(parsed.label))) {
    return { period: parsed.label, dates: parsed };
  }
  return {};
}

function parseWizardDuration(value) {
  const text = normText(value);
  if (/fim de semana/.test(text)) return { durationDays: 3, nights: 2 };
  if (/uma semana|1 semana/.test(text)) return { durationDays: 7, nights: 6 };
  const days = Number(text.match(/\b(\d+)\s*dias?\b/)?.[1]);
  if (Number.isFinite(days) && days > 0) return { durationDays: days, nights: Math.max(days - 1, 0) };
  const nights = Number(text.match(/\b(\d+)\s*noites?\b/)?.[1]);
  if (Number.isFinite(nights) && nights > 0) return { durationDays: nights + 1, nights };
  return {};
}

function parseWizardTravelers(value) {
  const raw = filledString(value);
  const text = normText(raw);
  const parsed = parseTravelerComposition(raw);
  if (/sozinh|solo|so eu|só eu/.test(text)) return { travelers: { count: 1, composition: 'Solo' }, travelerComposition: 'Solo' };
  if (/esposa|marido|casal|a dois|eu e minha esposa|eu e meu marido/.test(text)) return { travelers: { count: 2, composition: 'Casal' }, travelerComposition: 'Casal' };
  if (parsed.count || parsed.composition || parsed.ages.length > 0) {
    return {
      travelers: {
        count: parsed.count || null,
        composition: parsed.composition || (/famil|crianc|filh/.test(text) ? 'Família' : 'A definir'),
        adults: parsed.adults || null,
        children: { count: parsed.children || null, ages: parsed.ages || [] },
      },
      travelerComposition: parsed.composition || (/famil|crianc|filh/.test(text) ? 'Família' : 'A definir'),
    };
  }
  if (/famil/.test(text)) return { travelers: { count: null, composition: 'Família' }, travelerComposition: 'Família' };
  const count = parseNumberFromText(raw);
  if (count) return { travelers: { count, composition: 'A definir' }, travelerComposition: 'A definir' };
  return {};
}

function parseWizardInterests(value) {
  const values = Array.isArray(value) ? value : [value];
  const text = normText(values.join(' '));
  const interests = [
    ['cultura', /cultura/],
    ['gastronomia', /gastronom|comida|restaurante/],
    ['compras', /compras|shopping|outlet/],
    ['parques', /parque|disney|universal/],
    ['descanso', /descanso|relax|leve|confort/],
    ['praia', /praia/],
    ['natureza', /natureza|trilha|montanha/],
    ['museus', /museu/],
    ['vida noturna', /vida noturna|bar|balada/],
    ['luxo', /luxo|premium/],
    ['econômico', /econom|barat/],
    ['crianças', /crianc|filh/],
    ['romântico', /romant|casal/],
  ].filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
  const fallback = values.map(filledString).filter(Boolean);
  return { interests: interests.length ? interests : fallback, stylePace: interests.includes('descanso') ? 'Ritmo confortável' : 'Equilibrado' };
}

function parseWizardBudget(value) {
  const text = normText(value);
  if (/nao sei|não sei/.test(text)) return { budget: 'A definir' };
  if (/econom|barat/.test(text)) return { budget: 'Econômico' };
  if (/moder/.test(text)) return { budget: 'Moderado' };
  if (/confort/.test(text)) return { budget: 'Confortável' };
  if (/luxo|premium/.test(text)) return { budget: 'Luxo' };
  return filledString(value) ? { budget: filledString(value) } : {};
}

// LEGACY_UNUSED_DO_NOT_CALL: superseded by parseSimplePlanInput().
function extractWizardContextFromPrompt(prompt, seed = {}) {
  const destination = parseWizardDestination(prompt);
  const seedDestination = filledString(seed?.destination);
  const selectedDestination = seedDestination || destination;
  return {
    ...cloneWizardV3().context,
    ...(seed || {}),
    ...(selectedDestination ? {
      destination: selectedDestination,
      destinationEvidence: seed?.destinationEvidence || createDestinationEvidence(
        selectedDestination,
        seedDestination ? 'pending_destination_confirmation' : 'user_explicit_message',
        seedDestination ? seedDestination : prompt,
        seedDestination ? 0.95 : 0.85,
        true
      ),
    } : {}),
    ...parseWizardPeriod(prompt),
    ...parseWizardDuration(prompt),
    ...parseWizardTravelers(prompt),
  };
}

function wizardAnswerLabel(value) {
  if (Array.isArray(value)) return value.join(', ');
  return filledString(value);
}

// LEGACY_UNUSED_DO_NOT_CALL: superseded by answerWizard() + simple parsers.
function applyWizardAnswer(context, question, answer, skipped = false) {
  if (skipped) {
    return {
      ...context,
      skippedFields: { ...(context.skippedFields || {}), [question.id]: true },
    };
  }
  if (question.id === 'destination') {
    const destination = parseWizardDestination(answer) || filledString(answer);
    return {
      ...context,
      destination,
      destinationEvidence: createDestinationEvidence(destination, 'wizard_answer', answer, 0.95, true),
    };
  }
  if (question.id === 'period') return { ...context, ...parseWizardPeriod(answer) };
  if (question.id === 'duration') return { ...context, ...parseWizardDuration(answer) };
  if (question.id === 'travelers') return { ...context, ...parseWizardTravelers(answer) };
  if (question.id === 'interests') return { ...context, ...parseWizardInterests(answer) };
  if (question.id === 'priorityRanking') return { ...context, priorityRanking: Array.isArray(answer) ? answer : [answer].filter(Boolean) };
  if (question.id === 'budget') return { ...context, ...parseWizardBudget(answer) };
  return context;
}

// LEGACY_UNUSED_DO_NOT_CALL: superseded by simpleWizardQuestion().
function nextWizardQuestion(context, answers, maxInteractions = WIZARD_V3_MAX_INTERACTIONS) {
  if (!context.destination) return WIZARD_V3_QUESTIONS.find(q => q.id === 'destination');
  if (!context.period && !context.dates?.label && !context.skippedFields?.period && answers.length < maxInteractions) return WIZARD_V3_QUESTIONS.find(q => q.id === 'period');
  if (!context.durationDays && !context.nights) return WIZARD_V3_QUESTIONS.find(q => q.id === 'duration');
  if (!context.travelers && !context.skippedFields?.travelers && answers.length < maxInteractions) return WIZARD_V3_QUESTIONS.find(q => q.id === 'travelers');
  if ((!context.interests || context.interests.length === 0) && !context.skippedFields?.interests && answers.length < maxInteractions) return WIZARD_V3_QUESTIONS.find(q => q.id === 'interests');
  if ((context.interests?.length || 0) > 1 && (!context.priorityRanking || context.priorityRanking.length === 0) && !context.skippedFields?.priorityRanking && answers.length < maxInteractions) {
    return { ...WIZARD_V3_QUESTIONS.find(q => q.id === 'priorityRanking'), options: context.interests.map(item => ({ id: item, label: item })) };
  }
  if (!context.budget && !context.skippedFields?.budget && answers.length < maxInteractions) return WIZARD_V3_QUESTIONS.find(q => q.id === 'budget');
  return null;
}

function wizardContextWithDefaults(context, skippedAll = false) {
  const assumptions = { ...(context.assumptions || {}) };
  const out = { ...context };
  if (skippedAll && !out.durationDays && !out.nights) {
    out.durationDays = 4;
    out.nights = 3;
    assumptions.duration = '4 dias sugeridos pela Gaid';
  }
  if (!out.travelers) {
    out.travelers = { count: null, composition: 'A definir' };
    out.travelerComposition = 'A definir';
  }
  if (!out.stylePace) out.stylePace = 'Equilibrado';
  if (!out.interests || out.interests.length === 0) out.interests = ['principais atrações', 'gastronomia', 'ritmo confortável'];
  if (!out.priorityRanking || out.priorityRanking.length === 0) out.priorityRanking = out.interests;
  if (!out.budget) out.budget = 'A definir';
  return { ...out, assumptions };
}

function canCompleteWizardV3(context, skippedAll = false) {
  return Boolean(context?.destination && (context.durationDays || context.nights || skippedAll));
}

const GENERIC_DESTINATION_PATTERNS = [
  /^(quero\s+)?(montar|criar|gerar|planejar)\s+(um\s+|uma\s+)?(roteiro|viagem)(\s+novo|\s+nova)?$/i,
  /^(roteiro|viagem)\s+(novo|nova)$/i,
  /^(nova|novo)\s+(viagem|roteiro)$/i,
  /^quero\s+(viajar|ir)$/i,
];

function isForbiddenDestination(value) {
  const raw = filledString(value);
  const text = normText(raw);
  if (!raw || raw.length < 2) return true;
  return GENERIC_DESTINATION_PATTERNS.some(pattern => pattern.test(raw)) ||
    /^(quero|montar|criar|gerar|planejar|roteiro|viagem|novo|nova)$/i.test(text);
}

function createDestinationEvidence(destination, source, originalText, confidence = 0.9, confirmed = true) {
  const cleanDestination = titleCaseDestination(destination);
  if (isForbiddenDestination(cleanDestination)) return null;
  const evidence = {
    destination: cleanDestination,
    source,
    originalText: filledString(originalText),
    confidence,
    confirmed,
  };
  console.info('destination_evidence_created', evidence);
  return evidence;
}

function validDestinationEvidence(context) {
  const evidence = context?.destinationEvidence;
  return Boolean(
    context?.destination &&
    !isForbiddenDestination(context.destination) &&
    evidence?.destination &&
    evidence.confirmed &&
    evidence.confidence >= 0.65 &&
    !['gpt_inference', 'fallback', 'generated_text', 'assistant_suggestion', 'raw_prompt'].includes(evidence.source)
  );
}

function profileDefaultsForWizard(profile) {
  const travelerProfile = profile?.travelerProfile || {};
  const preferences = profile?.preferences || {};
  const defaultComposition = filledString(travelerProfile.defaultComposition);
  const travelers = defaultComposition
    ? {
      count: defaultComposition === 'Solo' || defaultComposition === 'Sozinho'
        ? 1
        : defaultComposition === 'Casal'
          ? 2
          : null,
      composition: defaultComposition,
      children: { ages: Array.isArray(travelerProfile.childrenAges) ? travelerProfile.childrenAges : [] },
    }
    : null;
  return {
    ...(travelers ? { travelers, travelerComposition: travelers.composition } : {}),
    ...(Array.isArray(travelerProfile.childrenAges) && travelerProfile.childrenAges.length ? { childrenAges: travelerProfile.childrenAges } : {}),
    ...(Array.isArray(preferences.interests) && preferences.interests.length ? { interests: preferences.interests } : {}),
    ...(preferences.pace ? { stylePace: preferences.pace } : {}),
    ...(preferences.budgetStyle ? { budget: preferences.budgetStyle } : {}),
    ...(Array.isArray(preferences.priorityRanking) && preferences.priorityRanking.length ? { priorityRanking: preferences.priorityRanking } : {}),
  };
}

// LEGACY_UNUSED_DO_NOT_CALL: superseded by startFlow() initialAnswers.
function initialWizardAnswersFromContext(context = {}) {
  const answers = [];
  if (context.destination) {
    answers.push({
      questionId: 'destination',
      question: 'Para onde você quer viajar?',
      answer: context.destination,
      componentType: 'free_text',
    });
  }
  if (context.period || context.dates?.label) {
    answers.push({
      questionId: 'period',
      question: 'Quando você imagina viajar?',
      answer: context.period || context.dates.label,
      componentType: 'free_text',
    });
  }
  if (context.durationDays || context.nights) {
    answers.push({
      questionId: 'duration',
      question: 'Quantos dias você quer viajar?',
      answer: context.durationDays ? `${context.durationDays} dias` : `${context.nights} noites`,
      componentType: 'single_select',
    });
  }
  return answers;
}

function wizardSummaryLines(answers) {
  return answers
    .filter(item => item.question && item.answer)
    .map(item => `p: ${item.question}\nr: ${item.answer}`)
    .join('\n\n');
}

// LEGACY_UNUSED_DO_NOT_CALL: superseded by simpleTripContext().
function buildWizardTripContext(context, originalPrompt, answers, skippedAll = false) {
  const safe = wizardContextWithDefaults(context, skippedAll);
  const summary = wizardSummaryLines(answers);
  return {
    destination: safe.destination,
    destinationEvidence: safe.destinationEvidence || null,
    period: safe.period || safe.dates?.label || null,
    dates: safe.dates || (safe.period ? { label: safe.period } : null),
    durationDays: safe.durationDays || (safe.nights ? safe.nights + 1 : null),
    nights: safe.nights ?? (safe.durationDays ? Math.max(safe.durationDays - 1, 0) : null),
    travelers: safe.travelers,
    travelerComposition: safe.travelerComposition || safe.travelers?.composition || 'A definir',
    interests: safe.interests,
    priorities: safe.priorityRanking?.length ? safe.priorityRanking : safe.interests,
    priorityRanking: safe.priorityRanking,
    budget: safe.budget,
    stylePace: safe.stylePace,
    skippedFields: safe.skippedFields || {},
    assumptions: safe.assumptions || {},
    wizard: {
      completed: true,
      mode: 'wizard-v3',
      originalPrompt,
      summary,
      answers,
      skippedAll,
    },
  };
}

const SIMPLE_WIZARD_TOTAL = 5;
const SIMPLE_WIZARD_INTERESTS = ['Gastronomia', 'Cultura', 'Natureza', 'Compras', 'Parques', 'Descanso', 'Museus', 'Vida local', 'Romântico', 'Crianças'];
const BLOCKED_SIMPLE_DESTINATIONS = new Set(['ola', 'olá', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'roteiro', 'viagem', 'gerar roteiro novo', 'criar viagem', 'teste', 'ok', 'sim', 'nao', 'não']);

function simpleNorm(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function simpleTitle(value) {
  return filledString(value)
    .split(/\s+/)
    .map(part => part ? `${part.charAt(0).toLocaleUpperCase('pt-BR')}${part.slice(1).toLocaleLowerCase('pt-BR')}` : '')
    .join(' ');
}

function isSimpleGreeting(value) {
  return /^(ola|olá|oi|bom dia|boa tarde|boa noite|tudo bem)[!.?\s]*$/i.test(filledString(value));
}

function isBlockedSimpleDestination(value) {
  const text = simpleNorm(value);
  return !text || BLOCKED_SIMPLE_DESTINATIONS.has(text) || /^(quero |gerar |criar |montar |planejar |roteiro |viagem )/.test(text);
}

function cleanSimpleDestination(value) {
  const cleaned = filledString(value)
    .replace(/\b(?:em|no|na)?\s*(?:janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b.*$/i, '')
    .replace(/\b(?:por|durante)\s+\d+\s*(?:dias|noites).*/i, '')
    .replace(/[,.!?;:].*$/, '')
    .trim();
  if (isBlockedSimpleDestination(cleaned)) return '';
  return simpleTitle(cleaned);
}

function parseSimplePeriod(value) {
  const text = simpleNorm(value);
  const month = text.match(/\b(janeiro|fevereiro|marco|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/)?.[1];
  return month ? simpleTitle(month) : '';
}

function parseSimpleDuration(value) {
  const text = simpleNorm(Array.isArray(value) ? value.join(' ') : value);
  if (/fim de semana/.test(text)) return { durationDays: 3, nights: 2 };
  const days = Number(text.match(/\b(\d+)\s*dias?\b/)?.[1] || text.match(/^(\d+)$/)?.[1]);
  if (Number.isFinite(days) && days > 0) return { durationDays: days, nights: Math.max(days - 1, 0) };
  const nights = Number(text.match(/\b(\d+)\s*noites?\b/)?.[1]);
  if (Number.isFinite(nights) && nights > 0) return { durationDays: nights + 1, nights };
  return {};
}

function parseSimpleTravelers(value) {
  const text = simpleNorm(Array.isArray(value) ? value.join(' ') : value);
  if (/sozinh|so eu|só eu|solo/.test(text)) return { travelers: { count: 1, composition: 'Solo' }, travelerComposition: 'Solo' };
  if (/casal|esposa|marido|a dois/.test(text)) return { travelers: { count: 2, composition: 'Casal' }, travelerComposition: 'Casal' };
  const adults = Number(text.match(/(\d+)\s*adult/)?.[1]) || null;
  const children = Number(text.match(/(\d+)\s*(crianca|filh)/)?.[1]) || null;
  const count = Number(text.match(/^(\d+)$/)?.[1]) || null;
  if (adults || children || /famil/.test(text)) {
    return { travelers: { count: adults || children ? (adults || 0) + (children || 0) : count, composition: 'Família' }, travelerComposition: 'Família' };
  }
  if (count) return { travelers: { count, composition: 'A definir' }, travelerComposition: 'A definir' };
  if (/amig/.test(text)) return { travelers: { count: null, composition: 'Amigos' }, travelerComposition: 'Amigos' };
  return {};
}

function parseSimplePlanInput(value) {
  const raw = filledString(value);
  const patterns = [
    /\broteiro\s+(?:para|pra|em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i,
    /\bviagem\s+(?:para|pra|em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i,
    /\b(?:quero|queria|gostaria|pretendo)\s+ir\s+(?:para|pra|em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i,
    /\b(?:vou|vamos)\s+viajar\s+(?:para|pra|em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i,
  ];
  const found = patterns.map(pattern => raw.match(pattern)?.[1]).find(Boolean);
  const destination = cleanSimpleDestination(found || '');
  const period = parseSimplePeriod(raw);
  return {
    destination,
    period,
    dates: period ? { label: period } : null,
    destinationEvidence: destination ? createDestinationEvidence(destination, 'wizard_answer', raw, 0.9, true) : null,
  };
}

function parseSimpleRecommendationInput(value) {
  const raw = filledString(value);
  const patterns = [
    /\bonde\s+jantar\s+(?:em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i,
    /\bo que fazer\s+(?:em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i,
    /\bdicas?\s+(?:em|no|na|para|pra)\s+([\wÀ-ÿ' -]{2,80})/i,
    /\blugar(?:es)?\s+para\s+ir\s+(?:em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i,
    /\b(?:caf[ée]|restaurante|hotel)\s+(?:em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i,
  ];
  const destination = cleanSimpleDestination(patterns.map(pattern => raw.match(pattern)?.[1]).find(Boolean) || '');
  return { destination };
}

function classifySimpleHomeInput(value) {
  const text = simpleNorm(value);
  if (isSimpleGreeting(value)) return 'GREETING';
  if (/\b(onde jantar|o que fazer|me indica|me indique|quero um restaurante|restaurante|cafe|café|dicas?|lugar para ir)\b/.test(text)) return 'RECOMMENDATION';
  if (/\b(quero montar um roteiro|criar roteiro|gerar roteiro novo|planejar viagem|roteiro|viagem para|quero ir para|vou viajar para|criar viagem)\b/.test(text)) return 'PLAN_TRIP';
  if (/^[a-z\s\u00C0-\u017F]{2,36}$/i.test(filledString(value)) && !isBlockedSimpleDestination(value)) return 'DESTINATION_ONLY';
  return 'UNKNOWN';
}

function simpleWizardQuestion(context = {}) {
  if (!filledString(context.destination)) {
    return { id: 'destination', question: 'Para onde você quer viajar?', componentType: 'free_text', options: [] };
  }
  if (!context.durationDays && !context.nights) {
    return {
      id: 'duration',
      question: 'Quantos dias você quer viajar?',
      componentType: 'single_select',
      options: ['3 dias', '5 dias', '7 dias', '10 dias', '14 dias'].map(label => ({ id: label, label })),
      allowFreeText: true,
    };
  }
  if (!context.travelers && !context.travelerComposition) {
    return {
      id: 'travelers',
      question: 'Quem vai viajar?',
      componentType: 'single_select',
      options: ['Só eu', 'Casal', 'Família com crianças', 'Amigos'].map(label => ({ id: label, label })),
      allowFreeText: true,
    };
  }
  if (!Array.isArray(context.interests) || context.interests.length === 0) {
    return {
      id: 'interests',
      question: 'O que não pode faltar nessa viagem?',
      componentType: 'multi_select',
      options: SIMPLE_WIZARD_INTERESTS.map(label => ({ id: label, label })),
    };
  }
  return null;
}

function simpleAnswerLine(question, answer) {
  return { questionId: question.id, question: question.question, answer: wizardAnswerLabel(answer), componentType: question.componentType };
}

function simpleSummary(context, answers) {
  const lines = answers.filter(item => item.question && item.answer).map(item => `p: ${item.question}\nr: ${item.answer}`);
  if (!lines.some(line => /Para onde/.test(line))) lines.unshift(`p: Para onde você quer viajar?\nr: ${context.destination}`);
  if (!lines.some(line => /Quantos dias/.test(line))) lines.push(`p: Quantos dias você quer viajar?\nr: ${context.durationDays || context.nights + 1} dias`);
  return lines.join('\n\n');
}

function simpleTripContext(context, answers, originalPrompt) {
  const summary = simpleSummary(context, answers);
  return {
    destination: context.destination,
    destinationEvidence: context.destinationEvidence,
    period: context.period || context.dates?.label || null,
    dates: context.dates || (context.period ? { label: context.period } : null),
    durationDays: context.durationDays,
    nights: context.nights ?? (context.durationDays ? Math.max(context.durationDays - 1, 0) : null),
    travelers: context.travelers || null,
    travelerComposition: context.travelerComposition || context.travelers?.composition || 'A definir',
    interests: context.interests || [],
    priorities: context.priorityRanking?.length ? context.priorityRanking : context.interests || [],
    budget: context.budget || null,
    stylePace: context.stylePace || null,
    wizard: { completed: true, mode: 'wizard-minimal', originalPrompt, summary, answers },
  };
}

function homeDebugLog(event, payload = {}) {
  if (!import.meta.env.DEV) return;
  console.info(event, payload);
}

const HomeScreen = ({ setRoute, kickoffPlan, setActiveTripId, activeTrip }) => {
  const acct = useAccount();
  const hasTrip = !!activeTrip;
  const liveTrip = activeTrip;
  const greetName = acct.user.firstName;
  const inspoQ = useCatalog('templates');
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [mode, setMode] = useState('idle');                    // idle | chat
  const [chat, setChat] = useState([]);                        // [{ id, who, text? wizardStep? answered? generating? }]
  const [wizardStep, setWizardStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [phase, setPhase] = useState('asking');                // asking | generating | done
  const [plannerState, setPlannerState] = useState(PLANNER_IDLE);
  const [flowKey, setFlowKey] = useState('trip');              // trip | disney | kids | dog
  const [initialPrompt, setInitialPrompt] = useState('');
  const [aiWizardQuestion, setAiWizardQuestion] = useState(null);
  const [wizardContext, setWizardContext] = useState({});
  const [wizardHistory, setWizardHistory] = useState([]);
  const [wizardV3, setWizardV3] = useState(() => cloneWizardV3());
  const [pendingPlannerContext, setPendingPlannerContext] = useState(null);
  const toast = useToast();
  const scrollerRef = useRef(null);
  const generationInFlightRef = useRef(false);
  const generationTimeoutRef = useRef(null);

  // Flow configs — each maps to a wizard, a generation script, and a target trip.
  const FLOW_CFG = {
    trip: { wizardKey:'tripWizard', genKey:'genSteps', tripKey:'trip',
      intro:'Perfeito. Vou te fazer algumas perguntas rápidas para montar a base do seu roteiro.' },
    disney: { wizardKey:'disneyWizard', genKey:'genSteps',     tripKey:'disneyTrip',
      intro:'Disney em família é uma das minhas especialidades. Vou te perguntar algumas coisas rápidas — clica numa opção ou descreve com suas palavras.' },
    kids:   { wizardKey:'kidsWizard',   genKey:'genStepsKids', tripKey:'disneyTrip',
      intro:'Viajar com crianças tem mil detalhes — documentos, carrinho, ritmo — e é exatamente aí que eu brilho. 3 perguntas rápidas e eu penso no resto por você.' },
    dog:    { wizardKey:'dogWizard',    genKey:'genStepsDog',  tripKey:'dogTrip',
      intro:'Viajar com cachorro pra Europa tem prazos que começam ~30 dias antes. Vou fazer 3 perguntas e montar tudo — documentos, voo na cabine, hotéis pet-friendly e pontos de atenção.' },
  };
  const cfg = FLOW_CFG[flowKey] || FLOW_CFG.trip;
  const activeWizardQuestion = wizardV3.active && wizardV3.status === 'collecting'
    ? simpleWizardQuestion(wizardV3.context)
    : null;
  const wizard = activeWizardQuestion ? [activeWizardQuestion] : [];
  const latestRecommendation = [...chat].reverse().find(m => Array.isArray(m.recommendations) && m.recommendations.length > 0) || null;
  const getHomeContext = () => buildGaidContext({
    profile: acct.profile,
    activeTrip,
    surface: 'home',
    lastIntent: plannerState,
    pendingDestination: pendingPlannerContext,
    lastRecommendationSet: latestRecommendation?.recommendations || null,
    lastRecommendationQuery: latestRecommendation?.discoveryContext?.query || '',
  });

  const detectFlow = (t) => {
    const s = (t || '').toLowerCase();
    if (/cachorr|c[ãa]o\b|c[ãa]es|pet\b|cadela|cadelo|dog|\bau\b/.test(s)) return 'dog';
    if (/filho|filha|crian|fam[ií]lia|kids|beb[êe]|netos?/.test(s)) return 'kids';
    if (s.includes('disney')) return 'disney';
    return null;
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollTo({ top: 99999, behavior: 'smooth' });
  }, [chat, thinking]);

  // ---- flow control ----
  const startFlow = (userText, key = 'trip', seedContext = {}, baseChat = null) => {
    setFlowKey('trip');
    setPlannerState(PLANNER_COLLECTING);
    setInitialPrompt(userText);
    setPendingPlannerContext(null);
    setAnswers({});
    setAiWizardQuestion(null);
    setWizardContext({});
    setWizardHistory([]);
    setMode('chat');
    const parsed = parseSimplePlanInput(userText);
    const context = {
      ...parsed,
      ...seedContext,
    };
    const initialAnswers = [];
    if (context.destination) initialAnswers.push({ questionId: 'destination', question: 'Para onde você quer viajar?', answer: context.destination, componentType: 'free_text' });
    if (context.period) initialAnswers.push({ questionId: 'period', question: 'Quando você imagina viajar?', answer: context.period, componentType: 'free_text' });
    if (context.durationDays) initialAnswers.push({ questionId: 'duration', question: 'Quantos dias você quer viajar?', answer: `${context.durationDays} dias`, componentType: 'single_select' });
    homeDebugLog('wizard_step_changed', {
      step: simpleWizardQuestion(context)?.id || 'review',
      hasDestination: !!context.destination,
      hasDuration: !!context.durationDays,
    });
    setWizardV3({
      active: true,
      status: 'collecting',
      stepIndex: 0,
      maxInteractions: SIMPLE_WIZARD_TOTAL,
      context,
      answers: initialAnswers,
    });
    setPhase('asking');
    setChat([
      ...(Array.isArray(baseChat) ? baseChat : [{ id: 'u-0', who: 'user', text: userText }]),
      { id: 'a-intro', who: 'agent', text: FLOW_CFG.trip.intro },
    ]);
  };

  const handleHomeSubmit = (text) => {
    const t = (text || input).trim();
    if (!t) return;
    if (phase === 'generating') return;
    homeDebugLog('home_submit_received', { mode, phase, wizardActive: wizardV3.active, wizardStatus: wizardV3.status });
    setInput('');

    if (wizardV3.active && wizardV3.status === 'collecting' && activeWizardQuestion) {
      answerWizard('custom', t);
      return;
    }

    const userMsg = { id: `u-${Date.now()}`, who: 'user', text: t };
    const baseChat = mode === 'idle' ? [userMsg] : [...chat, userMsg];
    setMode('chat');
    const type = classifySimpleHomeInput(t);
    homeDebugLog('home_intent_detected', { intent: type, hasPendingDestination: !!pendingPlannerContext?.destination });

    if (pendingPlannerContext?.destination) {
      if (/\b(roteiro|viagem|montar|criar|planejar|sim)\b/.test(simpleNorm(t))) {
        startFlow(t, 'trip', {
          destination: pendingPlannerContext.destination,
          destinationEvidence: createDestinationEvidence(pendingPlannerContext.destination, 'pending_destination_confirmation', t, 0.95, true),
        }, baseChat);
        return;
      }
      if (/\b(dica|dicas|ver dicas|recomend|jantar|restaurante|cafe|café|o que fazer)\b/.test(simpleNorm(t))) {
        const discoveryContext = profileAwareDiscoveryContext({
          ...extractDiscoveryContext(`${t} ${pendingPlannerContext.destination}`),
          destination: pendingPlannerContext.destination,
        }, getHomeContext());
        setPendingPlannerContext(null);
        setPhase('done');
        setChat([...baseChat, discoveryMessage(discoveryContext, sourceDiscoveryCards(discoveryContext))]);
        return;
      }
    }

    if (type === 'GREETING') {
      setPhase('done');
      setChat([...baseChat, { id: `a-${Date.now()}`, who: 'agent', text: 'Oi! Posso te ajudar a montar um roteiro ou encontrar uma boa dica de viagem.', source: 'home-core' }]);
      return;
    }

    if (type === 'PLAN_TRIP') {
      startFlow(t, 'trip', {}, baseChat);
      return;
    }

    if (type === 'RECOMMENDATION') {
      const parsed = parseSimpleRecommendationInput(t);
      const discoveryContext = profileAwareDiscoveryContext({
        ...extractDiscoveryContext(t),
        ...(parsed.destination ? { destination: parsed.destination } : {}),
      }, getHomeContext());
      if (!hasEnoughDiscoveryContext(discoveryContext)) {
        setPhase('done');
        setChat([...baseChat, { id: `a-${Date.now()}`, who: 'agent', text: 'Claro — em qual cidade você quer a recomendação?', source: 'home-core' }]);
        return;
      }
      setPhase('done');
      setChat([...baseChat, discoveryMessage(discoveryContext, sourceDiscoveryCards(discoveryContext))]);
      return;
    }

    if (type === 'DESTINATION_ONLY') {
      const destination = simpleTitle(t);
      setPendingPlannerContext({ destination });
      setPhase('done');
      setChat([...baseChat, {
        id: `a-${Date.now()}`,
        who: 'agent',
        text: `Você quer montar um roteiro para ${destination} ou receber dicas por lá?`,
        source: 'home-core',
        actions: [
          { id: 'plan', label: 'Montar roteiro', kind: 'plan', destination },
          { id: 'tips', label: 'Ver dicas', kind: 'tips', destination },
        ],
      }]);
      return;
    }

    setPhase('done');
    setChat([...baseChat, { id: `a-${Date.now()}`, who: 'agent', text: 'Posso te ajudar de duas formas agora: montar um roteiro ou encontrar uma boa dica de lugar.', source: 'home-core' }]);
  };

  const completeWizard = () => {
    if (generationInFlightRef.current || phase === 'generating') return;
    const safeContext = wizardV3.context || {};
    const destination = filledString(safeContext.destination);
    const duration = Number(safeContext.durationDays || safeContext.nights || 0);
    const validDestination = !!destination && !isBlockedSimpleDestination(destination) && !/^roteiro\s+para\s+/i.test(destination);
    if (!validDestination || !duration || wizardV3.status !== 'review') {
      console.info('trip_creation_blocked', {
        reason: 'missing_minimum_context',
        destination,
        duration,
        status: wizardV3.status,
      });
      setWizardV3(current => ({ ...current, active: true, status: 'collecting' }));
      setPhase('asking');
      setChat(c => [...c, {
        id: `a-${Date.now()}`,
        who: 'agent',
        text: 'Para montar o roteiro, preciso primeiro saber o destino e a duração da viagem.',
        source: 'home-core',
      }]);
      return;
    }
    if (typeof kickoffPlan !== 'function') {
      homeDebugLog('trip_generation_failed', { destination, duration, reason: 'missing_kickoff_plan' });
      setPlannerState(PLANNER_COLLECTING);
      setPhase('done');
      setWizardV3(current => ({ ...current, active: true, status: 'review' }));
      setChat(c => [...c, {
        id: `a-${Date.now()}`,
        who: 'agent',
        text: 'Não consegui iniciar a criação do roteiro agora. Tente novamente em instantes.',
        source: 'error',
        actions: [{ id: 'retry-generate', label: 'Tentar novamente', kind: 'retry-generate' }],
      }]);
      return;
    }
    generationInFlightRef.current = true;
    homeDebugLog('trip_generation_started', { destination, duration });
    console.info('trip_creation_allowed', { destination, duration });
    setPlannerState(PLANNER_GENERATING);
    setPhase('generating');
    setWizardV3(current => ({ ...current, active: false, status: 'generating' }));
    const handoffContext = simpleTripContext(safeContext, wizardV3.answers, initialPrompt);
    const summary = handoffContext.wizard.summary;
    const loadingId = `a-generating-${Date.now()}`;
    setChat(c => [
      ...c,
      { id: `u-summary-${Date.now()}`, who: 'user', text: summary },
      { id: loadingId, who: 'agent', generating: true, loadingCategory: 'planning' },
    ]);
    let settled = false;
    let timedOut = false;
    generationTimeoutRef.current = window.setTimeout(() => {
      if (settled) return;
      timedOut = true;
      generationInFlightRef.current = false;
      generationTimeoutRef.current = null;
      homeDebugLog('trip_generation_timeout', { destination, duration });
      setPlannerState(PLANNER_COLLECTING);
      setPhase('done');
      setWizardV3(current => ({ ...current, active: true, status: 'review' }));
      setChat(c => [
        ...c.filter(message => message.id !== loadingId),
        {
          id: `a-${Date.now()}`,
          who: 'agent',
          text: 'Demorei mais do que deveria. Vamos tentar gerar o roteiro novamente?',
          source: 'timeout',
          actions: [{ id: 'retry-generate', label: 'Tentar novamente', kind: 'retry-generate' }],
        },
      ]);
    }, 45000);
    Promise.resolve(kickoffPlan && kickoffPlan({
      prompt: summary,
      context: handoffContext,
      tripContext: handoffContext,
      destination: handoffContext.destination,
    }))
      .then(() => {
        settled = true;
        generationInFlightRef.current = false;
        if (generationTimeoutRef.current) window.clearTimeout(generationTimeoutRef.current);
        generationTimeoutRef.current = null;
        if (timedOut) return;
        homeDebugLog('trip_generation_success', { destination, duration });
        setPlannerState(PLANNER_COMPLETE);
        setRoute && setRoute('plan');
      })
      .catch((error) => {
        settled = true;
        generationInFlightRef.current = false;
        if (generationTimeoutRef.current) window.clearTimeout(generationTimeoutRef.current);
        generationTimeoutRef.current = null;
        if (timedOut) return;
        homeDebugLog('trip_generation_failed', { destination, duration, reason: error?.message || 'unknown' });
        setPlannerState(PLANNER_COLLECTING);
        setPhase('done');
        setWizardV3(current => ({ ...current, active: true, status: 'review' }));
        setChat(c => [
          ...c.filter(message => message.id !== loadingId),
          {
            id: `a-${Date.now()}`,
            who: 'agent',
            text: 'Não consegui criar sua viagem agora. Tente novamente em instantes.',
            source: 'error',
            actions: [{ id: 'retry-generate', label: 'Tentar novamente', kind: 'retry-generate' }],
          },
        ]);
      });
  };

  const answerWizard = (optId, label, meta = {}) => {
    const question = activeWizardQuestion;
    if (!question) return;
    const answer = wizardAnswerLabel(label);
    let patch = {};
    if (question.id === 'destination') {
      const destination = cleanSimpleDestination(answer);
      if (!destination) {
        setChat(c => [...c, { id: `a-${Date.now()}`, who: 'agent', text: 'Para montar o roteiro, preciso primeiro saber o destino.', source: 'home-core' }]);
        return;
      }
      patch = {
        destination,
        destinationEvidence: createDestinationEvidence(destination, 'wizard_answer', answer, 0.95, true),
      };
    } else if (question.id === 'duration') {
      patch = parseSimpleDuration(answer);
      if (!patch.durationDays && !patch.nights) {
        setChat(c => [...c, { id: `a-${Date.now()}`, who: 'agent', text: 'Me diga a duração da viagem, por exemplo “8 dias”.', source: 'home-core' }]);
        return;
      }
    } else if (question.id === 'travelers') {
      patch = parseSimpleTravelers(answer);
    } else if (question.id === 'interests') {
      const values = Array.isArray(label) ? label : [answer].filter(Boolean);
      patch = { interests: values };
    }
    const nextContext = { ...wizardV3.context, ...patch };
    const nextAnswers = [...wizardV3.answers, simpleAnswerLine(question, answer)];
    const nextQuestion = simpleWizardQuestion(nextContext);
    homeDebugLog('wizard_step_changed', { from: question.id, to: nextQuestion?.id || 'review' });
    setWizardV3({
      ...wizardV3,
      status: nextQuestion ? 'collecting' : 'review',
      context: nextContext,
      stepIndex: nextQuestion ? nextAnswers.length : wizardV3.stepIndex,
      answers: nextAnswers,
    });
    setPhase(nextQuestion ? 'asking' : 'done');
  };

  const handleHomeAction = (action) => {
    if (!action) return;
    if (action.kind === 'plan' && action.destination) {
      const destination = cleanSimpleDestination(action.destination);
      if (!destination) return;
      const userMsg = { id: `u-${Date.now()}`, who: 'user', text: `Montar roteiro para ${destination}` };
      startFlow(`roteiro para ${destination}`, 'trip', {
        destination,
        destinationEvidence: createDestinationEvidence(destination, 'pending_destination_confirmation', action.destination, 0.95, true),
      }, [...chat, userMsg]);
      return;
    }
    if (action.kind === 'tips' && action.destination) {
      const destination = cleanSimpleDestination(action.destination);
      if (!destination) return;
      const userMsg = { id: `u-${Date.now()}`, who: 'user', text: `Ver dicas em ${destination}` };
      const discoveryContext = profileAwareDiscoveryContext({
        ...extractDiscoveryContext(`dicas em ${destination}`),
        destination,
      }, getHomeContext());
      setPendingPlannerContext(null);
      setMode('chat');
      setPhase('done');
      setChat([...chat, userMsg, discoveryMessage(discoveryContext, sourceDiscoveryCards(discoveryContext))]);
      return;
    }
    if (action.kind === 'retry-generate') {
      completeWizard();
    }
  };

  const onGenerationDone = () => {
    // Generation is backend-driven; nothing fabricated here. Open the plan.
    setRoute && setRoute('plan');
  };

  const openGeneratedTrip = (tripId) => {
    generationInFlightRef.current = false;
    if (generationTimeoutRef.current) window.clearTimeout(generationTimeoutRef.current);
    generationTimeoutRef.current = null;
    setActiveTripId && setActiveTripId(tripId);
    setRoute('plan');
    setTimeout(() => {
      setPlannerState(PLANNER_IDLE);
      setMode('idle');
      setChat([]);
      setWizardStep(0);
      setAnswers({});
      setAiWizardQuestion(null);
      setWizardContext({});
      setWizardHistory([]);
      setWizardV3(cloneWizardV3());
      setPhase('asking');
    }, 400);
  };

  const exitChat = () => {
    generationInFlightRef.current = false;
    if (generationTimeoutRef.current) window.clearTimeout(generationTimeoutRef.current);
    generationTimeoutRef.current = null;
    setPlannerState(PLANNER_IDLE);
    setMode('idle');
    setChat([]);
    setWizardStep(0);
    setAnswers({});
    setAiWizardQuestion(null);
    setWizardContext({});
    setWizardHistory([]);
    setWizardV3(cloneWizardV3());
    setPhase('asking');
  };

  // ---- render ----
  if (mode === 'chat') {
    return (
      <div className="h-screen flex flex-col bg-canvas">
        {/* slim header */}
        <header className="px-4 sm:px-6 lg:px-10 pt-4 lg:pt-6 pb-4 flex items-center justify-between gap-4">
          <button onClick={exitChat}
            className="h-9 px-3 rounded-lg text-[12.5px] text-ink-700 hover:bg-ink-100 inline-flex items-center gap-1.5">
            <Icon.ChevronLeft size={14}/> Voltar ao início
          </button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-white border-half flex items-center justify-center">
              <GaidLogo className="h-3 w-auto max-w-[18px]"/>
            </div>
            <div>
              <div className="text-[13px] font-medium text-ink-900 leading-tight">Gaid · concierge</div>
              <div className="text-[10.5px] text-ink-500 leading-tight">montando seu roteiro</div>
            </div>
          </div>
          <Button size="sm" variant="ghost" icon={Icon.X} onClick={exitChat}>Sair</Button>
        </header>

        {/* chat scroll */}
        <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10">
          <div className="max-w-[780px] mx-auto py-6 space-y-6">
            {chat.map((m, i) => (
              <ChatMsg key={m.id || i} m={m}
                wizard={wizard}
                genSteps={[]}
                onAnswer={answerWizard}
                onAction={handleHomeAction}
                onGenDone={onGenerationDone}
                onOpenTrip={openGeneratedTrip}/>
            ))}
            {thinking && (
              <ConciergeLoading category="auto" className="fade-up"/>
            )}
          </div>
        </div>

        {/* bottom chatbar — always visible */}
        <div className="px-4 sm:px-6 lg:px-10 pb-[max(24px,env(safe-area-inset-bottom))] lg:pb-6 pt-3 bg-gradient-to-t from-canvas via-canvas to-canvas/0">
          <div className="max-w-[780px] mx-auto">
            {wizardV3.active && ['collecting', 'review'].includes(wizardV3.status) && (
              <div className="mb-4">
                {wizardV3.status === 'review' ? (
                  <WizardV3Review
                    context={wizardV3.context}
                    onGenerate={() => completeWizard()}
                    onEdit={() => { setWizardV3(current => ({ ...current, status: 'collecting' })); setPhase('asking'); }}
                    onCancel={() => { setWizardV3(cloneWizardV3()); setPhase('done'); }}
                  />
                ) : (
                  <ActionWizardPanel
                    stepIdx={Math.min(wizardV3.answers.length, wizardV3.maxInteractions - 1)}
                    total={wizardV3.maxInteractions}
                    step={activeWizardQuestion}
                    onPick={answerWizard}
                  />
                )}
              </div>
            )}
            <div className="bg-white border-half rounded-full shadow-card h-[56px] pl-5 pr-[6px] flex items-center gap-2 transition-shadow hover:shadow-lift focus-within:shadow-lift focus-within:border-brand-200 focus-within:ring-4 focus-within:ring-brand-50">
              <Icon.Sparkles size={15} className="text-ink-500 shrink-0"/>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleHomeSubmit()}
                placeholder={phase === 'generating' ? 'Aguarde a Gaid terminar…' : 'Responda ou pergunte qualquer coisa…'}
                disabled={phase === 'generating'}
                className="flex-1 h-full outline-none text-[14px] placeholder:text-ink-400 bg-transparent leading-none disabled:opacity-50"/>
              <button className="h-9 w-9 rounded-full hover:bg-ink-100 text-ink-600 flex items-center justify-center shrink-0" title="Anexar">
                <Icon.Plus size={15}/>
              </button>
              <button onClick={() => handleHomeSubmit()} disabled={phase === 'generating'}
                className="h-11 px-5 rounded-full bg-ink-900 text-paper hover:bg-brand-700 focus-visible:ring-4 focus-visible:ring-brand-200 transition-colors flex items-center gap-2 text-[13.5px] font-medium shrink-0 disabled:opacity-40 disabled:cursor-not-allowed">
                <Icon.Send size={14}/>
                Enviar
              </button>
            </div>
            <div className="mt-2 text-[11px] text-ink-500 text-center">
              {wizardV3.active && wizardV3.status === 'collecting'
                ? 'Você pode clicar numa opção acima ou digitar sua própria resposta aqui.'
                : phase === 'generating'
                  ? 'A Gaid está finalizando — chat volta em instantes.'
                  : ' '}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== IDLE MODE =====
  return (
    <div className="min-h-screen flex flex-col">
      <div className="min-h-[85vh] flex flex-col">
        <header className="px-4 sm:px-6 lg:px-10 pt-4 lg:pt-6 pb-0 flex items-center justify-end gap-2">
          <Button variant="ghost" icon={Icon.Bell} className="hidden sm:inline-flex">Atualizações</Button>
          <Button variant="secondary" icon={Icon.Plus} onClick={() => setRoute('trips')}>Nova viagem</Button>
        </header>

        <section className="px-4 sm:px-6 lg:px-10 flex-1 flex items-center pb-8">
          <div className="max-w-[860px] mx-auto text-center w-full">
            <Tag tone="brand" className="mx-auto"><Icon.Sparkles size={12}/> Concierge premium · IA + experts reais</Tag>
            <h2 className="mt-4 text-[32px] sm:text-[42px] lg:text-[52px] leading-[1.06] tracking-[-0.025em] font-serif font-medium text-ink-900">
              {greetName ? `Olá, ${greetName}!` : 'Olá!'}
              <br/>
              <span className="serif-i">Qual será a sua próxima viagem?</span>
            </h2>

            <div className="mt-7 mx-auto max-w-[720px]">
              <div className="bg-white border-half rounded-full shadow-card h-[60px] pl-5 pr-[6px] flex items-center gap-3 transition-shadow hover:shadow-lift focus-within:shadow-lift focus-within:border-brand-200 focus-within:ring-4 focus-within:ring-brand-50">
                <Icon.Sparkles size={16} className="text-ink-500 shrink-0"/>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleHomeSubmit()}
                  placeholder="Quer viajar? A Gaid tem um roteiro para você."
                  className="flex-1 h-full outline-none text-[15px] placeholder:text-ink-400 bg-transparent leading-none"/>
                <button className="h-10 w-10 rounded-full hover:bg-ink-100 text-ink-600 flex items-center justify-center shrink-0" title="Voz">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>
                  </svg>
                </button>
                <button onClick={() => handleHomeSubmit()}
                  className="h-12 px-5 rounded-full bg-ink-900 text-paper hover:bg-brand-700 focus-visible:ring-4 focus-visible:ring-brand-200 transition-colors flex items-center gap-2 text-[14px] font-medium shrink-0">
                  <Icon.Send size={15}/>
                  Pedir
                </button>
              </div>
            </div>

            <HomeFirstRun setRoute={setRoute} onPickIdea={(label) => handleHomeSubmit(label)}/>
          </div>
        </section>
      </div>

      <section className="px-4 sm:px-6 lg:px-10 pb-20 lg:pb-16 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6">
        <div>
          {hasTrip ? (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="label">Continuar onde parou</div>
                  <div className="text-[17px] font-serif font-medium tracking-tight text-ink-900 mt-1">{liveTrip.title}</div>
                  <div className="text-[12.5px] text-ink-500 mt-0.5">{liveTrip.dates} · {liveTrip.travelers} viajantes</div>
                </div>
                <div className="flex items-center gap-2">
                  <OptimizeMenu onApply={(m) => { toast({title:`Otimizando · ${m.label}`, desc: m.delta || 'Aplicando…', tone:'success'}); setTimeout(() => setRoute('plan'), 500); }}/>
                  <Button variant="secondary" iconRight={Icon.ArrowRight} onClick={() => setRoute('plan')}>Abrir</Button>
                </div>
              </div>

              <SmartImg src={liveTrip.coverImage?.url} seed={liveTrip.coverSeed} tone={liveTrip.cover} w={800} h={420} className="h-[180px] rounded-xl"/>

              <div className="mt-5 grid grid-cols-2 gap-6">
                <Stat label="Progresso" value={`${liveTrip.progress}%`} hint={`${liveTrip.days?.length || 0} dias planejados`}/>
                <Stat label="Estimativa" value={liveTrip.budget} hint="vs. orçamento" tone="sage"/>
              </div>
            </Card>
          ) : (
            <Card className="p-5">
              <div className="label">Continuar onde parou</div>
              <div className="text-[17px] font-serif font-medium tracking-tight text-ink-900 mt-1">Nenhuma viagem em andamento</div>
              <div className="text-[12.5px] text-ink-500 mt-1 leading-relaxed">Descreva uma viagem acima para começar.</div>
            </Card>
          )}
        </div>

        <div className="min-w-0">
          {inspoQ?.status === 'empty' ? (
            <Card className="h-[360px] p-6 flex items-center">
              <div className="max-w-[420px]">
                <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center mb-4">
                  <Icon.Compass size={17}/>
                </div>
                <div className="text-[16px] font-serif font-medium tracking-tight text-ink-900">Roteiros sob medida aparecem aqui</div>
                <div className="text-[13px] text-ink-500 mt-2 leading-relaxed">
                  Quando houver sugestões prontas para o seu perfil, elas aparecem nesta área.
                </div>
              </div>
            </Card>
          ) : (
            <>
              <SectionHeader eyebrow="Inspiração editorial" title="Roteiros que combinam com você"
                action={<Button variant="ghost" iconRight={Icon.ArrowRight} onClick={() => setRoute('explore')}>Explorar todos</Button>}/>
              <CatalogCarousel
                query={inspoQ}
                itemClass="w-[300px]"
                render={(r) => (
                  <button key={r.id} onClick={() => setRoute('explore')}
                    className="bg-white border-half rounded-2xl overflow-hidden text-left card-h flex flex-col h-[360px] w-full">
                    <SmartImg seed={`route-${r.id}`} tone={r.tone} label={r.category} w={500} h={300} className="h-[170px] w-full shrink-0"/>
                    <div className="p-4 flex flex-col flex-1">
                      <div className="text-[10.5px] uppercase tracking-wider text-ink-500 mb-1">{orTBD(r.category)}</div>
                      <div className="text-[14.5px] font-medium text-ink-900 leading-snug line-clamp-2">{orTBD(r.title)}</div>
                      {has(r.expert) && <div className="text-[11.5px] text-ink-500 mt-2 flex items-center gap-1.5"><Icon.Sparkles size={11} className="text-ink-900"/> Por {r.expert}</div>}
                      <div className="mt-auto pt-3 text-[12px] text-ink-500 flex items-center justify-between">
                        <span className="whitespace-nowrap">{has(r.days) ? `${r.days} dias` : TBD}</span>
                        <span className="whitespace-nowrap">desde <span className="text-ink-900 font-medium">{orTBD(r.from)}</span></span>
                      </div>
                    </div>
                  </button>
                )}
              />
            </>
          )}
                  </div>
      </section>

      <footer className="px-10 pb-10 pt-2">
        <div className="text-[12px] text-ink-500 flex items-center gap-2 justify-center">
          <Icon.Lock size={11}/> A Gaid nunca compartilha o que você está planejando.
        </div>
      </footer>
    </div>
  );
};

// ============ Chat message renderer ============
// Switches between user bubbles, plain agent text, inline wizard, and inline gen card.
const ChatMsg = ({ m, wizard, genSteps, onAnswer, onAction, onGenDone, onOpenTrip }) => {
  if (m.who === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-ink-900 text-paper rounded-2xl rounded-tr-md px-4 py-2.5 text-[14px] max-w-[80%] leading-relaxed whitespace-pre-line">
          {m.text}
        </div>
      </div>
    );
  }

  // agent message
  if (typeof m.wizardStep === 'number') {
    return (
      <InlineWizard
        stepIdx={m.wizardStep}
        wizard={wizard}
        step={wizard[m.wizardStep]}
        answered={m.answered}
        onPick={(optId, label) => onAnswer(optId, label)}
      />
    );
  }

  if (m.generating) {
    return (
      <div className="fade-up">
        <ConciergeLoading category={m.loadingCategory || 'planning'}/>
      </div>
    );
  }

  if (m.prep) {
    return <PrepBriefing flowKey={m.prep}/>;
  }

  if (m.tripReady) {
    return <TripReadyInline tripId={m.tripReady} onOpen={onOpenTrip}/>;
  }

  if (Array.isArray(m.recommendations) && m.recommendations.length > 0) {
    const refinementQuestion = filledString(m.discoveryResponse?.refinementQuestion, m.refinementQuestion);
    return (
      <div className="space-y-3 max-w-[760px]">
        <RecommendationCarousel items={m.recommendations}/>
        {refinementQuestion && <div className="text-[14.5px] text-ink-900 leading-relaxed max-w-[85%]">{refinementQuestion}</div>}
      </div>
    );
  }

  if (m.checklist) {
    return (
      <div className="max-w-[560px] bg-white border-half rounded-2xl p-4 shadow-soft space-y-3">
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-ink-400">checklist</div>
          <div className="text-[15px] font-medium text-ink-900 mt-1">{m.checklist.title}</div>
        </div>
        <div className="space-y-2">
          {(m.checklist.items || []).map((item, index) => (
            <div key={`${item.label}-${index}`} className="flex items-start gap-2.5 text-[13px] text-ink-700">
              <Icon.Check size={14} className="text-brand-700 mt-0.5 shrink-0"/>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        <div className="text-[12px] text-ink-500 leading-relaxed">
          Regras podem mudar. Antes de viajar, confirme em uma fonte oficial.
        </div>
      </div>
    );
  }

  // plain agent text
  return (
    <div className="text-[14.5px] text-ink-900 leading-relaxed max-w-[85%]">
      {m.text}
      {Array.isArray(m.sections) && m.sections.length > 0 && (
        <div className="mt-3 space-y-2">
          {m.sections.map((section, index) => (
            <div key={index} className="text-[13px] text-ink-700">{section.title ? `${section.title}: ` : ''}{section.body}</div>
          ))}
        </div>
      )}
      {Array.isArray(m.actions) && m.actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {m.actions.map(action => (
            <button key={action.id || action.label} onClick={() => onAction && onAction(action)}
              className="h-8 px-3 rounded-lg border-half bg-white text-[12.5px] font-medium text-ink-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 transition-colors">
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const RecommendationCarousel = ({ items }) => {
  const [selected, setSelected] = useState(null);
  const sourceLabel = selected?.source === 'gaid_knowledge_core'
    ? 'Gaid curation'
    : selected?.source || 'Gaid curation';
  return (
    <>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {items.map((item, index) => (
          <div key={`${item.name}-${index}`} className="shrink-0 w-[230px] bg-white border-half rounded-2xl p-4 shadow-soft">
            <div className="h-9 w-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center mb-3">
              <Icon.MapPin size={15}/>
            </div>
            <div className="text-[10.5px] uppercase tracking-wider text-ink-500">{item.category}</div>
            <div className="text-[14px] font-medium text-ink-900 leading-tight mt-1">{item.name}</div>
            <div className="text-[12px] text-ink-500 mt-1">{item.area}</div>
            <div className="text-[12px] text-ink-600 leading-snug mt-3">{item.reason}</div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="text-[11px] text-ink-400">{item.rating || 'Curadoria Gaid'}</span>
              <button
                onClick={() => setSelected(item)}
                className="h-7 px-2.5 rounded-lg border-half text-[11.5px] text-ink-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 transition-colors"
              >
                Ver detalhes
              </button>
            </div>
          </div>
        ))}
      </div>
      <Drawer open={!!selected} onClose={() => setSelected(null)} eyebrow="Detalhes da sugestão" title={selected?.name || 'Sugestão'} width={440}>
        <div className="p-6 space-y-5">
          <div>
            <div className="label mb-1">{selected?.category || 'Sugestão'}</div>
            <div className="text-[15px] text-ink-900 font-medium">{selected?.area || 'Área a definir'}</div>
          </div>
          <div>
            <div className="text-[12px] uppercase tracking-wide text-ink-400 mb-1">Por que combina</div>
            <p className="text-[14px] leading-relaxed text-ink-700">{selected?.shortReason || selected?.reason || 'Selecionado pela curadoria da Gaid para este contexto.'}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border-half bg-white p-3">
              <div className="text-[11px] text-ink-400 mb-1">Ideal para</div>
              <div className="text-[13px] text-ink-800">{selected?.idealFor || 'viajantes com esse perfil'}</div>
            </div>
            <div className="rounded-xl border-half bg-white p-3">
              <div className="text-[11px] text-ink-400 mb-1">Atenção</div>
              <div className="text-[13px] text-ink-800">{selected?.caution || 'Confirme dados vivos quando a integração estiver ativa.'}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border-half bg-white p-3">
              <div className="text-[11px] text-ink-400 mb-1">Fonte</div>
              <div className="text-[13px] text-ink-800">{sourceLabel}</div>
            </div>
            <div className="rounded-xl border-half bg-white p-3">
              <div className="text-[11px] text-ink-400 mb-1">Confiança</div>
              <div className="text-[13px] text-ink-800">{selected?.confidence ? `${Math.round(selected.confidence * 100)}%` : 'Curadoria'}</div>
            </div>
          </div>
          {selected?.reasoningHint && (
            <div className="rounded-xl bg-brand-50 text-brand-900 px-4 py-3 text-[13px] leading-relaxed">
              {selected.reasoningHint}
            </div>
          )}
          {Array.isArray(selected?.tags) && selected.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.tags.map(tag => (
                <span key={tag} className="h-7 px-3 rounded-full bg-ink-100 text-ink-700 text-[12px] inline-flex items-center">{tag}</span>
              ))}
            </div>
          )}
          <div className="rounded-xl border-half bg-canvas p-4">
            <div className="text-[12px] uppercase tracking-wide text-ink-400 mb-1">Futuro</div>
            <p className="text-[13px] leading-relaxed text-ink-600">
              Aqui entram mapa, avaliações, horários e disponibilidade quando a integração com Places estiver conectada.
            </p>
          </div>
        </div>
      </Drawer>
    </>
  );
};

// TODO: replace local recommendation cards with Google Maps Places API results.

const ActionWizardPanel = ({ stepIdx, total, step, onPick, onSkipStep, onSkipAll }) => (
  <div className="bg-white border-half rounded-2xl shadow-lift p-4">
    <InlineWizard
      stepIdx={stepIdx}
      total={total}
      step={step}
      onPick={onPick}
      onSkipStep={onSkipStep}
      onSkipAll={onSkipAll}
      compact
    />
  </div>
);

const WizardV3Review = ({ context, onGenerate, onEdit, onCancel }) => {
  const safe = wizardContextWithDefaults(context, context?.assumptions?.skippedAll === true);
  const rows = [
    ['Destino', safe.destination],
    ['Período', safe.period || safe.dates?.label],
    ['Duração', safe.durationDays ? `${safe.durationDays} dias` : safe.nights ? `${safe.nights} noites` : 'A definir'],
    ['Viajantes', safe.travelers?.count ? `${safe.travelers.count} viajantes` : safe.travelerComposition || safe.travelers?.composition],
    ['Interesses', sentenceList(safe.interests)],
    ['Orçamento', safe.budget],
  ].filter(([, value]) => filledString(value));

  return (
    <div className="bg-white border-half rounded-2xl shadow-lift p-4 space-y-4">
      <div>
        <div className="text-[10.5px] mono uppercase tracking-wider text-ink-400">revisão</div>
        <div className="text-[15.5px] text-ink-900 font-medium leading-snug mt-1">Pronto para gerar?</div>
        <div className="text-[12.5px] text-ink-500 mt-1">Confira a base do roteiro antes de eu abrir o plano.</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl border-half bg-paper px-3 py-2">
            <div className="text-[10.5px] uppercase tracking-wider text-ink-400">{label}</div>
            <div className="text-[13px] text-ink-900 mt-0.5">{value}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <button onClick={onEdit}
            className="h-9 px-3 rounded-lg border-half bg-white text-[12.5px] font-medium text-ink-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 transition-colors">
            Editar respostas
          </button>
          <button onClick={onCancel}
            className="h-9 px-2 rounded-lg text-[12.5px] text-ink-500 hover:text-ink-900 transition-colors">
            Cancelar
          </button>
        </div>
        <button onClick={onGenerate}
          className="h-9 px-4 rounded-lg bg-ink-900 text-paper text-[12.5px] font-medium hover:bg-brand-700 transition-colors inline-flex items-center gap-1.5">
          Gerar roteiro <Icon.ArrowRight size={12}/>
        </button>
      </div>
    </div>
  );
};

// ============ Inline wizard question ============
// Wizard v3 keeps answers inside local state and only emits one summary at the end.
const InlineWizard = ({ stepIdx, step, wizard, total, answered, onPick, onSkipStep, onSkipAll, compact = false }) => {
  const [custom, setCustom] = useState('');
  const [selected, setSelected] = useState([]);
  const [ranking, setRanking] = useState([]);
  if (!step) return null;
  const totalSteps = total || (wizard || []).length || WIZARD_V3_MAX_INTERACTIONS;
  const type = step.componentType || step.type || (isMultiStep(step) ? 'multi_select' : 'single_select');
  const multi = type === 'multi_select';
  const rankingStep = type === 'ranking';
  const freeText = type === 'free_text';
  const options = Array.isArray(step.options) ? step.options : [];
  const question = step.question || step.q;
  const sub = step.sub || (freeText ? 'Digite uma resposta curta.' : 'Escolha uma opção ou descreva com suas palavras.');
  const answeredText = Array.isArray(answered?.label) ? sentenceList(answered.label) : answered?.label;
  const rankingItems = ranking.length ? ranking : options.map(option => ({ id: option.id, label: option.label }));

  const toggle = (option) => {
    setSelected(prev => prev.some(item => item.id === option.id)
      ? prev.filter(item => item.id !== option.id)
      : [...prev, { id: option.id, label: option.label }]
    );
  };

  const moveRank = (index, direction) => {
    const source = rankingItems;
    const target = index + direction;
    if (target < 0 || target >= source.length) return;
    const next = [...source];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setRanking(next);
  };

  const confirmMulti = () => {
    if (selected.length === 0 && !custom.trim()) return;
    const customOption = custom.trim() ? [{ id: 'custom', label: custom.trim() }] : [];
    const values = [...selected, ...customOption];
    onPick(values.map(item => item.id), values.map(item => item.label));
    setSelected([]);
    setCustom('');
  };

  const confirmFreeText = () => {
    const value = custom.trim();
    if (!value) return;
    onPick('custom', value);
    setCustom('');
  };

  const confirmRanking = () => {
    const values = rankingItems.length ? rankingItems : options;
    if (values.length === 0) return;
    onPick(values.map(item => item.id), values.map(item => item.label));
  };

  if (answered) {
    return (
      <div className="text-[12.5px] text-ink-500 flex items-center gap-2 pl-1">
        <Icon.Check size={12} className="text-ink-900"/>
        <span>{question.replace('?','')} → <span className="text-ink-900 font-medium">{answeredText}</span></span>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${compact ? 'max-w-none' : 'max-w-[600px]'}`}>
      {compact && (
        <div className="text-[10.5px] mono uppercase tracking-wider text-ink-400">
          etapa {String(stepIdx+1).padStart(2,'0')} de {String(totalSteps).padStart(2,'0')}
        </div>
      )}
      <div>
        <div className="text-[15.5px] text-ink-900 font-medium leading-snug">{question}</div>
        <div className="text-[12.5px] text-ink-500 mt-1">{sub}</div>
      </div>

      {rankingStep ? (
        <div className="space-y-1.5">
          {rankingItems.map((o, index) => (
            <div key={o.id}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white border-half">
              <div className="h-6 w-6 rounded-full bg-ink-100 text-ink-500 flex items-center justify-center text-[11px] mono shrink-0">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0 text-[13.5px] font-medium text-ink-900 leading-tight">{o.label}</div>
              <div className="flex items-center gap-1">
                <button onClick={() => moveRank(index, -1)} disabled={index === 0}
                  className="h-7 w-7 rounded-lg border-half text-ink-500 hover:text-ink-900 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center">
                  ↑
                </button>
                <button onClick={() => moveRank(index, 1)} disabled={index === rankingItems.length - 1}
                  className="h-7 w-7 rounded-lg border-half text-ink-500 hover:text-ink-900 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center">
                  ↓
                </button>
              </div>
            </div>
          ))}
          <button onClick={confirmRanking} disabled={rankingItems.length === 0}
            className="h-9 px-4 rounded-lg bg-ink-900 text-paper text-[12.5px] font-medium hover:bg-brand-700 disabled:opacity-35 disabled:cursor-not-allowed inline-flex items-center gap-1.5">
            Continuar <Icon.ArrowRight size={12}/>
          </button>
        </div>
      ) : options.length > 0 && !freeText ? (
        <ul className="space-y-1.5">
        {options.map(o => {
          const on = selected.some(item => item.id === o.id);
          return (
          <li key={o.id}>
            <button onClick={() => multi ? toggle(o) : onPick(o.id, o.label)}
              className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl bg-white border-half hover:border-brand-200 hover:bg-brand-50 transition-colors group ${on ? 'border-brand-200 bg-brand-50' : ''}`}>
              <div className={`h-6 w-6 ${multi ? 'rounded-md' : 'rounded-full'} border-half flex items-center justify-center transition-colors shrink-0 ${
                on ? 'bg-brand-700 text-paper border-brand-700' : 'text-ink-400 group-hover:border-brand-200 group-hover:text-brand-700'
              }`}>
                {multi && on ? <Icon.Check size={12}/> : <Icon.ChevronRight size={12}/>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-medium text-ink-900 leading-tight">{o.label}</div>
                <div className="text-[11.5px] text-ink-500 mt-0.5">{o.hint}</div>
              </div>
              {o.recommended && (
                <span className="text-[10px] font-medium px-1.5 h-5 rounded-full bg-ink-900 text-paper flex items-center whitespace-nowrap shrink-0">recomendado</span>
              )}
            </button>
          </li>
          );
        })}
        </ul>
      ) : null}

      {/* Outra opção — free text */}
      <div className="bg-paper border-half border-dashed rounded-xl px-4 py-2.5 flex items-center gap-3">
        <Icon.Edit size={13} className="text-ink-500 shrink-0"/>
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && custom.trim()) { multi ? confirmMulti() : confirmFreeText(); } }}
          placeholder={freeText ? 'Digite aqui…' : 'Outra opção · descreva com suas palavras…'}
          className="flex-1 outline-none text-[13px] bg-transparent placeholder:text-ink-500"/>
        {custom.trim() && (
          <button onClick={() => { multi ? confirmMulti() : confirmFreeText(); }}
            className="h-7 px-2.5 rounded-md bg-ink-900 text-paper text-[11.5px] font-medium hover:bg-brand-700 transition-colors inline-flex items-center gap-1">
            Enviar <Icon.ArrowRight size={11}/>
          </button>
        )}
      </div>

      {multi && (
        <button onClick={confirmMulti} disabled={selected.length === 0 && !custom.trim()}
          className="h-9 px-4 rounded-lg bg-ink-900 text-paper text-[12.5px] font-medium hover:bg-brand-700 disabled:opacity-35 disabled:cursor-not-allowed inline-flex items-center gap-1.5">
          Continuar <Icon.ArrowRight size={12}/>
        </button>
      )}

      {compact && (onSkipStep || onSkipAll) && (
        <div className="flex items-center gap-3 pt-1">
          {onSkipStep && (
            <button onClick={onSkipStep}
              className="h-8 px-3 rounded-lg border-half bg-white text-[12px] font-medium text-ink-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 transition-colors">
              Pular etapa
            </button>
          )}
          {onSkipAll && (
            <button onClick={onSkipAll}
              className="h-8 px-2 rounded-lg text-[12px] text-ink-500 hover:text-ink-900 transition-colors">
              Pular tudo
            </button>
          )}
        </div>
      )}

      {!compact && <div className="text-[10.5px] mono uppercase tracking-wider text-ink-400">
        pergunta {String(stepIdx+1).padStart(2,'0')} de {String(totalSteps).padStart(2,'0')}
      </div>}
    </div>
  );
};

// ============ Generating animation ============
// Rendered inline in the chat as an agent message. Shows steps progressing.
const GeneratingCard = ({ steps, totalDuration = 30000, onDone, onSkip, embedded = false }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDone && onDone(), totalDuration);
    return () => clearTimeout(timer);
  }, [onDone, totalDuration]);

  return <ConciergeLoading category="planning" className="max-w-[640px]"/>;
};

// ============ Prep briefing — "Tudo que pensei por você" ============
// Rendered inline after generation when the trip has a prep checklist.
const PrepBriefing = ({ flowKey }) => {
  const trip = null;   // prep checklist comes from the generated trip (backend)
  const groups = (trip && trip.prep) || [];
  const [open, setOpen] = useState(0); // first group expanded
  const totalItems = groups.reduce((s, g) => s + g.items.length, 0);
  const doneItems = groups.reduce((s, g) => s + g.items.filter(i => i.done).length, 0);

  return (
    <div className="bg-white border-half rounded-3xl shadow-lift overflow-hidden max-w-[640px] fade-up">
      {/* header */}
      <div className="p-5 border-b hairline">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-ink-900 text-paper flex items-center justify-center"><Icon.Sparkles size={15}/></div>
          <div className="label">Concierge proativo</div>
        </div>
        <div className="text-[17px] font-medium tracking-tight text-ink-900 mt-3">{trip.prepTitle}</div>
        <div className="text-[13px] text-ink-600 mt-1 leading-relaxed">{trip.prepIntro}</div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
            <div className="h-full bg-ink-900" style={{ width: `${Math.round((doneItems/totalItems)*100)}%` }}/>
          </div>
          <div className="text-[11px] mono text-ink-500 shrink-0">{doneItems}/{totalItems} ok</div>
        </div>
      </div>

      {/* accordion groups */}
      <div className="divide-y hairline">
        {groups.map((g, gi) => {
          const Ic = Icon[g.icon] || Icon.Check;
          const expanded = open === gi;
          const gDone = g.items.filter(i => i.done).length;
          return (
            <div key={gi}>
              <button onClick={() => setOpen(expanded ? -1 : gi)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-ink-50 transition-colors text-left">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0
                                ${g.urgent ? 'bg-ink-900 text-paper' : 'bg-ink-100 text-ink-700'}`}>
                  <Ic size={16}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium text-ink-900">{g.title}</span>
                    {g.urgent && <span className="text-[9.5px] font-medium px-1.5 h-4 rounded-full bg-coral-50 text-coral-700 flex items-center uppercase tracking-wide">prazo</span>}
                  </div>
                  <div className="text-[11.5px] text-ink-500 mt-0.5">{gDone}/{g.items.length} resolvidos</div>
                </div>
                <Icon.ChevronDown size={16} className={`text-ink-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`}/>
              </button>
              {expanded && (
                <div className="px-5 pb-4 pt-1 space-y-2">
                  {g.items.map((it, ii) => (
                    <div key={ii} className="flex items-start gap-3">
                      <div className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 mt-0.5
                                      ${it.done ? 'bg-ink-900 text-paper' : 'border-half bg-white'}`}>
                        {it.done ? <Icon.Check size={11}/> : <span className="h-1 w-1 rounded-full bg-ink-400"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[13px] leading-snug ${it.done ? 'text-ink-500' : 'text-ink-900 font-medium'}`}>{it.label}</div>
                        {it.note && <div className="text-[11.5px] text-ink-500 mt-0.5 leading-snug">{it.note}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-5 py-3 bg-ink-50/60 text-[11.5px] text-ink-500 flex items-center gap-2">
        <Icon.Info size={13}/> A Gaid monitora os prazos e te lembra na hora certa. Tudo isso fica salvo no roteiro.
      </div>
    </div>
  );
};

// ============ Trip-ready inline CTA ============
const TripReadyInline = ({ tripId, onOpen }) => {
  const trip = null;   // the created trip is read from the store once backend is wired
  if (!trip) return null;
  return (
    <button onClick={() => onOpen(tripId)}
      className="w-full max-w-[640px] bg-white border-half rounded-3xl overflow-hidden text-left card-h shadow-card fade-up">
      <div className="flex">
        <SmartImg src={trip.coverImage?.url} seed={trip.coverSeed} tone={trip.cover} w={280} h={280} className="w-[120px] shrink-0"/>
        <div className="flex-1 p-4 min-w-0">
          <div className="label">Roteiro pronto</div>
          <div className="text-[16px] font-medium tracking-tight text-ink-900 mt-1 leading-tight truncate">{trip.title}</div>
          <div className="text-[12px] text-ink-500 mt-1">{trip.dates} · {trip.nights} noites · {trip.budget}</div>
          <div className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-900">
            Abrir roteiro completo <Icon.ArrowRight size={13}/>
          </div>
        </div>
      </div>
    </button>
  );
};

// First-run replacement for the "continue where you left off" block, shown when
// the account has no active trip yet. Welcomes the user and points them at the
// two ways to start: describe a trip (prompt above) or browse inspiration.
const HomeFirstRun = ({ setRoute, onPickIdea }) => {
  // Action starters — each routes to a real screen, so they keep working once
  // the backend is plugged in (no fabricated content, just navigation/intent).
  const starters = [
    { id: 'custom',  label: 'Criar roteiro',       icon: Icon.Sparkles, run: () => onPickIdea?.('Quero montar um roteiro') },
    { id: 'tip',     label: 'Pedir uma dica',      icon: Icon.Compass,  run: () => onPickIdea?.('O que fazer no Rio?') },
    { id: 'trips',   label: 'Ver meus roteiros',   icon: Icon.Calendar, run: () => setRoute('trips') },
  ];

  return (
    <section className="mt-6">
      <div className="flex flex-wrap justify-center gap-1">
        {starters.map(s => {
          const Ic = s.icon;
          return (
            <button key={s.id} onClick={s.run}
              className="h-8 px-3.5 rounded-full bg-ink-100 text-[12px] font-medium text-ink-700 hover:bg-ink-200 hover:text-ink-900 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap">
              <Ic size={12} className="text-ink-500"/> {s.label}
            </button>
          );
        })}
      </div>
    </section>
  );
};

const SetupRow = ({ icon: Ic, label, hint, done, onClick }) => (
  <button onClick={onClick}
    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-ink-50 transition-colors text-left">
    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${done ? 'bg-ink-900 text-paper' : 'bg-ink-100 text-ink-700'}`}>
      {done ? <Icon.Check size={15}/> : <Ic size={15}/>}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[14px] font-medium text-ink-900">{label}</div>
      <div className="text-[11.5px] text-ink-500">{hint}</div>
    </div>
    <Icon.ChevronRight size={15} className="text-ink-400 shrink-0"/>
  </button>
);

const Row = ({ icon: Ic, label, value, hint, tone }) => (
  <div className="flex items-center gap-3">
    <div className="h-9 w-9 rounded-lg bg-ink-100 text-ink-700 flex items-center justify-center"><Ic size={15}/></div>
    <div className="flex-1 min-w-0">
      <div className="text-[12px] text-ink-500">{label}</div>
      <div className="text-[14px] font-medium text-ink-900">{value}</div>
    </div>
    <div className={`text-[11.5px] ${tone === 'sage' ? 'text-sage-700' : 'text-ink-500'}`}>{hint}</div>
  </div>
);

// ---------- Starters board: full-width carousel, editable + draggable ----------
const tones = ['warm','cool','sage','coral','ink'];
const StartersBoard = ({ onPick }) => {
  const [items, setItems] = useState(() => ([
    { id: 'descanso', label: 'Uns dias de descanso', hint: 'ritmo lento',   tone: 'warm' },
    { id: 'familia',  label: 'Viagem em família',    hint: 'com crianças',  tone: 'cool' },
    { id: 'cidade',   label: 'Cidade + gastronomia', hint: 'fim de semana', tone: 'sage' },
    { id: 'lua',      label: 'Lua de mel',           hint: 'a dois',        tone: 'coral' },
  ]));
  const [editing, setEditing] = useState(null);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftHint, setDraftHint] = useState('');
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const scrollerRef = useRef(null);

  const startEdit = (it) => {
    setEditing(it.id);
    setDraftLabel(it.label);
    setDraftHint(it.hint);
  };
  const commitEdit = () => {
    if (!editing) return;
    setItems(xs => xs.map(x => x.id === editing ? { ...x, label: draftLabel || x.label, hint: draftHint || x.hint } : x));
    setEditing(null);
  };
  const remove = (id) => setItems(xs => xs.filter(x => x.id !== id));
  const add = () => {
    const id = 'new-' + Date.now();
    const tone = tones[Math.floor(Math.random() * tones.length)];
    const it = { id, label: 'Nova ideia', hint: 'descrever…', tone };
    setItems(xs => [...xs, it]);
    setTimeout(() => {
      startEdit(it);
      scrollerRef.current?.scrollTo({ left: 999999, behavior: 'smooth' });
    }, 30);
  };

  const onDragStart = (id) => (e) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', id); } catch {}
  };
  const onDragOver = (id) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== overId) setOverId(id);
  };
  const onDrop = (id) => (e) => {
    e.preventDefault();
    if (!dragId || dragId === id) { setDragId(null); setOverId(null); return; }
    setItems(xs => {
      const a = xs.findIndex(x => x.id === dragId);
      const b = xs.findIndex(x => x.id === id);
      if (a < 0 || b < 0) return xs;
      const copy = xs.slice();
      const [moved] = copy.splice(a, 1);
      copy.splice(b, 0, moved);
      return copy;
    });
    setDragId(null);
    setOverId(null);
  };
  const onDragEnd = () => { setDragId(null); setOverId(null); };

  const scrollBy = (px) => scrollerRef.current?.scrollBy({ left: px, behavior: 'smooth' });

  return (
    <section className="mt-12 px-10 pb-2">
      <div className="flex items-end justify-between mb-5 max-w-[1400px] mx-auto">
        <div>
          <div className="label">Comece por uma ideia</div>
          <div className="text-[22px] tracking-tight font-medium text-ink-900 mt-1.5">Suas pistas favoritas</div>
          <div className="text-[12.5px] text-ink-500 mt-1">Clique para editar · arraste para reordenar · monte como faz sentido pra você</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => scrollBy(-340)} title="Anterior"
            className="h-9 w-9 rounded-full border-half bg-white text-ink-700 hover:text-ink-900 hover:bg-ink-100 flex items-center justify-center transition-colors">
            <Icon.ChevronLeft size={15}/>
          </button>
          <button onClick={() => scrollBy(340)} title="Próximo"
            className="h-9 w-9 rounded-full border-half bg-white text-ink-700 hover:text-ink-900 hover:bg-ink-100 flex items-center justify-center transition-colors">
            <Icon.ChevronRight size={15}/>
          </button>
          <button onClick={add}
            className="h-9 px-3 rounded-full border-half bg-white text-[12.5px] font-medium text-ink-900 hover:bg-ink-100 transition-colors inline-flex items-center gap-1.5 ml-1">
            <Icon.Plus size={13}/> Adicionar
          </button>
        </div>
      </div>

      <div className="relative -mx-10">
        <div className="absolute left-0 top-0 bottom-3 w-10 bg-gradient-to-r from-canvas to-transparent pointer-events-none z-10"/>
        <div className="absolute right-0 top-0 bottom-3 w-10 bg-gradient-to-l from-canvas to-transparent pointer-events-none z-10"/>
        <div ref={scrollerRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-10 px-10 pb-3 no-scrollbar">
          {items.map((s) => {
            const isDragging = dragId === s.id;
            const isOver = overId === s.id && dragId && dragId !== s.id;
            const isEditing = editing === s.id;
            return (
              <div key={s.id}
                draggable={!isEditing}
                onDragStart={onDragStart(s.id)}
                onDragOver={onDragOver(s.id)}
                onDrop={onDrop(s.id)}
                onDragEnd={onDragEnd}
                className={`group relative bg-white border-half rounded-2xl text-left overflow-hidden transition-all shrink-0 snap-start w-[260px]
                            ${isDragging ? 'opacity-40 scale-[.98]' : ''}
                            ${isOver ? 'ring-2 ring-brand-200 ring-offset-2 ring-offset-canvas' : 'hover:border-brand-200 hover:shadow-card'}
                            ${isEditing ? 'shadow-lift ring-1 ring-brand-200' : ''}`}>
                <SmartImg seed={`starter-${s.id}-${s.label.slice(0,10)}`} tone={s.tone} w={500} h={400} className="h-[170px] w-full"/>

                {!isEditing && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onMouseDown={(e)=>e.stopPropagation()} title="Arraste para reordenar"
                      className="h-7 w-7 rounded-md bg-white/95 border-half text-ink-700 hover:text-ink-900 flex items-center justify-center cursor-grab active:cursor-grabbing">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); startEdit(s); }} title="Editar"
                      className="h-7 w-7 rounded-md bg-white/95 border-half text-ink-700 hover:text-ink-900 flex items-center justify-center">
                      <Icon.Edit size={12}/>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); remove(s.id); }} title="Remover"
                      className="h-7 w-7 rounded-md bg-white/95 border-half text-ink-700 hover:text-ink-900 flex items-center justify-center">
                      <Icon.Trash size={12}/>
                    </button>
                  </div>
                )}

                <div className="p-4">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input autoFocus
                        value={draftLabel}
                        onChange={(e) => setDraftLabel(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
                        className="w-full h-9 px-2 rounded-md border-half text-[14px] font-medium text-ink-900 bg-white"
                        placeholder="Como você descreveria?"/>
                      <input
                        value={draftHint}
                        onChange={(e) => setDraftHint(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
                        className="w-full h-8 px-2 rounded-md border-half text-[12px] text-ink-700 bg-white"
                        placeholder="duração, vibe, ritmo…"/>
                      <div className="flex items-center justify-between pt-1">
                        <button onClick={() => setEditing(null)} className="text-[11.5px] text-ink-500 hover:text-ink-900">Cancelar</button>
                        <button onClick={commitEdit} className="text-[11.5px] font-medium text-ink-900 hover:underline">Salvar ↵</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => onPick(s.label)} className="w-full text-left">
                      <div className="text-[15px] font-medium text-ink-900 leading-tight">{s.label}</div>
                      <div className="text-[12px] text-ink-500 mt-1">{s.hint}</div>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <button onClick={add}
            className="border-half border-dashed rounded-2xl text-ink-500 hover:text-ink-900 hover:bg-ink-100/60 transition-colors flex flex-col items-center justify-center gap-2 shrink-0 snap-start w-[260px]">
            <div className="h-10 w-10 rounded-full bg-white border-half flex items-center justify-center"><Icon.Plus size={16}/></div>
            <div className="text-[13px] font-medium">Nova ideia</div>
            <div className="text-[10.5px] mono uppercase tracking-wider">arraste · edite · use</div>
          </button>
        </div>
      </div>
    </section>
  );
};


export { HomeScreen };
