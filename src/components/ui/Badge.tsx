import React from 'react';

type BadgeTone = 'navy' | 'blue' | 'green' | 'amber' | 'red' | 'slate';

const toneStyles: Record<BadgeTone, string> = {
  navy: 'bg-slate-100 text-[#172B4D] border-slate-200',
  blue: 'bg-blue-50 text-[#2563EB] border-blue-200',
  green: 'bg-green-50 text-[#16A34A] border-green-200',
  amber: 'bg-amber-50 text-[#B45309] border-amber-200',
  red: 'bg-red-50 text-[#DC2626] border-red-200',
  slate: 'bg-slate-100 text-[#64748B] border-slate-200',
};

export function inferStatusTone(status: string): BadgeTone {
  const s = status.toLowerCase();
  if (
    s.includes('approved') ||
    s.includes('verified') ||
    s.includes('completed') ||
    s === 'reviewed' ||
    s === 'active' ||
    s === 'l3' ||
    s === 'l2'
  ) {
    return 'green';
  }
  if (
    s.includes('revision') ||
    s.includes('changes') ||
    s.includes('pending') ||
    s.includes('under review') ||
    s.includes('attention') ||
    s.includes('additional') ||
    s.includes('in progress') ||
    s === 'l1'
  ) {
    return 'amber';
  }
  if (
    s.includes('overdue') ||
    s.includes('rejected') ||
    s.includes('delayed') ||
    s.includes('missing') ||
    s.includes('escalated') ||
    s.includes('critical') ||
    s.includes('development required') ||
    s === 'inactive'
  ) {
    return 'red';
  }
  if (s.includes('submitted') || s.includes('assigned') || s.includes('resubmitted')) {
    return 'blue';
  }
  return 'slate';
}

export const Badge: React.FC<{
  children: React.ReactNode;
  tone?: BadgeTone;
  status?: string;
  className?: string;
}> = ({ children, tone, status, className = '' }) => {
  const resolved = tone ?? (status ? inferStatusTone(status) : 'slate');
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${toneStyles[resolved]} ${className}`}
    >
      {children}
    </span>
  );
};

