import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '../components/icons.jsx';
import { Placeholder, Button, Tag, Card, Modal, Drawer, SmartImg, Portrait, useToast, Topbar, SectionHeader, Stat, TabRow, OptimizeMenu, AddToTripDrawer } from '../components/ui.jsx';
import { EmptyState, EmptyInline } from './EmptyStates.jsx';
import { Async, CardSkeleton, CatalogCarousel, Carousel, Skeleton, ErrorState, CarouselSkeleton } from '../core/states.jsx';
import { useAccount, useTrips, useCatalog, deriveTraits, profileCompletion } from '../core/store.jsx';
import { TBD, has, orTBD, fmtDuration, fmtMoney } from '../core/contracts.jsx';
// Profile — desktop. Wide-canvas version of the mobile profile hub.
// Layout: identity banner spanning the top, then a 2-column grid where the
// left rail holds account/support menus and the right surfaces "Sua Gaid"
// shortcuts as richer cards (wallet, miles, experts, plan).

const ProfileScreen = ({ setRoute }) => {
  const acct = useAccount();
  const u = acct.user;
  const traits = deriveTraits(acct.profile);
  const completion = profileCompletion(acct.profile);
  const { summaries } = useTrips();
  const expertsQ = useCatalog('experts');
  const tripCount = summaries.length;
  const cardCount = (acct.cards || []).length;
  const expertCount = (expertsQ.data || []).length;
  const toast = useToast();

  const accountItems = [
    { id: 'profile',  label: 'Dados pessoais',  desc: 'Nome, documento, e-mail',   icon: Icon.Edit },
    { id: 'security', label: 'Segurança',       desc: 'Senha, 2FA, dispositivos',  icon: Icon.Shield },
    { id: 'notif',    label: 'Notificações',    desc: 'Alertas e e-mails',         icon: Icon.Bell },
    { id: 'prefs',    label: 'Preferências de viagem', desc: 'Estilo, destinos, orçamento', icon: Icon.Sliders },
  ];
  const supportItems = [
    { id: 'about', label: 'Sobre a Gaid',  desc: 'Privacidade, termos', icon: Icon.Info },
    { id: 'help',  label: 'Central de ajuda', desc: 'Dúvidas frequentes', icon: Icon.Sparkles },
  ];

  return (
    <div className="min-h-screen">
      <Topbar subtitle="Gaid · Perfil" title="Sua conta"
        right={<Button variant="secondary" icon={Icon.Settings}>Configurações</Button>}/>

      <div className="px-10 pb-14">
        {/* Identity banner */}
        <Card className="overflow-hidden mb-6">
          <div className="px-8 pt-8 pb-7">
            <div className="flex items-center gap-5">
              <div className="h-24 w-24 rounded-full ring-1 ring-ink-200 shadow-lift shrink-0 overflow-hidden bg-ink-100 flex items-center justify-center">
                {u.avatar
                  ? <img src={u.avatar} alt={u.name} className="h-full w-full object-cover img-grayscale"/>
                  : <span className="text-[30px] font-medium text-ink-500">{(u.firstName || 'V').slice(0,1).toUpperCase()}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[24px] font-medium tracking-tight text-ink-900 leading-tight">{u.name || 'Sua conta'}</div>
                <div className="text-[13px] text-ink-500 mt-1 flex items-center gap-1.5">
                  <Icon.Award size={12}/> {u.tier}{u.handle ? ` · ${u.handle}` : (u.email ? ` · ${u.email}` : '')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" icon={Icon.Edit} onClick={() => acct.editProfile()}>Editar perfil</Button>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-4 mt-7 pt-7 border-t hairline">
              <ProfileStatD value={tripCount} label="Viagens" hint={tripCount ? 'no seu histórico' : 'comece a planejar'}/>
              <ProfileStatD value={cardCount} label="Cartões" hint={cardCount ? 'na carteira' : 'nenhum conectado'}/>
              <ProfileStatD value={u.miles.toLocaleString('pt-BR')} label="Milhas" hint={u.miles ? '+12% no mês' : 'conecte programas'}/>
              <ProfileStatD value={expertCount} label="Experts" hint="à sua disposição"/>
            </div>
          </div>
        </Card>

        {/* Two-column body */}
        <div className="grid grid-cols-[1.4fr_1fr] gap-6">
          {/* LEFT: Sua Gaid shortcut cards */}
          <div>
            <SectionHeader eyebrow="Sua Gaid" title="Acesso rápido"/>
            <div className="grid grid-cols-2 gap-4">
              <ShortcutCard tone="ink" icon={Icon.Wallet} title="Wallet"
                value={cardCount ? `${cardCount} ${cardCount === 1 ? 'cartão' : 'cartões'}` : 'Vazia'} desc="Salas VIP, seguros e melhor cartão por compra"
                onClick={() => setRoute('wallet')}/>
              <ShortcutCard tone="cool" icon={Icon.Coins} title="Milhas"
                value={u.miles ? `${u.miles.toLocaleString('pt-BR')} pts` : 'Conectar'} desc="Otimizador e transferências com bônus"
                onClick={() => setRoute('miles')}/>
              <ShortcutCard tone="warm" icon={Icon.Users} title="Experts"
                value={`${expertCount} especialistas`} desc="Pessoas que assinam seus roteiros"
                onClick={() => setRoute('experts')}/>
              <ShortcutCard tone="sage" icon={Icon.Award} title="Plano"
                value={u.tier} desc="Gerencie sua assinatura Gaid"
                onClick={() => setRoute('plans')}/>
            </div>

            {/* Travel profile summary */}
            <div className="mt-6">
              <SectionHeader eyebrow="Perfil de viagem" title="Como você viaja"
                action={traits ? <Button variant="ghost" size="sm" icon={Icon.Edit} onClick={() => acct.editProfile()}>Editar</Button> : null}/>
              {traits ? (
                <Card className="divide-y hairline overflow-hidden">
                  {traits.map(t => <ProfileTrait key={t.key} icon={Icon[t.icon] || Icon.Sparkles} label={t.label} chips={t.chips}/>)}
                </Card>
              ) : (
                <EmptyState
                  icon={Icon.Sliders}
                  title="Conte como você gosta de viajar"
                  desc="Responda algumas perguntas rápidas e a Gaid passa a sugerir destinos, hotéis e roteiros com a sua cara."
                  primary={<Button icon={Icon.Sparkles} onClick={() => acct.editProfile()}>Completar perfil</Button>}
                  className="py-10"
                />
              )}
            </div>
          </div>

          {/* RIGHT: account + support menus */}
          <div className="space-y-6">
            <div>
              <SectionHeader eyebrow="Conta" title="Configurações"/>
              <Card className="divide-y hairline overflow-hidden">
                {accountItems.map(it => <MenuRow key={it.id} item={it} onClick={() => toast({ title: it.label })}/>)}
              </Card>
            </div>

            <div>
              <SectionHeader eyebrow="Suporte" title="Ajuda"/>
              <Card className="divide-y hairline overflow-hidden">
                {supportItems.map(it => <MenuRow key={it.id} item={it} onClick={() => toast({ title: it.label })}/>)}
              </Card>
            </div>

            <button onClick={() => toast({ title: 'Você saiu da conta' })}
              className="w-full bg-white border hairline rounded-2xl py-3.5 text-[13px] text-ink-700 font-medium hover:bg-ink-50 transition-colors">
              Sair da conta
            </button>
            <div className="text-center text-[10.5px] text-ink-400 mono uppercase tracking-wider">Gaid · v1.0</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileStatD = ({ value, label, hint }) => (
  <div>
    <div className="label">{label}</div>
    <div className="text-[24px] tracking-tight font-medium text-ink-900 leading-none mt-1.5">{value}</div>
    <div className="text-[11.5px] text-ink-500 mt-1">{hint}</div>
  </div>
);

const ShortcutCard = ({ tone, icon: Ic, title, value, desc, onClick }) => (
  <button onClick={onClick} className="bg-white border hairline rounded-2xl p-5 text-left card-h">
    <div className="flex items-center justify-between">
      <div className="h-10 w-10 rounded-xl bg-ink-100 text-ink-900 flex items-center justify-center"><Ic size={18}/></div>
      <Icon.ArrowUpRight size={16} className="text-ink-400"/>
    </div>
    <div className="text-[15px] font-medium text-ink-900 mt-4">{title}</div>
    <div className="text-[13px] text-ink-700 mt-0.5">{value}</div>
    <div className="text-[11.5px] text-ink-500 mt-2 leading-snug">{desc}</div>
  </button>
);

const ProfileTrait = ({ icon: Ic, label, chips }) => (
  <div className="px-6 py-4">
    <div className="flex items-center gap-2.5 mb-2.5">
      <Ic size={15} className="text-ink-400 shrink-0"/>
      <span className="label">{label}</span>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {chips.length
        ? chips.map(c => <span key={c} className="text-[12px] px-3 h-7 rounded-full bg-ink-100 text-ink-800 flex items-center whitespace-nowrap">{c}</span>)
        : <span className="text-[12.5px] text-ink-400 h-7 flex items-center">— não informado</span>}
    </div>
  </div>
);

const MenuRow = ({ item, onClick }) => {
  const Ic = item.icon;
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-ink-50 transition-colors text-left">
      <div className="h-9 w-9 rounded-lg bg-ink-100 text-ink-900 flex items-center justify-center shrink-0"><Ic size={15}/></div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium text-ink-900 leading-tight">{item.label}</div>
        <div className="text-[11.5px] text-ink-500 mt-0.5">{item.desc}</div>
      </div>
      <Icon.ChevronRight size={15} className="text-ink-400 shrink-0"/>
    </button>
  );
};


export { ProfileScreen };
