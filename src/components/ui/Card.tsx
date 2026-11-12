import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-xs ${className}`}>{children}</div>
);

export const CardHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, className = '' }) => (
  <div className={`px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 ${className}`}>
    <div>
      <h3 className="text-base font-semibold text-[#172B4D]">{title}</h3>
      {subtitle && <p className="text-xs text-[#64748B] mt-0.5">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`p-5 ${className}`}>{children}</div>;

