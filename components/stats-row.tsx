import { Card } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

export interface StatItem {
    label: string;
    value: string | number;
    sub?: string;
    icon?: LucideIcon;
    accent?: 'default' | 'success' | 'warn' | 'danger';
}

const accentClass: Record<NonNullable<StatItem['accent']>, string> = {
    default: 'text-foreground',
    success: 'text-emerald-500',
    warn: 'text-amber-500',
    danger: 'text-destructive',
};

export function StatsRow({ items }: { items: StatItem[] }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {items.map((item) => {
                const Icon = item.icon;
                return (
                    <Card key={item.label} className="p-4 bg-card/50 backdrop-blur">
                        <div className="flex items-center justify-between">
                            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                                {item.label}
                            </div>
                            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className={`mt-2 text-2xl font-semibold font-mono tabular-nums ${accentClass[item.accent ?? 'default']}`}>
                            {item.value}
                        </div>
                        {item.sub && (
                            <div className="text-xs text-muted-foreground mt-1">{item.sub}</div>
                        )}
                    </Card>
                );
            })}
        </div>
    );
}
