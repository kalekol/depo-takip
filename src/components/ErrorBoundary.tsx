import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    if (confirm('Yerel tarayıcı verileri temizlenecek. Devam etmek istiyor musunuz?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-gray-800 rounded-2xl p-6 sm:p-8 border border-gray-700 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
              <AlertTriangle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black text-white">Uygulama Yüklenirken Bir Hata Oluştu</h1>
              <p className="text-sm text-gray-400">
                Aşağıdaki butonları kullanarak sayfayı yenileyebilir veya tarayıcı önbelleğini sıfırlayarak tekrar deneyebilirsiniz.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 text-left text-xs font-mono text-rose-400 overflow-x-auto max-h-40">
                <p className="font-bold">{this.state.error.toString()}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-[10px] text-gray-500 mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-sm rounded-xl transition flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Sayfayı Yenile</span>
              </button>

              <button
                onClick={this.handleResetCache}
                className="w-full sm:w-auto px-5 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold text-sm rounded-xl border border-gray-600 transition flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Önbelleği Sıfırla</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
