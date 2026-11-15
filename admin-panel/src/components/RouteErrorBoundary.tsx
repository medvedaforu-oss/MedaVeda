import { Component, type ErrorInfo, type ReactNode } from "react";

export default class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Could not load admin page:", error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <div role="alert" className="rounded-xl bg-white p-6 shadow">
          <p className="text-gray-700">This page could not be loaded. Reload the page to try again.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-green-700 px-4 py-2 text-white">
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
