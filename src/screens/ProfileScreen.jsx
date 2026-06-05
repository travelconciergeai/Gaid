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
  const tripCount = summaries.length;
  const toast = useToast();
  const [prefsEditing, setPrefsEditing] = useState(false);
  const [prefsDraft, setPrefsDraft] = useState(() => normalizePreferenceProfile(acct.profile));
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsError, setPrefsError] = useState('');
  const hasPrefs = hasPreferenceProfile(acct.profile);

  useEffect(() => {
    if (!prefsEditing) setPrefsDraft(normalizePreferenceProfile(acct.profile));
  }, [acct.profile, prefsEditing]);

  const openPrefsEditor = () => {
    setPrefsError('');
    setPrefsDraft(normalizePreferenceProfile(acct.profile));
    setPrefsEditing(true);
  };
  const cancelPrefsEditor = () => {
    setPrefsError('');
    setPrefsDraft(normalizePreferenceProfile(acct.profile));
    setPrefsEditing(false);
  };
  const savePrefsEditor = async () => {
    setPrefsSaving(true);
    setPrefsError('');
    try {
      const nextProfile = {
        ...(acct.profile || {}),
        travelerProfile: prefsDraft.travelerProfile,
        preferences: prefsDraft.preferences,
      };
      await acct.setProfile(nextProfile);
      setPrefsEditing(false);
      toast({ title: 'Preferências salvas' });
    } catch (_error) {
      setPrefsError('Não consegui salvar suas preferências agora. Tente novamente em instantes.');
    } finally {
      setPrefsSaving(false);
    }
  };

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

      <div className="px-5 sm:px-8 lg:px-10 pb-14">
        {/* Identity banner */}
        <Card className="overflow-hidden mb-6">
          <div className="px-8 pt-8 pb-7">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
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
            <div className="grid grid-cols-2 gap-4 mt-7 pt-7 border-t hairline">
              <ProfileStatD value={tripCount} label="Viagens" hint={tripCount ? 'no seu histórico' : 'comece a planejar'}/>
              <ProfileStatD value={`${completion}%`} label="Perfil" hint="personalização da Gaid"/>
            </div>
          </div>
        </Card>

        {/* Two-column body */}
        <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
          {/* LEFT: Sua Gaid shortcut cards */}
          <div>
            <SectionHeader eyebrow="Sua Gaid" title="Acesso rápido"/>
            <div className="grid grid-cols-2 gap-4">
              <ShortcutCard tone="ink" icon={Icon.Calendar} title="Roteiros"
                value={`${tripCount} ${tripCount === 1 ? 'viagem' : 'viagens'}`} desc="Abra, edite ou continue seus roteiros"
                onClick={() => setRoute('trips')}/>
              <ShortcutCard tone="cool" icon={Icon.Compass} title="Dicas"
                value="Explorar" desc="Ideias e recomendações para decidir melhor"
                onClick={() => setRoute('explore')}/>
              <ShortcutCard tone="warm" icon={Icon.Sparkles} title="Novo roteiro"
                value="Começar" desc="Converse com a Gaid para criar uma viagem"
                onClick={() => setRoute('home')}/>
              <ShortcutCard tone="sage" icon={Icon.Sliders} title="Preferências"
                value={`${completion}%`} desc="Ajuste como a Gaid personaliza suas dicas"
                onClick={openPrefsEditor}/>
            </div>

            {/* Travel preferences */}
            <div className="mt-6">
              <SectionHeader
                eyebrow="Perfil de viagem"
                title="Preferências de viagem"
                action={hasPrefs && !prefsEditing ? <Button variant="ghost" size="sm" icon={Icon.Edit} onClick={openPrefsEditor}>Editar</Button> : null}
              />
              <Card className="overflow-hidden">
                <div className="px-5 sm:px-6 pt-5 pb-4 border-b hairline">
                  <div className="text-[13px] text-ink-500 leading-relaxed">
                    Essas informações ajudam a Gaid a recomendar roteiros e experiências com mais contexto.
                  </div>
                </div>
                {prefsEditing ? (
                  <TravelPreferencesEditor
                    draft={prefsDraft}
                    setDraft={setPrefsDraft}
                    onCancel={cancelPrefsEditor}
                    onSave={savePrefsEditor}
                    saving={prefsSaving}
                    error={prefsError}
                  />
                ) : hasPrefs ? (
                  <TravelPreferencesView profile={acct.profile} />
                ) : (
                  <EmptyState
                    icon={Icon.Sliders}
                    title="Você ainda não configurou suas preferências de viagem."
                    desc="Configure seu estilo de viagem para a Gaid personalizar dicas, roteiros e experiências com mais contexto."
                    primary={<Button icon={Icon.Sparkles} onClick={openPrefsEditor}>Configurar preferências</Button>}
                    className="py-10"
                  />
                )}
              </Card>
            </div>
          </div>

          {/* RIGHT: account + support menus */}
          <div className="space-y-6">
            <div>
              <SectionHeader eyebrow="Conta" title="Configurações"/>
              <Card className="divide-y hairline overflow-hidden">
                {accountItems.map(it => <MenuRow key={it.id} item={it} onClick={() => it.id === 'prefs' ? openPrefsEditor() : toast({ title: it.label })}/>)}
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

