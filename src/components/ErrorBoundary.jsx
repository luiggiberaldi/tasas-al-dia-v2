import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🔴 Calculator Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-950 p-6">
          <div className="text-center max-w-sm">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-500 mb-2">Error de Carga</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              La calculadora no pudo cargar correctamente. Esto puede deberse a datos corruptos o problemas de compatibilidad.
            </p>
            <button
              onClick={() => {
                // Purga extensiva de todas las claves potencialmente corruptas
                const keysToPurge = [
                  'calc_history', 'my_accounts_v2', 'monitor_rates_v12',
                  'premium_token', 'device_id', 'demo_used_history',
                  'catalog_use_auto_usdt', 'catalog_custom_usdt_price',
                  'business_parity_mode', 'business_main_currency',
                ];
                keysToPurge.forEach(k => localStorage.removeItem(k));
                window.location.reload();
              }}
              className="px-6 py-3 bg-brand text-slate-900 rounded-xl font-bold hover:brightness-110 transition-all shadow-lg"
            >
              Limpiar y Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
