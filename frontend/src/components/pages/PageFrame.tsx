import type { ReactNode } from "react";
import { Header } from "@/components/header/Header";
import { cn } from "@/lib/utils";

export function PageFrame({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={cn("min-h-screen bg-neutral-950 text-white", className)}>
      <Header />
      <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-20 sm:px-6">
        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
            PitchPulse
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-100">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-neutral-400">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </main>
  );
}

