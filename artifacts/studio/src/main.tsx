import { createRoot } from "react-dom/client";
import { Component, type ReactNode, type ErrorInfo } from "react";
import App from "./App";
import "./index.css";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("[ErrorBoundary]", error, info); }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div style={{
          position:"fixed",inset:0,background:"#080b14",display:"flex",
          flexDirection:"column",alignItems:"center",justifyContent:"center",
          padding:"24px",fontFamily:"monospace",color:"#f87171",gap:"16px",zIndex:9999
        }}>
          <div style={{fontSize:"20px",fontWeight:"bold"}}>⚠ Studio Hatası</div>
          <div style={{
            background:"#1a0a0a",border:"1px solid #7f1d1d",borderRadius:"8px",
            padding:"16px",maxWidth:"600px",width:"100%",wordBreak:"break-word",fontSize:"13px"
          }}>
            <div style={{marginBottom:"8px",color:"#f87171",fontWeight:"bold"}}>{err.name}: {err.message}</div>
            <pre style={{color:"#6b7280",fontSize:"11px",overflow:"auto",maxHeight:"300px",margin:0}}>
              {err.stack?.slice(0,1000)}
            </pre>
          </div>
          <button onClick={()=>window.location.reload()} style={{
            padding:"8px 24px",background:"#4f46e5",color:"white",
            border:"none",borderRadius:"6px",cursor:"pointer",fontFamily:"monospace"
          }}>Yeniden Yükle</button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary><App /></ErrorBoundary>
);
