import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  componentDidMount() {
    window.addEventListener('error', this.handleGlobalError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  handleGlobalError = (event) => {
    const error = event.error || event.message || event;
    console.error('[GlobalError]', serializeThrownValue(error), event);
    this.setState({ error });
  };

  handleUnhandledRejection = (event) => {
    const error = event.reason || event;
    console.error('[UnhandledRejection]', serializeThrownValue(error), event);
    this.setState({ error });
  };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught runtime error', serializeThrownValue(error), error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    const { error, errorInfo } = this.state;
    if (!error) return this.props.children;
    const diagnostic = serializeThrownValue(error);

    return (
      <div className="min-h-screen bg-canvas px-8 py-10 text-ink-900">
        <div className="mx-auto max-w-4xl rounded-2xl border border-coral-200 bg-white p-6 shadow-card">
          <div className="label mb-2 text-coral-700">Runtime error</div>
          <h1 className="text-[22px] font-medium tracking-tight">A tela encontrou um erro</h1>
          <p className="mt-2 text-[13px] text-ink-600">
            Este diagnóstico aparece para revelar a causa real do branco em produção.
          </p>

          <DiagnosticBlock title="error.name" value={diagnostic.name} />
          <DiagnosticBlock title="error.message" value={diagnostic.message} />
          <DiagnosticBlock title="error.stack" value={diagnostic.stack} />
          <DiagnosticBlock title="error.cause" value={diagnostic.cause} />
          <DiagnosticBlock title="error.keys" value={diagnostic.keys} />
          <DiagnosticBlock title="error.json" value={diagnostic.json} />
          <DiagnosticBlock title="error.string" value={diagnostic.string} />
          {errorInfo?.componentStack && (
            <DiagnosticBlock title="componentStack" value={errorInfo.componentStack} />
          )}
        </div>
      </div>
    );
  }
}

function serializeThrownValue(error) {
  const keys = error && (typeof error === 'object' || typeof error === 'function') ? Object.keys(error) : [];
  let json = '';
  try {
    json = JSON.stringify(error, keys.length ? keys : undefined, 2);
  } catch (err) {
    json = `Unserializable: ${err?.message || String(err)}`;
  }
  return {
    type: typeof error,
    constructor: error?.constructor?.name || '',
    name: error?.name || '',
    message: error?.message || '',
    stack: error?.stack || '',
    cause: error?.cause ? String(error.cause) : '',
    keys: keys.join(', '),
    json: json || '',
    string: String(error),
  };
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
