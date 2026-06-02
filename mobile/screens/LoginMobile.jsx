// Login / auth — mobile. Goal: under 10s to enter.
// No travel data collected here. Social-first; email as secondary.

const LoginMobile = ({ onAuthed }) => {
  const [stage, setStage] = useState('choices');   // choices | email | loading
  const [provider, setProvider] = useState(null);
  const [email, setEmail] = useState('');

  // Simulate OAuth round-trip, then route: new user → onboarding, else home.
  const authWith = (prov, isNew) => {
    setProvider(prov);
    setStage('loading');
    setTimeout(() => {
      onAuthed && onAuthed({ provider: prov, isNew });
    }, 1400);
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-paper">
      {/* Brand hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="h-16 w-16 rounded-2xl bg-ink-900 text-paper flex items-center justify-center shadow-pop mb-6">
          <Icon.Logo size={34}/>
        </div>
        <h1 className="text-[30px] tracking-[-0.03em] font-medium text-ink-900 leading-[1.2]">
          <span className="block">Bem-vindo à</span>
          <span className="serif-i block" style={{ marginTop: '2px', lineHeight: 1.3 }}>Gaid</span>
        </h1>
        <p className="text-[14.5px] text-ink-600 mt-5 max-w-[260px] leading-relaxed">
          Sua concierge de viagens com IA.
        </p>
      </div>

      {/* Auth panel */}
      <div className="px-6 pb-10">
        {stage === 'loading' ? (
          <div className="bg-white border-half rounded-3xl shadow-card p-7 flex flex-col items-center gap-4">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full bg-ink-900 text-paper flex items-center justify-center"><Icon.Logo size={20}/></div>
              <div className="absolute inset-0 rounded-full ring-2 ring-ink-900/25 animate-ping"/>
            </div>
            <div className="text-[13.5px] text-ink-700">Entrando com <span className="font-medium text-ink-900">{provider}</span>…</div>
          </div>
        ) : stage === 'email' ? (
          <EmailPanel email={email} setEmail={setEmail}
            onBack={() => setStage('choices')}
            onSubmit={() => authWith('e-mail', true)}/>
        ) : (
          <div className="space-y-2.5">
            <SocialBtn label="Continuar com Google"   glyph="google"   onClick={() => authWith('Google', true)}/>
            <SocialBtn label="Continuar com Apple"    glyph="apple"    onClick={() => authWith('Apple', true)}/>
            <SocialBtn label="Continuar com Facebook" glyph="facebook" onClick={() => authWith('Facebook', true)}/>

            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-ink-200"/>
              <span className="text-[12px] text-ink-400">ou</span>
              <div className="flex-1 h-px bg-ink-200"/>
            </div>

            <button onClick={() => setStage('email')}
              className="w-full h-13 rounded-2xl border-half bg-white text-ink-900 text-[14.5px] font-medium flex items-center justify-center gap-2 active:bg-ink-50 transition-colors"
              style={{ height: '52px' }}>
              <Icon.Mail size={17}/> Entrar com e-mail
            </button>

            <p className="text-[11px] text-ink-400 text-center leading-relaxed pt-3 px-4">
              Ao continuar, você concorda com os Termos e a Política de Privacidade da Gaid.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const EmailPanel = ({ email, setEmail, onBack, onSubmit }) => {
  const valid = /\S+@\S+\.\S+/.test(email);
  return (
    <div className="space-y-2.5 fade-up">
      <div className="flex items-center gap-2 mb-1">
        <button onClick={onBack} className="h-9 w-9 rounded-full active:bg-ink-100 flex items-center justify-center text-ink-700">
          <Icon.ChevronLeft size={18}/>
        </button>
        <span className="text-[14px] font-medium text-ink-900">Entrar com e-mail</span>
      </div>
      <div className="bg-white border-half rounded-2xl h-13 px-4 flex items-center gap-2.5" style={{ height: '52px' }}>
        <Icon.Mail size={16} className="text-ink-500 shrink-0"/>
        <input autoFocus type="email" inputMode="email" value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && valid && onSubmit()}
          placeholder="seu@email.com"
          className="flex-1 h-full bg-transparent outline-none text-[15px] placeholder:text-ink-400"/>
      </div>
      <button onClick={onSubmit} disabled={!valid}
        className="w-full rounded-2xl bg-ink-900 text-paper text-[14.5px] font-medium flex items-center justify-center gap-2 active:bg-ink-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ height: '52px' }}>
        Continuar <Icon.ArrowRight size={16}/>
      </button>
      <p className="text-[11.5px] text-ink-500 text-center pt-2">
        Enviamos um link mágico — sem senha.
      </p>
    </div>
  );
};

// Social button with a minimal monochrome brand glyph (no external assets).
const SocialBtn = ({ label, glyph, onClick }) => (
  <button onClick={onClick}
    className="w-full rounded-2xl border-half bg-white text-ink-900 text-[14.5px] font-medium flex items-center justify-center gap-3 active:bg-ink-50 transition-colors relative"
    style={{ height: '52px' }}>
    <span className="absolute left-4 flex items-center justify-center"><BrandGlyph glyph={glyph}/></span>
    {label}
  </button>
);

const BrandGlyph = ({ glyph, size = 19 }) => {
  if (glyph === 'google') return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.74-6-6.1s2.7-6.1 6-6.1c1.9 0 3.16.8 3.9 1.5l2.65-2.55C16.9 3.3 14.7 2.3 12 2.3 6.9 2.3 2.8 6.4 2.8 11.5S6.9 20.7 12 20.7c5.3 0 8.8-3.72 8.8-8.96 0-.6-.07-1.06-.16-1.52H12z"/>
    </svg>
  );
  if (glyph === 'apple') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.4 12.6c-.03-2.5 2-3.7 2.1-3.76-1.14-1.67-2.92-1.9-3.55-1.93-1.5-.15-2.95.89-3.71.89-.78 0-1.95-.87-3.2-.85-1.64.03-3.16.96-4 2.43-1.72 2.98-.44 7.38 1.22 9.8.82 1.18 1.78 2.5 3.05 2.46 1.23-.05 1.69-.79 3.18-.79 1.47 0 1.9.79 3.19.76 1.32-.02 2.15-1.2 2.95-2.39.94-1.37 1.32-2.7 1.34-2.77-.03-.01-2.57-.99-2.6-3.9zM14.2 5.36c.67-.82 1.13-1.95 1-3.09-.97.04-2.15.65-2.85 1.46-.62.72-1.17 1.88-1.02 2.99 1.08.08 2.19-.55 2.87-1.36z"/>
    </svg>
  );
  // facebook
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#1877F2" d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.13 8.44 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99C18.34 21.13 22 16.99 22 12z"/>
    </svg>
  );
};

window.LoginMobile = LoginMobile;
