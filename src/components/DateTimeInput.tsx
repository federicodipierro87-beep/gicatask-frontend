import { useRef } from 'react';

interface DateTimeInputProps {
  type: 'date' | 'time';
  id: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

export function DateTimeInput({
  type,
  id,
  value,
  onChange,
  className = '',
  required = false,
  disabled = false,
}: DateTimeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOverlayClick = () => {
    if (inputRef.current && !disabled) {
      inputRef.current.showPicker?.();
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type={type}
        id={id}
        className={`${className} [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-0`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
      />
      {/* Overlay cliccabile che copre tutto tranne l'area del testo (circa 70% a sinistra) */}
      <div
        onClick={handleOverlayClick}
        className={`absolute top-0 right-0 bottom-0 w-[40%] cursor-pointer ${disabled ? 'pointer-events-none' : ''}`}
        aria-hidden="true"
      />
    </div>
  );
}
