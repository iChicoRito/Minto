"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class MemoryErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Prompt content must never be logged.
  }

  render() {
    if (this.state.hasError) {
      return (
        <p className="text-destructive text-sm">
          Local memory could not be displayed. Your current workspace remains available.
        </p>
      );
    }
    return this.props.children;
  }
}
