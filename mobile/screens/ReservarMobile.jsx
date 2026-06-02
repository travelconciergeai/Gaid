// Mobile Reservar — full screen with segmented tabs at top.
// Renders the same FlightsMobile / HotelsMobile / ToursMobile content as before
// but inside a single tabbed shell so the user never leaves the "Reservar" tab.
//
// Tabs are sticky at the top under the device status bar. Default is "voos".

const ReservarMobile = ({ goTo, openChat, initialKind = 'voos' }) => {
  const [kind, setKind] = useState(initialKind);

  const tabs = [
    { id: 'voos',     label: 'Voos',     icon: Icon.Plane },
    { id: 'hoteis',   label: 'Hotéis',   icon: Icon.Bed },
    { id: 'passeios', label: 'Passeios', icon: Icon.Ticket },
  ];

  // Render the underlying screen but skip its own header — it will share the
  // ReservarMobile shell header. We pass `embedded` so internal screens can
  // collapse their own header padding.
  const Inner = (() => {
    switch (kind) {
      case 'voos':     return <FlightsMobile goTo={goTo} openChat={openChat} embedded/>;
      case 'hoteis':   return <HotelsMobile goTo={goTo} openChat={openChat} embedded/>;
      case 'passeios': return <ToursMobile goTo={goTo} openChat={openChat} embedded/>;
      default: return null;
    }
  })();

  return (
    <div className="relative pb-[112px]">
      {/* Shell header */}
      <header className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon.Logo size={22} className="text-ink-900"/>
          <span className="text-[15px] font-medium tracking-[-0.01em] text-ink-900">Gaid</span>
        </div>
        <button onClick={() => openChat('Quero ajuda pra reservar')}
          className="h-10 w-10 rounded-full active:bg-ink-100 flex items-center justify-center text-ink-700">
          <Icon.Sparkles size={18}/>
        </button>
      </header>

      {/* Title */}
      <section className="px-5 pt-2 pb-5">
        <div className="label">Reservar</div>
        <h1 className="text-[28px] tracking-[-0.025em] font-medium text-ink-900 leading-[1.06] mt-2">
          O que vamos <span className="serif-i">marcar?</span>
        </h1>
      </section>

      {/* Segmented tabs */}
      <section className="px-5 pb-2">
        <div className="bg-ink-100 rounded-2xl p-1 grid grid-cols-3 gap-0.5">
          {tabs.map(t => {
            const TI = t.icon;
            const active = kind === t.id;
            return (
              <button key={t.id} onClick={() => setKind(t.id)}
                className={`h-11 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[.98]
                            ${active ? 'bg-paper text-ink-900 shadow-soft' : 'text-ink-600'}`}>
                <TI size={14}/>
                <span className="text-[13px] font-medium leading-none">{t.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Content */}
      <div className="fade-up" key={kind}>
        {Inner}
      </div>
    </div>
  );
};

window.ReservarMobile = ReservarMobile;
