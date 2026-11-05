export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[60vh] flex flex-col items-center justify-center px-4 bg-background"
    >
      <div className="relative flex items-center justify-center">
        <div className="w-14 h-14 rounded-full border-4 border-outline-variant/40 animate-pulse" />
        <div className="w-14 h-14 rounded-full border-4 border-transparent border-t-secondary animate-spin absolute inset-0" />
      </div>
      <p className="mt-5 text-label-md text-on-surface-variant tracking-widest uppercase">
        Yükleniyor...
      </p>
    </div>
  );
}
