import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { Sidebar, CmdPalette, ToastProvider } from './components/ui.jsx';
import { MobileShell } from './components/layout/MobileShell.jsx';
import { SessionProvider, ActiveTripProvider, TripStoreProvider, useAccount, useActiveTrip, useTripStore, useActiveTripDetail } from './core/store.jsx';
import './core/editorial.jsx';
import { LoginDesktop, OnboardingDesktop } from './screens/AuthScreens.jsx';
import { HomeScreen } from './screens/HomeScreen.jsx';
import { PlanScreen } from './screens/PlanScreen.jsx';
import { WalletScreen } from './screens/WalletScreen.jsx';
import { MilesScreen } from './screens/MilesScreen.jsx';
import { ExpertsScreen } from './screens/ExpertsScreen.jsx';
import { ExploreScreen } from './screens/ExploreScreen.jsx';
import { TripsScreen } from './screens/TripsScreen.jsx';
import { FlightsScreen } from './screens/FlightsScreen.jsx';
import { HotelsScreen } from './screens/HotelsScreen.jsx';
import { ToursScreen } from './screens/ToursScreen.jsx';
import { PlansScreen } from './screens/PlansScreen.jsx';
import { ProfileScreen } from './screens/ProfileScreen.jsx';

const AppShell = () => {
  const acct = useAccount();
  const { activeTripId, setActiveTripId } = useActiveTrip();
  const store = useTripStore();
  const { trip: activeTrip } = useActiveTripDetail();
  const [route, setRoute] = useState('home');
  const [cmdOpen, setCmdOpen] = useState(false);
  const [planKickoff, setPlanKickoff] = useState(null);
  const [expertToOpen, setExpertToOpen] = useState(null);

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
        return <WalletScreen setRoute={setRoute} />;
      case 'miles':
        return <MilesScreen setRoute={setRoute} />;
      case 'experts':
        return (
          <ExpertsScreen
            setRoute={setRoute}
            initialOpen={expertToOpen}
            clearInitialOpen={() => setExpertToOpen(null)}
          />
        );
      case 'explore':
        return (
          <ExploreScreen
            setRoute={setRoute}
            openExpertProfile={(id) => setExpertToOpen(id)}
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
        return <FlightsScreen setRoute={setRoute} />;
      case 'hotels':
        return <HotelsScreen setRoute={setRoute} />;
      case 'tours':
        return <ToursScreen setRoute={setRoute} />;
      case 'plans':
        return <PlansScreen setRoute={setRoute} />;
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
