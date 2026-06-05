import React from "react";
import { cn } from "@/lib/utils";

export default function StatCard({ title, value, icon: Icon, color, bgColor }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 p-6 hover:shadow-md transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
        </div>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", bgColor)}>
          <Icon className={cn("w-5 h-5", color)} />
        </div>
      </div>
    </div>
  );
}