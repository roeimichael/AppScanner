import { notFound } from 'next/navigation';
import { SearchForm } from '@/components/search-form';
import { getSearch } from '@/lib/storage';

export default async function EditSearchPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const search = await getSearch(id);
    if (!search) notFound();
    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-semibold">Edit: {search.name}</h1>
            <SearchForm
                initial={{
                    id: search.id,
                    name: search.name,
                    enabled: search.enabled,
                    intervalMinutes: search.intervalMinutes,
                    sources: search.sources,
                    filters: search.filters,
                    preferences: search.preferences,
                    activeHoursStart: search.activeHoursStart,
                    activeHoursEnd: search.activeHoursEnd,
                }}
            />
        </div>
    );
}