const DEFAULT_PRIORITY_RANKING = ['Experiências únicas', 'Conforto', 'Economia', 'Pouco deslocamento', 'Boa gastronomia', 'Segurança', 'Atividades para crianças', 'Flexibilidade'];
const DEFAULT_PREFS = {
  travelerProfile: {
    defaultComposition: '',
    commonCompanions: [],
    childrenAges: [],
  },
  preferences: {
    interests: [],
    pace: '',
    budgetStyle: '',
    priorityRanking: DEFAULT_PRIORITY_RANKING,
  },
};
const DEFAULT_COMPOSITION_OPTIONS = ['Sozinho', 'Casal', 'Família', 'Amigos', 'Trabalho', 'Varia bastante'];
const COMPANION_OPTIONS = ['Parceiro(a)', 'Crianças', 'Bebê ou criança pequena', 'Pais ou idosos', 'Pet', 'Amigos', 'Costumo viajar sozinho'];
const CHILDREN_AGE_OPTIONS = ['0–2', '3–5', '6–10', '11+'];
const INTEREST_OPTIONS = ['Gastronomia', 'Cultura', 'Compras', 'Natureza', 'Parques', 'Museus', 'Vida noturna', 'Descanso', 'Luxo', 'Econômico', 'Experiências locais', 'Lugares instagramáveis'];
const PACE_OPTIONS = ['Leve', 'Equilibrado', 'Intenso', 'Quero aproveitar tudo sem sofrer'];
const BUDGET_OPTIONS = ['Econômico', 'Moderado', 'Confortável', 'Premium', 'Depende da viagem'];

function normalizePreferenceProfile(profile) {
  return {
    travelerProfile: {
      ...DEFAULT_PREFS.travelerProfile,
      ...(profile?.travelerProfile || {}),
      commonCompanions: Array.isArray(profile?.travelerProfile?.commonCompanions) ? profile.travelerProfile.commonCompanions : [],
      childrenAges: Array.isArray(profile?.travelerProfile?.childrenAges) ? profile.travelerProfile.childrenAges : [],
    },
    preferences: {
      ...DEFAULT_PREFS.preferences,
      ...(profile?.preferences || {}),
      interests: Array.isArray(profile?.preferences?.interests) ? profile.preferences.interests : [],
      priorityRanking: Array.isArray(profile?.preferences?.priorityRanking) && profile.preferences.priorityRanking.length
        ? profile.preferences.priorityRanking
        : DEFAULT_PRIORITY_RANKING,
    },
  };
}

function hasPreferenceProfile(profile) {
  const normalized = normalizePreferenceProfile(profile);
  return Boolean(
    normalized.travelerProfile.defaultComposition ||
    normalized.travelerProfile.commonCompanions.length ||
    normalized.travelerProfile.childrenAges.length ||
    normalized.preferences.interests.length ||
    normalized.preferences.pace ||
    normalized.preferences.budgetStyle ||
    normalized.preferences.priorityRanking.some((item, index) => item !== DEFAULT_PRIORITY_RANKING[index])
  );
}

function toggleArrayValue(values, value) {
  const list = Array.isArray(values) ? values : [];
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value];
}

function listText(values) {
  const list = Array.isArray(values) ? values.filter(Boolean) : [];
  return list.length ? list.join(', ') : 'A definir';
}

const TravelPreferencesView = ({ profile }) => {
  const prefs = normalizePreferenceProfile(profile);
  const rows = [
    { label: 'Como você costuma viajar', value: prefs.travelerProfile.defaultComposition || 'A definir' },
    { label: 'Quem normalmente viaja com você', value: listText(prefs.travelerProfile.commonCompanions) },
    { label: 'Crianças', value: listText(prefs.travelerProfile.childrenAges) },
    { label: 'Interesses', value: listText(prefs.preferences.interests) },
    { label: 'Ritmo', value: prefs.preferences.pace || 'A definir' },
    { label: 'Orçamento/conforto', value: prefs.preferences.budgetStyle || 'A definir' },
    { label: 'Prioridades', value: listText(prefs.preferences.priorityRanking) },
  ];
  return (
    <div className="divide-y hairline">
      {rows.map(row => (
        <div key={row.label} className="px-5 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-1 sm:gap-5">
          <div className="label">{row.label}</div>
          <div className="text-[13px] text-ink-800 leading-relaxed">{row.value}</div>
        </div>
      ))}
    </div>
  );
};

