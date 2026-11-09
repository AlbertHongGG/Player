import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center p-6 bg-[#0c0c0c] text-white select-none">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#141414] border border-red-500/20 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 mx-auto flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-200">
                {this.props.fallbackTitle || "發生未預期的渲染錯誤"}
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                系統已安全攔截此錯誤，不會造成應用崩潰。
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-lg bg-black/50 border border-white/5 text-left overflow-hidden">
                <p className="text-[11px] font-mono text-red-300 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-gray-200 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>重試</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="px-3.5 py-1.5 rounded-xl bg-[#facc15] hover:bg-white text-xs font-semibold text-black transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>重新整理</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
