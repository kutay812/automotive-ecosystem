export default function AdminLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[50vh] bg-[#0a0a0a] flex flex-col items-center justify-center"
    >
      <div className="w-10 h-10 border-2 border-white/10 border-t-[#ff5a00] rounded-full animate-spin mb-3" />
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
        Panel Yükleniyor...
      </span>
    </div>
  );
}
