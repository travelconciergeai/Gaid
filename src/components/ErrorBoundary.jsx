import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught runtime error', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    const { error, errorInfo } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen bg-canvas px-8 py-10 text-ink-900">
        <div className="mx-auto max-w-4xl rounded-2xl border border-coral-200 bg-white p-6 shadow-card">
          <div className="label mb-2 text-coral-700">Runtime error</div>
          <h1 className="text-[22px] font-medium tracking-tight">A tela encontrou um erro</h1>
          <p className="mt-2 text-[13px] text-ink-600">
            Este diagnóstico aparece para revelar a causa real do branco em produção.
          </p>

          <DiagnosticBlock title="error.message" value={error.message || String(error)} />
          {error.stack && <DiagnosticBlock title="error.stack" value={error.stack} />}
          {errorInfo?.componentStack && (
            <DiagnosticBlock title="componentStack" value={errorInfo.componentStack} />
          )}
        </div>
      </div>
    );
  }
}

const DiagnosticBlock = ({ title, value }) => (
  <div className="mt-5">
    <div className="text-[12px] font-medium text-ink-700">{title}</div>
    <pre className="mt-2 max-h-[280px] overflow-auto whitespace-pre-wrap rounded-xl bg-ink-950 p-4 text-[12px] leading-relaxed text-paper">
      {value}
    </pre>
  </div>
);

export { ErrorBoundary };
