import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props  { children: ReactNode }
interface State  { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Oups ! Une erreur est survenue.</h2>
          <div className="bg-red-50 p-4 rounded-xl text-left mb-6 overflow-auto max-h-40">
            <code className="text-xs text-red-600">{this.state.error?.message}</code>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Recharger l'application
          </button>
        </div>
      </div>
    );
    return this.props.children;
  }
}
