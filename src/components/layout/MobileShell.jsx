import React, { useState } from 'react';
import { Icon } from '../icons.jsx';
import { GaidLogo } from '../ui.jsx';
import { useAccount } from '../../core/store.jsx';

const PRIMARY_TABS = [
  { id: 'home', label: 'Início', icon: Icon.Home },
  { id: 'trips', label: 'Viagens', icon: Icon.Calendar },
  { id: 'explore', label: 'Explorar', icon: Icon.Compass },
  { id: 'experts', label: 'Experts', icon: Icon.Users },
];

const RESERVE_ITEMS = [
  { id: 'flights', label: 'Voos', icon: Icon.Plane },
  { id: 'hotels', label: 'Hotéis', icon: Icon.Bed },
  { id: 'tours', label: 'Passeios', icon: Icon.Ticket },
];

const MobileTabBar = ({ route, setRoute, onReserve }) => {
  const acct = useAccount();
  const u = acct.user;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden pointer-events-none"
      aria-label="Navegação principal">
      <div className="h-10 bg-gradient-to-t from-canvas via-canvas/80 to-transparent"/>
      <div className="px-3 pb-[max(12px,env(safe-area-inset-bottom))] pointer-events-auto">
        <div
          className="bg-white/[0.92] backdrop-blur-xl border-half rounded-[22px] px-1 py-1 flex items-center gap-0.5 shadow-lift"
          style={{ boxShadow: '0 8px 32px -12px oklch(0.2 0.01 250 / 0.18)' }}>
          {PRIMARY_TABS.map((t) => {
            const TI = t.icon;
            const active = route === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setRoute(t.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[52px] rounded-[18px] transition-colors active:scale-[0.98]
                  ${active ? 'bg-ink-900 text-paper' : 'text-ink-600'}`}>
                <TI size={active ? 18 : 17}/>
                <span className="text-[10px] font-medium tracking-wide">{t.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={onReserve}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[52px] rounded-[18px] transition-colors active:scale-[0.98]
              ${RESERVE_ITEMS.some((r) => r.id === route) ? 'bg-ink-900 text-paper' : 'text-ink-600'}`}>
            <Icon.Plus size={18}/>
            <span className="text-[10px] font-medium tracking-wide">Reservar</span>
          </button>
          <button
            type="button"
            onClick={() => setRoute('profile')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[52px] rounded-[18px] transition-colors active:scale-[0.98]
              ${route === 'profile' ? 'bg-ink-900 text-paper' : 'text-ink-600'}`}>
            <div className="h-[18px] w-[18px] rounded-full overflow-hidden ring-1 ring-ink-200 bg-ink-100 flex items-center justify-center">
              {u.avatar ? (
                <img src={u.avatar} alt="" className="h-full w-full object-cover img-grayscale"/>
              ) : (
                <span className="text-[9px] font-medium">{(u.firstName || 'V').slice(0, 1)}</span>
              )}
            </div>
            <span className="text-[10px] font-medium tracking-wide">Perfil</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

const MobileTopBar = ({ title, subtitle, onBack, right }) => (
  <header className="lg:hidden sticky top-0 z-30 bg-canvas/95 backdrop-blur-md border-b hairline px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 flex items-center gap-3">
    {onBack ? (
      <button
        type="button"
        onClick={onBack}
        className="h-9 w-9 shrink-0 rounded-lg hover:bg-ink-100 text-ink-700 flex items-center justify-center"
        aria-label="Voltar">
        <Icon.ChevronLeft size={18}/>
      </button>
    ) : (
      <GaidLogo className="h-7 w-auto shrink-0"/>
    )}
    <div className="flex-1 min-w-0">
      {subtitle && <div className="label text-[10px]">{subtitle}</div>}
      <div className="text-[15px] font-medium text-ink-900 truncate leading-tight">{title}</div>
    </div>
    {right && <div className="shrink-0 flex items-center gap-1">{right}</div>}
  </header>
);

const ReserveSheet = ({ open, onClose, setRoute, route }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" className="absolute inset-0 bg-ink-900/35 backdrop-blur-sm" onClick={onClose} aria-label="Fechar"/>
      <div className="absolute left-0 right-0 bottom-0 bg-white border-t hairline rounded-t-3xl p-4 pb-[max(20px,env(safe-area-inset-bottom))] fade-up">
        <div className="w-10 h-1 rounded-full bg-ink-200 mx-auto mb-4"/>
        <div className="label px-1 mb-3">Reservar</div>
        <div className="space-y-1">
          {RESERVE_ITEMS.map((it) => {
            const Ic = it.icon;
            const active = route === it.id;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => { setRoute(it.id); onClose(); }}
                className={`w-full flex items-center gap-3 px-3 h-12 rounded-xl text-left transition-colors
                  ${active ? 'bg-brand-50 text-brand-700' : 'hover:bg-ink-50 text-ink-900'}`}>
                <div className="h-9 w-9 rounded-lg bg-ink-100 text-ink-700 flex items-center justify-center">
                  <Ic size={16}/>
                </div>
                <span className="text-[14px] font-medium">{it.label}</span>
                <Icon.ChevronRight size={14} className="ml-auto text-ink-400"/>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const MOBILE_MAIN_ROUTES = new Set([
  'home', 'trips', 'explore', 'experts', 'profile', 'plan',
  'flights', 'hotels', 'tours', 'wallet', 'miles', 'plans',
]);

const MobileShell = ({ route, setRoute, children, planMode }) => {
  const [reserveOpen, setReserveOpen] = useState(false);
  const showTabBar = MOBILE_MAIN_ROUTES.has(route) && route !== 'plan';
  const padBottom = showTabBar ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom))]' : '';

  return (
    <div className="lg:hidden min-h-screen flex flex-col bg-canvas">
      {route === 'plan' && (
        <MobileTopBar
          title="Roteiro"
          subtitle="Concierge + workspace"
          onBack={() => setRoute('trips')}
        />
      )}
      <div className={`flex-1 min-h-0 min-w-0 ${padBottom} ${planMode ? 'flex flex-col' : ''}`}>
        {children}
      </div>
      {showTabBar && (
        <MobileTabBar
          route={route}
          setRoute={setRoute}
          onReserve={() => setReserveOpen(true)}
        />
      )}
      <ReserveSheet
        open={reserveOpen}
        onClose={() => setReserveOpen(false)}
        setRoute={setRoute}
        route={route}
      />
    </div>
  );
};

export { MobileShell, MobileTabBar, MobileTopBar, ReserveSheet };
