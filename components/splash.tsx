import { Building2 } from 'lucide-react';

// Lightweight branded loading screen for the project.
export function Splash({ label = 'warming up your radar…' }: { label?: string }) {
    return (
        <div className="min-h-[70vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-5">
                <div className="relative">
                    <div className="h-16 w-16 rounded-2xl bg-primary/15 flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-primary animate-pulse" />
                    </div>
                    <span className="absolute inset-0 rounded-2xl border border-primary/30 animate-ping" />
                </div>
                <div className="text-center space-y-1">
                    <div className="text-lg font-semibold tracking-tight">appscanner</div>
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        {label}
                        <span className="inline-flex gap-0.5">
                            <span className="h-1 w-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="h-1 w-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="h-1 w-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
