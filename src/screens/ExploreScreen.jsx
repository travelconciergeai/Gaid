import React from 'react';
import { Icon } from '../components/icons.jsx';
import { Button, Card, Tag, Topbar } from '../components/ui.jsx';
import { useAccount } from '../core/store.jsx';

const TIP_SECTIONS = [
  {
    id: 'match',
    title: 'Roteiros que combinam com você',
    cards: [
      {
        title: 'Lisboa com gastronomia e bairros caminháveis',
        destination: 'Lisboa',
        duration: '5 dias',
        reason: 'Boa para quem quer cultura, comida e deslocamentos simples.',
        cta: 'Criar roteiro',
        prompt: 'Quero montar um roteiro para Lisboa com gastronomia e bairros caminháveis por 5 dias',
      },
      {
        title: 'Bogotá cultural com cafés especiais',
        destination: 'Bogotá',
        duration: '4 dias',
        reason: 'Mistura museus, cafés e uma base urbana confortável.',
        cta: 'Criar roteiro',
        prompt: 'Quero montar um roteiro para Bogotá com cultura e cafés especiais por 4 dias',
      },
      {
        title: 'Paris sem correria',
        destination: 'Paris',
        duration: '6 dias',
        reason: 'Clássicos, bons restaurantes e pausas para aproveitar melhor.',
        cta: 'Criar roteiro',
        prompt: 'Quero montar um roteiro para Paris sem correria por 6 dias',
      },
    ],
  },
  {
    id: 'style',
    title: 'Experiências para o seu estilo',
    cards: [
      {
        title: 'Jantar especial em uma viagem a dois',
        destination: 'Paris',
        duration: 'Noite',
        reason: 'Uma dica rápida para decidir onde encaixar uma experiência romântica.',
        cta: 'Ver detalhes',
        prompt: 'Onde jantar em Paris em uma viagem romântica?',
      },
      {
        title: 'Museu bom para dia de chuva',
        destination: 'Rio de Janeiro',
        duration: '2h',
        reason: 'Plano coberto, fácil de encaixar e útil para replanejar o dia.',
        cta: 'Ver detalhes',
        prompt: 'O que fazer no Rio com chuva?',
      },
      {
        title: 'Café autoral para pausa no roteiro',
        destination: 'Bogotá',
        duration: '1h',
        reason: 'Funciona como respiro entre atrações sem virar textão de busca.',
        cta: 'Ver detalhes',
        prompt: 'Me indica um café em Bogotá',
      },
    ],
  },
  {
    id: 'weekend',
    title: 'Ideias para o fim de semana',
    cards: [
      {
        title: 'Fim de semana em São Paulo com comida boa',
        destination: 'São Paulo',
        duration: '3 dias',
        reason: 'Restaurantes, bairros e pausas culturais sem depender de reservas complexas.',
        cta: 'Criar roteiro',
        prompt: 'Quero montar um roteiro de fim de semana em São Paulo com gastronomia',
      },
      {
        title: 'Rio leve: praia, vista e jantar',
        destination: 'Rio de Janeiro',
        duration: '3 dias',
        reason: 'Uma primeira versão curta, bonita e fácil de ajustar pelo chat.',
        cta: 'Criar roteiro',
        prompt: 'Quero montar um roteiro de 3 dias no Rio com praia, vista e jantar',
      },
      {
        title: 'Porto com vinho e centro histórico',
        destination: 'Porto',
        duration: '3 dias',
        reason: 'Boa para uma escapada com cultura, comida e pouco deslocamento.',
        cta: 'Criar roteiro',
        prompt: 'Quero montar um roteiro de 3 dias no Porto com vinho e centro histórico',
      },
    ],
  },
];

const ExploreScreen = ({ setRoute }) => {
  const acct = useAccount();
  const interests = acct.profile?.preferences?.interests || acct.profile?.travelStyles || [];
  const profileHint = Array.isArray(interests) && interests.length > 0
    ? `Usando seu perfil: ${interests.slice(0, 3).join(', ')}.`
    : 'Complete seu perfil para a Gaid personalizar melhor essas ideias.';

  return (
    <div className="min-h-screen">
      <Topbar
        subtitle="Gaid · Dicas"
        title="Dicas para você"
        right={<Button variant="secondary" icon={Icon.Sparkles} onClick={() => setRoute('home')}>Pedir uma dica</Button>}
      />

      <div className="px-4 sm:px-6 lg:px-10 pb-14 space-y-8">
        <section className="bg-white border-half rounded-3xl p-5 sm:p-6 lg:p-8">
          <Tag tone="brand"><Icon.Compass size={11}/> MVP</Tag>
          <h2 className="text-[24px] sm:text-[30px] tracking-tight font-medium text-ink-900 mt-4 leading-tight">
            Recomendações simples, contextuais e prontas para virar decisão.
          </h2>
          <p className="text-[14px] text-ink-600 mt-3 leading-relaxed max-w-[680px]">
            A Gaid usa seu onboarding, contexto da conversa e conhecimento interno para sugerir roteiros e experiências. Integrações de mapas, hotéis e voos ficam para depois.
          </p>
          <div className="text-[12.5px] text-ink-500 mt-4">{profileHint}</div>
        </section>

        {TIP_SECTIONS.map(section => (
          <section key={section.id}>
            <div className="flex items-end justify-between gap-4 mb-4">
              <h2 className="text-[19px] tracking-tight font-medium text-ink-900">{section.title}</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:mx-0 sm:px-0 sm:overflow-visible">
              {section.cards.map(card => (
                <TipCard key={card.title} card={card} setRoute={setRoute}/>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

const TipCard = ({ card, setRoute }) => (
  <Card className="p-5 min-w-[280px] sm:min-w-0 h-full flex flex-col">
    <div className="flex items-start justify-between gap-3">
      <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
        <Icon.MapPin size={16}/>
      </div>
      <div className="text-[11px] text-ink-500 whitespace-nowrap">{card.duration}</div>
    </div>
    <div className="text-[10.5px] uppercase tracking-wider text-ink-500 mt-5">{card.destination}</div>
    <div className="text-[16px] font-medium tracking-tight text-ink-900 mt-1 leading-snug">{card.title}</div>
    <div className="text-[13px] text-ink-600 mt-3 leading-relaxed flex-1">{card.reason}</div>
    <button
      onClick={() => setRoute('home')}
      className="mt-5 h-9 px-3 rounded-full bg-ink-900 text-paper text-[12.5px] font-medium hover:bg-brand-700 transition-colors inline-flex items-center justify-center gap-1.5 self-start">
      {card.cta} <Icon.ArrowRight size={12}/>
    </button>
  </Card>
);

export { ExploreScreen };
