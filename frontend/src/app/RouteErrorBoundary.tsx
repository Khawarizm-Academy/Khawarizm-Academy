import React from 'react';
import { CircleAlert } from 'lucide-react';

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
  message: string;
}

/**
 * Per-route error boundary. Catches runtime errors inside a page view so the
 * persistent shell (Navbars / Footer / Bottom Bar) never unmounts.
 */
export class RouteErrorBoundary extends React.Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): RouteErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
    };
  }

  componentDidCatch(error: unknown): void {
    console.error('[RouteErrorBoundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="content-container">
          <div className="w-full py-20 px-6 glass-panel rounded-2xl flex-col-center text-center gap-4 border border-[#1B3F80]">
            <div className="w-16 h-16 rounded-full bg-[#092557] border border-[#1B3F80] flex-center text-[#D9534F]">
              <CircleAlert size={30} />
            </div>
            <h3 className="text-xl font-bold text-white font-['IBM_Plex_Sans_Arabic']">
              تعذر عرض هذه الصفحة
            </h3>
            <p className="text-slate-400 text-sm font-['Tajawal'] max-w-md">{this.state.message}</p>
            <button type="button" onClick={() => window.location.reload()} className="btn-gold py-2 px-6 text-xs font-bold mt-2">
              إعادة تحميل الصفحة
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}