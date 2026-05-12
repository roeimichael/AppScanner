import type { Source } from './types';
import { yad2Source } from './yad2';
import { onmapSource } from './onmap';
// import { homelessSource } from './homeless';
// Homeless adapter implemented but disabled: their /rent/<city> URLs return cross-country
// promoted ads, not city-filtered listings. Real city-filtered results appear to require
// login. Re-enable once we find a working URL pattern.

export const SOURCES: Record<string, Source> = {
    yad2: yad2Source,
    onmap: onmapSource,
};

export const allSourceIds = () => Object.keys(SOURCES);
export const getSource = (id: string): Source | undefined => SOURCES[id];

export type { Source, FilterSpec, Listing } from './types';
