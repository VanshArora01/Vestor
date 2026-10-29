import React, { Component, type ReactNode } from 'react';
import { Button } from '../ui/Button';
import { AlertTriangle } from 'lucide-react';

interface SyncErrorBoundaryProps {
    children: ReactNode;
    onRetry?: () => void;
}

interface SyncErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class SyncErrorBoundary extends Component<SyncErrorBoundaryProps, SyncErrorBoundaryState> {
    constructor(props: SyncErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): SyncErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error('Sync Error:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
        if (this.props.onRetry) {
            this.props.onRetry();
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="mx-auto max-w-lg mt-16 px-4 text-center">
                    <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 mb-6">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                        <h2 className="font-display text-2xl font-semibold text-slate-900">Sync Failed</h2>
                        <p className="mt-2 text-sm text-slate-500 px-2">
                            {this.state.error?.message || "We couldn't sync your account right now. Please try again."}
                        </p>

                        <div className="mt-8 flex justify-center gap-4">
                            <Button
                                onClick={this.handleRetry}
                                className="bg-teal-600 text-white hover:bg-teal-700"
                            >
                                Retry Sync
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default SyncErrorBoundary;