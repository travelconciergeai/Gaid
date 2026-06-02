// Mobile app shell.

const App = () => {
  const [authed, setAuthed] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('home');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSeed, setChatSeed] = useState('');
  const [activeTripId, setActiveTripId] = useState('trip-lisboa-porto');
  const tripFor = (id) => {
    const meta = mockData.trips.find(t => t.id === id);
    return meta && mockData[meta.dataKey] ? mockData[meta.dataKey] : mockData.trip;
  };
  const activeTrip = tripFor(activeTripId);

  const goTo = (t) => setTab(t);
  const openChat = (seed = '') => { setChatSeed(seed); setChatOpen(true); };
  const closeChat = (navigate) => { setChatOpen(false); setChatSeed(''); if (navigate) setTab(navigate); };

  const screen = (() => {
    switch (tab) {
      case 'home':     return <HomeMobile goTo={goTo} openChat={openChat}/>;
      case 'trips':    return <TripsMobile goTo={goTo} openChat={openChat} setActiveTripId={setActiveTripId}/>;
      case 'plan':     return <PlanMobile goTo={goTo} trip={activeTrip} openChat={openChat}/>;
      case 'reservar': return <ReservarMobile goTo={goTo} openChat={openChat}/>;
      case 'experts':  return <ExpertsMobile goTo={goTo}/>;
      case 'flights':  return <FlightsMobile goTo={goTo} openChat={openChat}/>;
      case 'hotels':   return <HotelsMobile goTo={goTo} openChat={openChat}/>;
      case 'tours':    return <ToursMobile goTo={goTo} openChat={openChat}/>;
      case 'wallet':   return <WalletMobile goTo={goTo} openChat={openChat}/>;
      case 'miles':    return <MilesMobile goTo={goTo} openChat={openChat}/>;
      case 'plans':    return <PlansMobile goTo={goTo} openChat={openChat}/>;
      case 'profile':  return <ProfileMobile goTo={goTo} openChat={openChat}/>;
      default:
        return <div className="h-full flex items-center justify-center text-center px-6 text-ink-500 text-[13px]">Em construção</div>;
    }
  })();

  return (
    <ToastProvider>
      <div className="min-h-screen flex items-start justify-center py-8 px-4 bg-ink-100/80">
        <IOSDevice>
          {!authed ? (
            <div className="relative h-full w-full bg-paper overflow-hidden">
              <div className="absolute inset-0 pt-[44px]">
                <LoginMobile onAuthed={({ isNew }) => { setAuthed(true); setNeedsOnboarding(isNew); setTab('home'); }}/>
              </div>
            </div>
          ) : needsOnboarding ? (
            <div className="relative h-full w-full bg-paper overflow-hidden">
              <div className="absolute inset-0 pt-[44px]">
                <OnboardingMobile onDone={(prof) => { setProfile(prof); setNeedsOnboarding(false); setTab('home'); }}/>
              </div>
            </div>
          ) : (
          <div className="relative h-full w-full bg-canvas overflow-hidden">
            <div className="absolute inset-0 pt-[44px] overflow-y-auto no-scrollbar">
              {screen}
            </div>
            <TabBar tab={tab} setTab={setTab} userPortraitId={5}/>

            {/* Floating concierge button — available everywhere except the
                roteiro (which has its own chat) and while the chat is open. */}
            {!chatOpen && tab !== 'plan' && tab !== 'home' && (
              <button onClick={() => openChat('')}
                aria-label="Falar com a Gaid"
                className="absolute right-4 z-30 h-14 w-14 rounded-full bg-ink-900 text-paper shadow-pop flex items-center justify-center active:scale-95 transition-transform"
                style={{ bottom: '96px' }}>
                <span className="absolute inset-0 rounded-full ring-1 ring-ink-900/20 animate-ping" style={{ animationDuration: '2.4s' }}/>
                <Icon.Sparkles size={22}/>
              </button>
            )}

            {chatOpen && (
              <ChatSheet seed={chatSeed}
                onClose={() => closeChat()}
                onComplete={() => closeChat('plan')}
                setActiveTripId={setActiveTripId}/>
            )}
          </div>
          )}
        </IOSDevice>
      </div>
    </ToastProvider>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
