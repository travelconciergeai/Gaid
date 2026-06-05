import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { Sidebar, CmdPalette, ToastProvider } from './components/ui.jsx';
import { MobileShell } from './components/layout/MobileShell.jsx';
import { SessionProvider, ActiveTripProvider, TripStoreProvider, useAccount, useActiveTrip, useTripStore, useActiveTripDetail } from './core/store.jsx';
import './core/editorial.jsx';
import { LoginDesktop, OnboardingDesktop } from './screens/AuthScreens.jsx';
import { HomeScreen } from './screens/HomeScreen.jsx';
import { PlanScreen } from './screens/PlanScreen.jsx';
import { ExploreScreen } from './screens/ExploreScreen.jsx';
import { TripsScreen } from './screens/TripsScreen.jsx';
import { ProfileScreen } from './screens/ProfileScreen.jsx';

const AppShell = () => {
  const acct = useAccount();
  const { activeTripId, setActiveTripId } = useActiveTrip();
  const store = useTripStore();
  const { trip: activeTrip } = useActiveTripDetail();
  const [route, setRoute] = useState('home');
  const [cmdOpen, setCmdOpen] = useState(false);
  const [planKickoff, setPlanKickoff] = useState(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  const kickoffPlan = (input) => {
    const payload = typeof input === 'object' && input !== null ? input : { prompt: input };
    setPlanKickoff(payload.prompt || '');
    return Promise.resolve(store.createTrip(payload)).then((trip) => {
      if (trip && trip.id) setActiveTripId(trip.id);
      return trip;
    });
  };

  const screen = (() => {
    switch (route) {
      case 'home':
        return (
          <HomeScreen
            setRoute={setRoute}
            kickoffPlan={kickoffPlan}
            activeTrip={activeTrip}
            setActiveTripId={setActiveTripId}
          />
        );
      case 'plan':
        return (
          <PlanScreen
            setRoute={setRoute}
            kickoff={planKickoff}
            clearKickoff={() => setPlanKickoff(null)}
            trip={activeTrip}
          />
        );
      case 'wallet':
      case 'miles':
        return <FutureSurface setRoute={setRoute} title="Carteira e milhas em breve" />;
      case 'experts':
        return <FutureSurface setRoute={setRoute} title="Experts em breve" />;
      case 'explore':
        return (
          <ExploreScreen
            setRoute={setRoute}
          />
        );
      case 'trips':
        return (
          <TripsScreen
            setRoute={setRoute}
            activeTripId={activeTripId}
            setActiveTripId={setActiveTripId}
          />
        );
      case 'flights':
        return <FutureSurface setRoute={setRoute} title="Voos em breve" />;
      case 'hotels':
        return <FutureSurface setRoute={setRoute} title="Hotéis em breve" />;
      case 'tours':
        return <FutureSurface setRoute={setRoute} title="Passeios em breve" />;
      case 'plans':
        return <FutureSurface setRoute={setRoute} title="Planos em breve" />;
      case 'profile':
        return <ProfileScreen setRoute={setRoute} />;
      default:
        return (
          <HomeScreen
            setRoute={setRoute}
            kickoffPlan={kickoffPlan}
            activeTrip={activeTrip}
            setActiveTripId={setActiveTripId}
          />
        );
    }
  })();

  if (!acct.authed) {
    return <LoginDesktop onAuthed={({ email, password }) => acct.login({ email, password })} />;
  }
  if (acct.needsOnboarding) {
    return (
      <OnboardingDesktop
        initial={acct.profile}
        onDone={(prof) => {
          acct.finishOnboarding(prof);
          setRoute('home');
        }}
      />
    );
  }

  return (
    <>
      <div className="hidden lg:flex bg-canvas min-h-screen">
        <Sidebar route={route} setRoute={setRoute} openCmd={() => setCmdOpen(true)} />
        <main className="flex-1 min-w-0 min-h-screen">{screen}</main>
      </div>
      <MobileShell route={route} setRoute={setRoute} planMode={route === 'plan'}>
        {screen}
      </MobileShell>
      <CmdPalette open={cmdOpen} onClose={() => setCmdOpen(false)} setRoute={setRoute} />
    </>
  );
};

const FutureSurface = ({ setRoute, title }) => (
  <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-10 py-12 bg-canvas">
    <div className="w-full max-w-[560px] bg-white border-half rounded-3xl shadow-card p-6 sm:p-8 text-center">
      <div className="label mb-3">Em breve</div>
      <h1 className="text-[26px] sm:text-[32px] tracking-tight font-medium text-ink-900 leading-tight">{title}</h1>
      <p className="text-[14px] sm:text-[15px] text-ink-600 mt-4 leading-relaxed">
        Essa área será importante para a Gaid, mas neste MVP estamos focando primeiro em roteiros, dicas inteligentes e edição de itinerário por conversa.
      </p>
      <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2">
        <button onClick={() => setRoute('home')}
          className="h-11 px-5 rounded-full bg-ink-900 text-paper text-[13.5px] font-medium hover:bg-brand-700 transition-colors">
          Voltar ao Início
        </button>
        <button onClick={() => setRoute('explore')}
          className="h-11 px-5 rounded-full border-half bg-white text-ink-800 text-[13.5px] font-medium hover:border-brand-200 hover:bg-brand-50 transition-colors">
          Ver Dicas
        </button>
      </div>
    </div>
  </div>
);

const App = () => (
  <ErrorBoundary>
    <SessionProvider>
      <ActiveTripProvider>
        <TripStoreProvider>
          <ToastProvider>
            <AppShell />
          </ToastProvider>
        </TripStoreProvider>
      </ActiveTripProvider>
    </SessionProvider>
  </ErrorBoundary>
);

export default App;