const TravelPreferencesEditor = ({ draft, setDraft, onCancel, onSave, saving, error }) => {
  const companions = draft.travelerProfile.commonCompanions || [];
  const needsChildrenAges = companions.includes('Crianças') || companions.includes('Bebê ou criança pequena');

  const setTravelerProfile = (patch) => setDraft(prev => ({
    ...prev,
    travelerProfile: { ...prev.travelerProfile, ...patch },
  }));
  const setPreferences = (patch) => setDraft(prev => ({
    ...prev,
    preferences: { ...prev.preferences, ...patch },
  }));
  const movePriority = (index, direction) => {
    const next = [...(draft.preferences.priorityRanking || DEFAULT_PRIORITY_RANKING)];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPreferences({ priorityRanking: next });
  };

  return (
    <div className="p-5 sm:p-6 space-y-6">
      <PreferenceGroup title="Como você costuma viajar">
        <ChoiceGrid
          options={DEFAULT_COMPOSITION_OPTIONS}
          value={draft.travelerProfile.defaultComposition}
          onSelect={(value) => setTravelerProfile({ defaultComposition: value })}
        />
      </PreferenceGroup>

      <PreferenceGroup title="Quem normalmente viaja com você">
        <ChipGrid
          options={COMPANION_OPTIONS}
          values={companions}
          onToggle={(value) => {
            const next = toggleArrayValue(companions, value);
            setTravelerProfile({
              commonCompanions: next,
              childrenAges: next.includes('Crianças') || next.includes('Bebê ou criança pequena') ? draft.travelerProfile.childrenAges : [],
            });
          }}
        />
      </PreferenceGroup>

      {needsChildrenAges ? (
        <PreferenceGroup title="Faixa de idade das crianças">
          <ChipGrid
            options={CHILDREN_AGE_OPTIONS}
            values={draft.travelerProfile.childrenAges || []}
            onToggle={(value) => setTravelerProfile({ childrenAges: toggleArrayValue(draft.travelerProfile.childrenAges, value) })}
          />
        </PreferenceGroup>
      ) : null}

      <PreferenceGroup title="Interesses">
        <ChipGrid
          options={INTEREST_OPTIONS}
          values={draft.preferences.interests || []}
          onToggle={(value) => setPreferences({ interests: toggleArrayValue(draft.preferences.interests, value) })}
        />
      </PreferenceGroup>

      <PreferenceGroup title="Ritmo">
        <ChoiceGrid
          options={PACE_OPTIONS}
          value={draft.preferences.pace}
          onSelect={(value) => setPreferences({ pace: value })}
        />
      </PreferenceGroup>

      <PreferenceGroup title="Orçamento/conforto">
        <ChoiceGrid
          options={BUDGET_OPTIONS}
          value={draft.preferences.budgetStyle}
          onSelect={(value) => setPreferences({ budgetStyle: value })}
        />
      </PreferenceGroup>

      <PreferenceGroup title="Prioridades">
        <div className="space-y-2">
          {(draft.preferences.priorityRanking || DEFAULT_PRIORITY_RANKING).map((item, index, list) => (
            <div key={item} className="flex items-center gap-3 rounded-xl border hairline bg-white px-3 py-2.5">
              <div className="h-7 w-7 rounded-full bg-ink-100 text-[12px] text-ink-700 flex items-center justify-center shrink-0">{index + 1}</div>
              <div className="flex-1 min-w-0 text-[13px] text-ink-800">{item}</div>
              <button type="button" disabled={index === 0} onClick={() => movePriority(index, -1)}
                className="h-8 w-8 rounded-lg border hairline flex items-center justify-center text-ink-500 disabled:opacity-30">
                <Icon.ChevronDown size={15} className="rotate-180"/>
              </button>
              <button type="button" disabled={index === list.length - 1} onClick={() => movePriority(index, 1)}
                className="h-8 w-8 rounded-lg border hairline flex items-center justify-center text-ink-500 disabled:opacity-30">
                <Icon.ChevronDown size={15}/>
              </button>
            </div>
          ))}
        </div>
      </PreferenceGroup>

      {error ? <div className="text-[12.5px] text-coral-700 bg-coral-50 border border-coral-100 rounded-xl px-3 py-2">{error}</div> : null}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button icon={Icon.Check} onClick={onSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar preferências'}</Button>
      </div>
    </div>
  );
};

const PreferenceGroup = ({ title, children }) => (
  <div>
    <div className="label mb-2.5">{title}</div>
    {children}
  </div>
);

const ChoiceGrid = ({ options, value, onSelect }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
    {options.map(option => {
      const selected = value === option;
      return (
        <button key={option} type="button" onClick={() => onSelect(option)}
          className={`min-h-11 rounded-xl border px-3 py-2 text-left text-[13px] transition-colors ${selected ? 'border-brand-600 bg-brand-50 text-brand-900' : 'hairline bg-white text-ink-700 hover:bg-ink-50'}`}>
          {option}
        </button>
      );
    })}
  </div>
);

const ChipGrid = ({ options, values, onToggle }) => (
  <div className="flex flex-wrap gap-2">
    {options.map(option => {
      const selected = (values || []).includes(option);
      return (
        <button key={option} type="button" onClick={() => onToggle(option)}
          className={`min-h-9 rounded-full border px-3 text-[12.5px] transition-colors ${selected ? 'border-brand-600 bg-brand-50 text-brand-900' : 'hairline bg-white text-ink-700 hover:bg-ink-50'}`}>
          {option}
        </button>
      );
    })}
  </div>
);

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
