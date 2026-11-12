import React from 'react';
import { Search } from 'lucide-react';

export const FormField: React.FC<{
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}> = ({ label, required, hint, error, children }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold text-[#172B4D]">
      {label}
      {required && <span className="text-[#DC2626] ml-0.5">*</span>}
    </label>
    {children}
    {hint && !error && <p className="text-[11px] text-[#64748B]">{hint}</p>}
    {error && <p className="text-[11px] text-[#DC2626] font-medium">{error}</p>}
  </div>
);

const baseInputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#172B4D] placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-500';

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...props }) => (
  <input className={`${baseInputClass} ${className}`} {...props} />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <select className={`${baseInputClass} ${className}`} {...props}>
    {children}
  </select>
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  className = '',
  rows = 3,
  ...props
}) => <textarea rows={rows} className={`${baseInputClass} ${className}`} {...props} />;

export const SearchInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder = 'Search...', className = '' }) => (
  <div className={`relative ${className}`}>
    <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${baseInputClass} pl-9`}
    />
  </div>
);

