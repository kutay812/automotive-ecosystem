import { motion, AnimatePresence } from 'framer-motion';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export default function LegalModal({ isOpen, onClose, title, content }: LegalModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-3xl bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_4px_40px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[85vh] z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-outline-variant shrink-0">
            <h2 className="text-headline-sm text-primary">{title}</h2>
            <button
              onClick={onClose}
              className="text-on-surface-variant hover:text-primary transition-colors duration-300"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Body */}
          <div 
            className="p-6 overflow-y-auto text-body-md text-on-surface-variant space-y-4 leading-relaxed custom-scrollbar prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />

          {/* Footer */}
          <div className="p-6 border-t border-outline-variant shrink-0 bg-surface-container-lowest flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 btn-primary rounded-lg"
            >
              Anladım ve Kapat
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
