import React from 'react';
import { CircleAlert } from 'lucide-react';
import { StatePanel } from '@/shared/components/State/StatePanel';
import { ApiError } from '@/shared/lib/apiClient';

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
  message: string;
  requestId: string;
  // Bumped by the retry control so the subtree remounts without a page reload.
  attempt: number;
}

/** Catches page crashes so the shell around them stays alive.
 *
 * Phase 13 §13.4: the panel also shows the request id the backend stamps on
 * every error envelope ("رمز الخطأ: …") and offers a retry that re-renders the
 * route instead of reloading the whole document.
 */
export class RouteErrorBoundary extends React.Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { hasError: false, message: '', requestId: '', attempt: 0 };

  static getDerivedStateFromError(error: unknown): Partial<RouteErrorBoundaryState> {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      requestId: error instanceof ApiError ? (error.requestId ?? '') : '',
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    console.error('[RouteErrorBoundary]', error, errorInfo.componentStack);
  }

  private retry = (): void => {
    this.setState(({ attempt }) => ({ hasError: false, message: '', requestId: '', attempt: attempt + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="content-container">
          <StatePanel
            tone="danger"
            icon={<CircleAlert size={30} />}
            title="تعذر عرض هذه الصفحة"
            text={this.state.requestId ? `${this.state.message} (رمز الخطأ: ${this.state.requestId})` : this.state.message}
            action={
              <button type="button" onClick={this.retry} className="btn-gold py-2 px-6 text-xs font-bold mt-2">
                إعادة المحاولة
              </button>
            }
          />
        </main>
      );
    }
    return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
  }
}