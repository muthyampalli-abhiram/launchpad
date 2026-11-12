import React from 'react';
import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export const LoadingPage: React.FC<{ message?: string }> = ({
  message = 'Loading LAUNCHPAD workspace...',
}) => (
  <div className="min-h-[320px] flex flex-col items-center justify-center p-8 text-center">
    <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin mb-3" />
    <p className="text-sm font-medium text-[#172B4D]">{message}</p>
    <p className="text-xs text-[#64748B] mt-1">Synchronizing records from shared Supabase database</p>
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, description, action, icon }) => (
  <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center flex flex-col items-center">
    <div className="w-12 h-12 rounded-full bg-slate-100 text-[#64748B] flex items-center justify-center mb-3">
      {icon ?? <Inbox className="w-6 h-6" />}
    </div>
    <h4 className="text-sm font-semibold text-[#172B4D]">{title}</h4>
    <p className="text-xs text-[#64748B] mt-1 max-w-md">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({ title = 'Unable to load records', message, onRetry }) => (
  <div className="bg-red-50/70 rounded-xl border border-red-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
    <div className="flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
      <div>
        <h4 className="text-sm font-semibold text-[#172B4D]">{title}</h4>
        <p className="text-xs text-[#64748B] mt-0.5">{message}</p>
      </div>
    </div>
    {onRetry && (
      <Button variant="outline" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={onRetry}>
        Retry
      </Button>
    )}
  </div>
);

