import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { label: "Tipo" },
  { label: "Dados" },
  { label: "Detalhes" },
  { label: "Confirmação" },
];

export default function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-6">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300",
                  isCompleted && "bg-blue-500 text-white",
                  isCurrent && "bg-blue-500 text-white ring-4 ring-blue-100",
                  !isCompleted && !isCurrent && "bg-slate-100 text-slate-400"
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium uppercase tracking-wider",
                  isCurrent ? "text-blue-600" : "text-slate-400"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-[2px] w-10 mb-5 rounded-full transition-all duration-300",
                  index < currentStep ? "bg-blue-500" : "bg-slate-200"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}