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

  const handleIconClick = () => {
    if (inputRef.current && !disabled) {
      inputRef.current.showPicker?.();
    }
  };

  const icon = type === 'date' ? (
    // Calendar icon
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ) : (
    // Clock icon
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type={type}
        id={id}
        className={`${className} pr-10`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
      />
      <button
        type="button"
        onClick={handleIconClick}
        disabled={disabled}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-primary-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        tabIndex={-1}
        aria-label={type === 'date' ? 'Apri calendario' : 'Apri selettore orario'}
      >
        {icon}
      </button>
    </div>
  );
}
