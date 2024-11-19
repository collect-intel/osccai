interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose?: () => void;
}

export default function Toast({ message, isVisible }: ToastProps) {
  return (
    <div
      className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
                 bg-charcoal text-xs text-white font-mono font-medium px-3 py-1.5
                 rounded transition-opacity duration-300
                 ${isVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
    >
      {message}
    </div>
  );
}
