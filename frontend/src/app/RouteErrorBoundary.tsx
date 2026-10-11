import React from 'react';
import { CircleAlert } from 'lucide-react';
import { StatePanel } from '@/shared/components/State/StatePanel';

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
  message: string;
}

/** Catches page crashes so the shell around them stays alive. */
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

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    console.error('[RouteErrorBoundary]', error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="content-container">
          <StatePanel
            tone="danger"
            icon={<CircleAlert size={30} />}
            title="تعذر عرض هذه الصفحة"
            text={this.state.message}
            action={
              <button type="button" onClick={() => window.location.reload()} className="btn-gold py-2 px-6 text-xs font-bold mt-2">
                إعادة تحميل الصفحة
              </button>
            }
          />
        </main>
      );
    }
    return this.props.children;
  }
}