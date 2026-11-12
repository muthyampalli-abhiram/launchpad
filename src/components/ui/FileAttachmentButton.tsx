import React, { useState } from 'react';
import { Download, ExternalLink, FileText } from 'lucide-react';
import { formatAppError, getSignedFileUrl } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

export const FileAttachmentButton: React.FC<{
  storagePath: string;
  fileName?: string;
  compact?: boolean;
}> = ({ storagePath, fileName, compact = false }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    setLoading(true);
    try {
      const signedUrl = await getSignedFileUrl(storagePath, 300);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      showToast('error', 'Secure file access failed', formatAppError(err));
    } finally {
      setLoading(false);
    }
  };

  const label = fileName || storagePath.split('/').pop() || 'Attachment';

  return (
    <button
      type="button"
      onClick={handleOpen}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 text-[#172B4D] hover:text-[#2563EB] transition-colors cursor-pointer disabled:opacity-50 ${
        compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs font-medium'
      }`}
    >
      <FileText className="w-3.5 h-3.5 shrink-0 text-[#2563EB]" />
      <span className="truncate max-w-[180px]">{loading ? 'Generating signed URL...' : label}</span>
      {compact ? <ExternalLink className="w-3 h-3 shrink-0" /> : <Download className="w-3.5 h-3.5 shrink-0" />}
    </button>
  );
};

