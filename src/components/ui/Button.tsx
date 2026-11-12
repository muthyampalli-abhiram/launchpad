import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-[#2563EB] text-white hover:bg-blue-700 focus:ring-blue-500 border border-transparent',
  secondary: 'bg-[#172B4D] text-white hover:bg-slate-800 focus:ring-slate-600 border border-transparent',
  outline: 'bg-white text-[#172B4D] border border-slate-300 hover:bg-slate-50 focus:ring-blue-500',
  danger: 'bg-[#DC2626] text-white hover:bg-red-700 focus:ring-red-500 border border-transparent',
  success: 'bg-[#16A34A] text-white hover:bg-green-700 focus:ring-green-500 border border-transparent',
  ghost: 'bg-transparent text-[#64748B] hover:text-[#172B4D] hover:bg-slate-100 border border-transparent',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-sm gap-2',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  type = 'button',
  ...props
}) => {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
};

