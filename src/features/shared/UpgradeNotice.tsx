import React from 'react';
import { LockKeyhole } from 'lucide-react';

interface UpgradeNoticeProps {
  title: string;
  description: string;
}

export const UpgradeNotice: React.FC<UpgradeNoticeProps> = ({ title, description }) => {
  return (
    <div className="bg-white border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-slate-700 shadow-xs">
      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
        <LockKeyhole className="w-4 h-4" />
      </div>
      <div>
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">{title}</h4>
        <p className="text-[10px] text-slate-500 font-semibold mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
};
