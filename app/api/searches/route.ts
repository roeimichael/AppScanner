import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listSearches, upsertSearch } from '@/lib/storage';
import { allSourceIds } from '@/lib/sources';

const FilterSchema = z.object({
    dealType: z.enum(['rent', 'sale']).optional(),
    cityId: z.number().int().positive().optional(),
    regionId: z.number().int().positive().optional(),
    minRooms: z.number().min(0).max(20).optional(),
    maxRooms: z.number().min(0).max(20).optional(),
    minPrice: z.number().min(0).optional(),
    maxPrice: z.number().min(0).optional(),
    minSqm: z.number().min(0).optional(),
    maxSqm: z.number().min(0).optional(),
    minFloor: z.number().int().min(-3).max(50).optional(),
    maxFloor: z.number().int().min(-3).max(50).optional(),
    propertyTypes: z.array(z.enum(['apartment', 'garden_apt', 'penthouse', 'rooftop', 'duplex', 'studio', 'private_house', 'cottage'])).optional(),
    parking: z.boolean().optional(),
    elevator: z.boolean().optional(),
    balcony: z.boolean().optional(),
    airCondition: z.boolean().optional(),
    warehouse: z.boolean().optional(),
    accessibility: z.boolean().optional(),
    furniture: z.boolean().optional(),
    renovated: z.boolean().optional(),
    shelter: z.boolean().optional(),
    bars: z.boolean().optional(),
    pets: z.boolean().optional(),
    imageOnly: z.boolean().optional(),
    priceOnly: z.boolean().optional(),
    priceDropped: z.boolean().optional(),
    excludeAgency: z.boolean().optional(),
    neighborhoods: z.array(z.string()).optional(),
    includeKeywords: z.array(z.string()).optional(),
    excludeKeywords: z.array(z.string()).optional(),
});

const PreferencesSchema = z.object({
    idealPrice: z.number().optional(),
    idealSqm: z.number().optional(),
    idealRooms: z.number().optional(),
    idealFloor: z.number().optional(),
    weightPrice: z.number().min(0).max(10).optional(),
    weightSqm: z.number().min(0).max(10).optional(),
    weightRooms: z.number().min(0).max(10).optional(),
    weightFloor: z.number().min(0).max(10).optional(),
    weightAgencyFee: z.number().min(0).max(10).optional(),
    weightParking: z.number().min(0).max(10).optional(),
    weightElevator: z.number().min(0).max(10).optional(),
    weightBalcony: z.number().min(0).max(10).optional(),
    weightAirCondition: z.number().min(0).max(10).optional(),
    weightFurniture: z.number().min(0).max(10).optional(),
    weightShelter: z.number().min(0).max(10).optional(),
    weightWarehouse: z.number().min(0).max(10).optional(),
    weightRenovated: z.number().min(0).max(10).optional(),
    weightPets: z.number().min(0).max(10).optional(),
    weightImage: z.number().min(0).max(10).optional(),
    weightFreshness: z.number().min(0).max(10).optional(),
}).optional();

const CreateSchema = z.object({
    name: z.string().min(1),
    enabled: z.boolean().default(true),
    intervalMinutes: z.number().int().min(15).max(720).default(60),
    sources: z.array(z.string()).min(1),
    filters: FilterSchema,
    preferences: PreferencesSchema,
    activeHoursStart: z.number().int().min(0).max(23).optional(),
    activeHoursEnd: z.number().int().min(0).max(23).optional(),
});

export async function GET() {
    const searches = await listSearches();
    return NextResponse.json({ searches });
}

export async function POST(req: Request) {
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }
    const validSources = parsed.data.sources.filter(s => allSourceIds().includes(s));
    if (validSources.length === 0) {
        return NextResponse.json({ error: 'No valid sources' }, { status: 400 });
    }
    const created = await upsertSearch({
        name: parsed.data.name,
        enabled: parsed.data.enabled,
        intervalMinutes: parsed.data.intervalMinutes,
        sources: validSources,
        filters: parsed.data.filters,
        preferences: parsed.data.preferences,
        activeHoursStart: parsed.data.activeHoursStart,
        activeHoursEnd: parsed.data.activeHoursEnd,
        lastRunAt: null,
        lastRunStatus: null,
        lastRunError: null,
    });
    return NextResponse.json({ search: created });
}
