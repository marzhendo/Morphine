import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { 
  FileUp, 
  Settings, 
  ArrowRightLeft, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  FileText, 
  Sparkles,
  ShieldCheck
} from "lucide-react";

interface ConversionItem {
  id: string;
  name: string;
  size: string;
  status: "idle" | "converting" | "done" | "error";
  progress: number;
  errorMsg?: string;
}

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [queue] = useState<ConversionItem[]>([
    {
      id: "demo-1",
      name: "financial_report.xlsx",
      size: "2.4 MB",
      status: "done",
      progress: 100,
    },
    {
      id: "demo-2",
      name: "presentation_draft.pptx",
      size: "12.8 MB",
      status: "converting",
      progress: 64,
    },
    {
      id: "demo-3",
      name: "contract_final.docx",
      size: "412 KB",
      status: "idle",
      progress: 0,
    }
  ]);

  async function greet() {
    if (!name) return;
    try {
      const response = await invoke<string>("greet", { name });
      setGreetMsg(response);
    } catch (err) {
      console.error("Failed to greet:", err);
    }
  }

  // Hook up standard Tauri file drop listener for verification
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    
    const setupListener = async () => {
      unlisten = await listen<any>("tauri://drag-drop", (event) => {
        console.log("File dropped:", event.payload);
      });
    };

    setupListener().catch(console.error);

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-primary/30">
      {/* Premium Gradient Header */}
      <header className="border-b border-background-card bg-background-darker/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-primary to-accent p-2 rounded-xl text-white shadow-lg shadow-primary/20">
            <ArrowRightLeft className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-text-primary to-text-secondary bg-clip-text text-transparent flex items-center gap-2">
              Morphine
              <span className="text-[10px] uppercase font-semibold bg-accent/20 text-accent border border-accent/30 px-1.5 py-0.5 rounded">
                MVP
              </span>
            </h1>
            <p className="text-xs text-text-muted">Transform anything, instantly.</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-background-card px-3 py-1.5 rounded-lg border border-white/5 text-xs text-text-secondary">
            <ShieldCheck className="w-3.5 h-3.5 text-accent" />
            <span>100% Offline</span>
          </div>
          <button className="text-text-muted hover:text-text-primary transition p-2 hover:bg-background-card rounded-lg border border-transparent hover:border-white/5">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Workspace Dashboard */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8 flex flex-col gap-8">
        
        {/* Hero Section */}
        <section className="text-center py-6">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 text-text-secondary px-3 py-1 rounded-full text-xs mb-4">
            <Sparkles className="w-3.5 h-3.5 text-accent animate-spin-slow" />
            <span>Secure, high-speed local file format conversion</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Convert Files Securely, Locally
          </h2>
          <p className="text-text-muted text-sm md:text-base max-w-xl mx-auto mt-2">
            No uploads, no cloud, no tracking. Your files never leave your machine.
          </p>
        </section>

        {/* Drag & Drop File Zone */}
        <section className="relative group border-2 border-dashed border-white/10 hover:border-primary/50 transition-all bg-background-darker/40 hover:bg-background-darker/60 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer shadow-inner">
          <div className="bg-background-card p-4 rounded-full border border-white/5 group-hover:scale-110 transition duration-300">
            <FileUp className="w-10 h-10 text-primary group-hover:text-accent transition duration-300" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-text-primary">
              Drag & drop files here, or <span className="text-primary group-hover:text-accent transition duration-300 underline font-medium">browse</span>
            </p>
            <p className="text-xs text-text-muted mt-1">
              Supports Document, Spreadsheet, Presentation, and Image conversions
            </p>
          </div>
        </section>

        {/* Queue / Main Section */}
        <section className="bg-background-card border border-white/5 rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
            <span>Conversion Queue</span>
            <span className="bg-background-darker px-2 py-0.5 rounded text-xs text-primary font-mono">{queue.length}</span>
          </h3>

          <div className="flex flex-col gap-3">
            {queue.map((item) => (
              <div 
                key={item.id}
                className="bg-background-darker/50 hover:bg-background-darker/80 transition-colors p-4 rounded-xl border border-white/5 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-background-card p-2 rounded-lg text-text-muted">
                      <FileText className="w-5 h-5 text-primary/70" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-text-primary truncate">{item.name}</h4>
                      <p className="text-xs text-text-muted mt-0.5">{item.size}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {/* Status Badge */}
                    {item.status === "idle" && (
                      <span className="text-xs font-semibold bg-white/5 text-text-muted px-2.5 py-1 rounded-full border border-white/10">
                        Idle
                      </span>
                    )}
                    {item.status === "converting" && (
                      <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20 flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Converting
                      </span>
                    )}
                    {item.status === "done" && (
                      <span className="text-xs font-semibold bg-accent/15 text-accent px-2.5 py-1 rounded-full border border-accent/20 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Completed
                      </span>
                    )}
                    {item.status === "error" && (
                      <span className="text-xs font-semibold bg-red-500/10 text-red-400 px-2.5 py-1 rounded-full border border-red-500/20 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Failed
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {item.status === "converting" && (
                  <div className="w-full flex items-center gap-3">
                    <div className="flex-1 bg-background-card rounded-full h-2 overflow-hidden border border-white/5">
                      <div 
                        className="bg-gradient-to-r from-primary to-accent h-full transition-all duration-300 rounded-full" 
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold text-text-secondary w-9 text-right">{item.progress}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Tauri Connection Smoke Test section */}
        <section className="bg-background-darker/60 border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="flex flex-col gap-1 max-w-md">
            <h4 className="text-sm font-bold text-text-primary">Tauri Connection Smoke Test</h4>
            <p className="text-xs text-text-muted leading-relaxed">
              Verify communication with your Rust backend. Submit a name to trigger the `greet` command and see the response from Rust.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              greet();
            }}
            className="flex gap-2 w-full md:w-auto"
          >
            <input
              id="greet-input"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="Enter your name..."
              className="bg-background-card border border-white/10 focus:border-primary/50 text-text-primary px-4 py-2 rounded-xl text-sm focus:outline-none transition-all placeholder:text-text-muted w-full md:w-48"
            />
            <button 
              type="submit" 
              className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 active:scale-95 shadow-md shadow-primary/10"
            >
              Greet
            </button>
          </form>
        </section>

        {greetMsg && (
          <div className="bg-primary/10 border border-primary/20 text-text-primary px-4 py-3 rounded-xl text-sm font-medium text-center animate-fade-in -mt-4">
            {greetMsg}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-background-card py-6 text-center text-xs text-text-muted mt-auto">
        <p>© 2026 Morphine — Under local developer environment</p>
      </footer>
    </div>
  );
}

export default App;
