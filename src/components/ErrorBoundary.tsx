import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { err: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error(err, info);
  }

  render() {
    if (this.state.err) {
      return (
        <div className="error-banner" role="alert">
          Something went wrong: {this.state.err.message}
        </div>
      );
    }
    return this.props.children;
  }
}
