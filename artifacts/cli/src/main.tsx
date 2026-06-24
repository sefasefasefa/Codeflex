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
          position:"fixed",inset:0,background:"#111",display:"flex",
          flexDirection:"column",alignItems:"center",justifyContent:"center",
          padding:"24px",fontFamily:"monospace",color:"#f87171",gap:"16px",zIndex:9999
        }}>
          <div style={{fontSize:"20px",fontWeight:"bold",color:"#4ade80"}}>⚠ CLI Hatası</div>
          <div style={{
            background:"#0d0d0d",border:"1px solid #166534",borderRadius:"8px",
            padding:"16px",maxWidth:"600px",width:"100%",wordBreak:"break-word",fontSize:"13px"
          }}>
            <div style={{marginBottom:"8px",color:"#f87171",fontWeight:"bold"}}>{err.name}: {err.message}</div>
            <pre style={{color:"#4b5563",fontSize:"11px",overflow:"auto",maxHeight:"300px",margin:0}}>
              {err.stack?.slice(0,1000)}
            </pre>
          </div>
          <button onClick={()=>window.location.reload()} style={{
            padding:"8px 24px",background:"#166534",color:"#4ade80",
            border:"1px solid #166534",borderRadius:"6px",cursor:"pointer",fontFamily:"monospace"
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
