import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h2>Something went wrong</h2>
          <p style={{ color: "#888" }}>{this.state.error?.message || "Unexpected error"}</p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = "/";
            }}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1.5rem",
              borderRadius: "8px",
              border: "none",
              background: "#6c63ff",
              color: "#fff",
              cursor: "pointer"
            }}
          >
            Go Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
