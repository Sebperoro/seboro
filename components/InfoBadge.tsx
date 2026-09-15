"use client";

import type { ReactNode } from "react";

export default function InfoBadge({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex min-h-[68px] items-center gap-2.5 rounded-[14px] border border-[#ded7d1] bg-white px-3 py-2.5 md:min-h-[74px] md:gap-3 md:px-4">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#fff3e9] text-sm md:h-9 md:w-9 md:text-base">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#9a8d85] md:text-[9px]">
          {label}
        </p>

        <p className="mt-0.5 truncate text-[13px] font-black text-[#302a26] md:text-sm">
          {value}
        </p>
      </div>
    </div>
  );
}
