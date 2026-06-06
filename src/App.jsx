import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { Sidebar, CmdPalette, ToastProvider } from './components/ui.jsx';
import { MobileShell } from './components/layout/MobileShell.jsx';
import { SessionProvider, ActiveTripProvider, TripStoreProvider, useAccount, useActiveTrip, useTripStore, useActiveTripDetail } from './core/store.jsx';
import './core/editorial.jsx';
import { LoginDesktop, OnboardingDesktop } from './screens/AuthScreens.jsx';
import { HomeVNext } from './screens/HomeVNext.jsx';
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
          <HomeVNext setRoute={setRoute} />
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
      case 'experts':
        return <HomeVNext setRoute={setRoute} />;
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
      case 'hotels':
      case 'tours':
      case 'plans':
        return <ExploreScreen setRoute={setRoute} />;
      case 'profile':
        return <ProfileScreen setRoute={setRoute} />;
      default:
        return (
          <HomeVNext setRoute={setRoute} />
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
