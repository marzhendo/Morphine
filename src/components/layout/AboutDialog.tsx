interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-terminal-card border border-terminal-border w-80 p-5 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Logo + name */}
        <div className="flex items-center gap-3 border-b border-terminal-border pb-3">
          <div className="w-10 h-10 bg-terminal-bg border border-terminal-border flex items-center justify-center text-terminal-accent font-bold text-lg">
            M
          </div>
          <div>
            <p className="text-terminal-bright font-bold text-sm tracking-widest">morphine</p>
            <p className="text-terminal-dim text-[9px] tracking-widest">v0.1.0</p>
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-1.5 text-[10px]">
          <div className="flex justify-between">
            <span className="text-terminal-dim tracking-widest">author</span>
            <span className="text-terminal-text">Marzhendo Galang Saputra</span>
          </div>
          <div className="flex justify-between">
            <span className="text-terminal-dim tracking-widest">year</span>
            <span className="text-terminal-text">2026</span>
          </div>
          <div className="flex justify-between">
            <span className="text-terminal-dim tracking-widest">license</span>
            <span className="text-terminal-text">All rights reserved</span>
          </div>
          <div className="flex justify-between">
            <span className="text-terminal-dim tracking-widest">stack</span>
            <span className="text-terminal-text">Tauri v2 · React · Rust</span>
          </div>
        </div>

        {/* Copyright */}
        <p className="text-[9px] text-terminal-dim tracking-wide border-t border-terminal-border pt-3">
          © 2026 Marzhendo Galang Saputra. All rights reserved.
        </p>

        {/* Close */}
        <button
          onClick={onClose}
          className="text-[9px] tracking-widest border border-terminal-border text-terminal-dim hover:border-terminal-accent hover:text-terminal-accent transition-colors py-1.5 font-bold"
        >
          [close]
        </button>
      </div>
    </div>
  );
}
