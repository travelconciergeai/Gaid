// Mobile Profile — hub for personal settings, plans, miles, wallet etc.
// Replaces the old "Mais" tab. Surfaces the user identity at the top and
// lists secondary destinations as a clean navigation menu.

const ProfileMobile = ({ goTo, openChat }) => {
  const u = mockData.user;

  const sections = [
    {
      title: 'Sua Gaid',
      items: [
        { id: 'wallet',  label: 'Wallet',     desc: `${u.cards} cartões`,              icon: Icon.Wallet,   to: 'wallet' },
        { id: 'miles',   label: 'Milhas',     desc: `${u.miles.toLocaleString('pt-BR')} pts`, icon: Icon.Coins, to: 'miles' },
        { id: 'experts', label: 'Experts',    desc: `${mockData.experts.length} especialistas`, icon: Icon.Users, to: 'experts' },
      ],
    },
    {
      title: 'Conta',
      items: [
        { id: 'plans',    label: 'Planos',          desc: u.tier,                   icon: Icon.Award,    to: 'plans' },
        { id: 'profile',  label: 'Dados pessoais',  desc: 'Nome, documento, e-mail', icon: Icon.Edit,     action: 'profile' },
        { id: 'security', label: 'Segurança',       desc: 'Senha, 2FA, dispositivos', icon: Icon.Shield,   action: 'security' },
        { id: 'notif',    label: 'Notificações',    desc: 'Alertas e e-mails',       icon: Icon.Bell,     action: 'notif' },
      ],
    },
    {
      title: 'Suporte',
      items: [
        { id: 'chat',     label: 'Falar com a Gaid', desc: 'Chat com a IA',          icon: Icon.Sparkles, action: 'chat' },
        { id: 'about',    label: 'Sobre',            desc: 'Privacidade, termos',     icon: Icon.Info,     action: 'about' },
      ],
    },
  ];

  return (
    <div className="relative pb-[112px]">
      <header className="px-5 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon.Logo size={22} className="text-ink-900"/>
          <span className="text-[15px] font-medium tracking-[-0.01em] text-ink-900">Gaid</span>
        </div>
        <button className="h-10 w-10 rounded-full active:bg-ink-100 flex items-center justify-center text-ink-700">
          <Icon.Settings size={18}/>
        </button>
      </header>

      {/* Identity card */}
      <section className="px-5 pt-8 pb-8">
        <div className="flex items-center gap-4">
          <Portrait id={5} alt={u.name} className="h-16 w-16 rounded-full ring-1 ring-ink-200"/>
          <div className="flex-1 min-w-0">
            <div className="text-[20px] font-medium tracking-tight text-ink-900 leading-tight truncate">{u.name}</div>
            <div className="text-[12.5px] text-ink-500 mt-1 flex items-center gap-1.5">
              <Icon.Award size={11}/>{u.tier}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          <ProfileStat value={u.trips} label="viagens"/>
          <ProfileStat value={u.cards} label="cartões"/>
          <ProfileStat value={Math.round(u.miles/1000)+'k'} label="milhas"/>
        </div>
      </section>

      {/* Sections */}
      {sections.map(s => (
        <section key={s.title} className="px-5 pb-5">
          <div className="label mb-3 px-1">{s.title}</div>
          <div className="bg-white border-half rounded-2xl divide-y hairline overflow-hidden">
            {s.items.map(item => {
              const Ic = item.icon;
              return (
                <button key={item.id}
                  onClick={() => {
                    if (item.to) goTo(item.to);
                    else if (item.action === 'chat') openChat('');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-ink-50 transition-colors text-left">
                  <div className="h-9 w-9 rounded-lg bg-ink-100 text-ink-900 flex items-center justify-center shrink-0">
                    <Ic size={15}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium text-ink-900 leading-tight">{item.label}</div>
                    <div className="text-[11.5px] text-ink-500 mt-0.5 truncate">{item.desc}</div>
                  </div>
                  <Icon.ChevronRight size={14} className="text-ink-400 shrink-0"/>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {/* Sign out */}
      <section className="px-5 pt-4">
        <button className="w-full bg-white border-half rounded-2xl py-3.5 text-[13px] text-ink-700 font-medium active:bg-ink-50 transition-colors">
          Sair da conta
        </button>
        <div className="text-center text-[10px] text-ink-400 mt-4 mono uppercase tracking-wider">Gaid · v1.0</div>
      </section>
    </div>
  );
};

const ProfileStat = ({ value, label }) => (
  <div className="bg-ink-50 rounded-xl px-3 py-2.5 text-center">
    <div className="text-[18px] font-medium text-ink-900 mono leading-none">{value}</div>
    <div className="text-[10px] text-ink-500 mt-1.5 uppercase tracking-wider">{label}</div>
  </div>
);

// ============ Reservar Sheet ============
// Bottom sheet triggered by the "+" Reservar tab. Lets user pick between
// flights, hotels and tours — then navigates into the selected screen.
const ReservarSheet = ({ open, onClose, onPick }) => {
  const options = [
    { id: 'flights', label: 'Voos',     desc: 'Comparar preço, milhas e horário', icon: Icon.Plane },
    { id: 'hotels',  label: 'Hotéis',   desc: 'Gaid Collection · perks aplicados', icon: Icon.Bed },
    { id: 'tours',   label: 'Passeios', desc: 'Experiências curadas por experts',  icon: Icon.Ticket },
  ];
  return (
    <BottomSheet open={open} onClose={onClose} title="O que vamos reservar?" height="50vh">
      <div className="px-3 pt-2 pb-6 space-y-1.5">
        {options.map(o => {
          const Ic = o.icon;
          return (
            <button key={o.id} onClick={() => onPick(o.id)}
              className="w-full bg-white border-half rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left active:bg-ink-50 transition-colors">
              <div className="h-11 w-11 rounded-xl bg-ink-100 text-ink-900 flex items-center justify-center shrink-0">
                <Ic size={17}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14.5px] font-medium text-ink-900 leading-tight">{o.label}</div>
                <div className="text-[11.5px] text-ink-500 mt-0.5">{o.desc}</div>
              </div>
              <Icon.ArrowRight size={14} className="text-ink-400 shrink-0"/>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
};

window.ProfileMobile = ProfileMobile;
window.ReservarSheet = ReservarSheet;
