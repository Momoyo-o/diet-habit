import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export default function BottomSheet({ open, onClose, title, children }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative w-full max-w-[420px] bg-white rounded-t-3xl px-4 pt-3 pb-8 max-h-[90vh] overflow-y-auto no-scrollbar animate-slideUp">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
