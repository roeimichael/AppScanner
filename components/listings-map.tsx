'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

interface MapListing {
    sourceId: string;
    token: string;
    link: string;
    image?: string;
    city?: string;
    neighborhood?: string;
    street?: string;
    houseNumber?: number | string;
    rooms?: number;
    sqm?: number;
    price?: number;
    isAgency?: boolean;
    lat?: number;
    lon?: number;
    searchName?: string;
    userState?: 'favorite' | 'dismissed' | null;
    status?: string;
}

const SOURCE_COLOR: Record<string, string> = {
    yad2: '#fb923c',
    onmap: '#2dd4bf',
    homeless: '#a78bfa',
};

// Price-tier-based marker fill: cheaper greener, pricier redder.
const priceColor = (p: number | undefined, min: number, max: number) => {
    if (p == null) return '#888';
    const t = max === min ? 0.5 : (p - min) / (max - min);
    // 0 = green (cheap), 1 = red (expensive); HSL hue 120→0
    const h = (1 - t) * 120;
    return `hsl(${h}, 70%, 50%)`;
};

const fmtPrice = (n?: number) => {
    if (!n) return '—';
    if (n >= 1_000_000) return `₪${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 50_000) return `₪${Math.round(n / 1000)}K`;
    return `₪${n.toLocaleString()}/mo`;
};

function FitBounds({ points }: { points: [number, number][] }) {
    const map = useMap();
    useEffect(() => {
        if (points.length === 0) return;
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }, [points, map]);
    return null;
}

function ClusterLayer({ listings, mode, priceMin, priceMax }: {
    listings: MapListing[];
    mode: 'source' | 'price';
    priceMin: number;
    priceMax: number;
}) {
    const map = useMap();

    useEffect(() => {
        const layer = (L as unknown as { markerClusterGroup: (opts?: object) => L.LayerGroup }).markerClusterGroup({
            showCoverageOnHover: false,
            spiderfyOnMaxZoom: true,
            maxClusterRadius: 45,
            iconCreateFunction: (cluster: { getChildCount: () => number }) => {
                const count = cluster.getChildCount();
                const size = count >= 100 ? 'lg' : count >= 10 ? 'md' : 'sm';
                const dim = size === 'lg' ? 48 : size === 'md' ? 40 : 32;
                return L.divIcon({
                    html: `<div class="map-cluster map-cluster-${size}">${count}</div>`,
                    className: '',
                    iconSize: L.point(dim, dim),
                });
            },
        });

        for (const l of listings) {
            if (typeof l.lat !== 'number' || typeof l.lon !== 'number') continue;
            const fill = mode === 'source' ? (SOURCE_COLOR[l.sourceId] ?? '#888') : priceColor(l.price, priceMin, priceMax);
            const stroke = l.userState === 'favorite' ? '#ec4899' : fill;

            const m = L.circleMarker([l.lat, l.lon], {
                radius: l.userState === 'favorite' ? 9 : 7,
                color: stroke,
                weight: l.userState === 'favorite' ? 3 : 2,
                fillColor: fill,
                fillOpacity: l.userState === 'dismissed' ? 0.25 : 0.7,
            });

            const popup = `
                <div style="font-family: system-ui, sans-serif; min-width: 220px; direction: ltr;">
                    ${l.image ? `<img src="${l.image}" style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:6px;" />` : ''}
                    <div style="font-weight:600;font-size:16px;">${fmtPrice(l.price)}</div>
                    <div style="color:#444;">${l.city ?? ''}</div>
                    <div style="color:#777;font-size:12px;">${[l.neighborhood, l.street, l.houseNumber].filter(Boolean).join(' • ')}</div>
                    <div style="color:#777;font-size:12px;display:flex;gap:8px;">
                        ${l.rooms != null ? `<span>${l.rooms} rooms</span>` : ''}
                        ${l.sqm != null ? `<span>${l.sqm} sqm</span>` : ''}
                    </div>
                    <div style="display:flex;gap:4px;margin-top:6px;align-items:center;">
                        <span style="background:${SOURCE_COLOR[l.sourceId] ?? '#888'}33;color:${SOURCE_COLOR[l.sourceId] ?? '#888'};padding:2px 6px;border-radius:4px;font-size:10px;text-transform:uppercase;font-family:monospace;">${l.sourceId}</span>
                        ${l.isAgency === true ? '<span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-size:10px;">תיווך</span>' : ''}
                        ${l.isAgency === false ? '<span style="background:#d1fae5;color:#065f46;padding:2px 6px;border-radius:4px;font-size:10px;">ללא תיווך</span>' : ''}
                        ${l.userState === 'favorite' ? '<span style="background:#fce7f3;color:#9d174d;padding:2px 6px;border-radius:4px;font-size:10px;">★ favorite</span>' : ''}
                        ${l.status === 'removed' ? '<span style="background:#fee2e2;color:#991b1b;padding:2px 6px;border-radius:4px;font-size:10px;">REMOVED</span>' : ''}
                    </div>
                    <div style="margin-top:6px;display:flex;gap:8px;font-size:12px;">
                        <a href="/listings/${l.sourceId}/${l.token}" style="color:#2563eb;">Details →</a>
                        <a href="${l.link}" target="_blank" rel="noreferrer" style="color:#2563eb;">Source →</a>
                    </div>
                </div>
            `;
            m.bindPopup(popup);
            (layer as unknown as { addLayer: (m: L.Layer) => void }).addLayer(m);
        }

        map.addLayer(layer);
        return () => { map.removeLayer(layer); };
    }, [listings, mode, priceMin, priceMax, map]);

    return null;
}

export function ListingsMap({ listings, colorBy = 'source' }: {
    listings: MapListing[];
    colorBy?: 'source' | 'price';
}) {
    const points = useMemo(
        () => listings.filter(l => typeof l.lat === 'number' && typeof l.lon === 'number')
                     .map(l => [l.lat!, l.lon!] as [number, number]),
        [listings]
    );
    const prices = listings.map(l => l.price).filter((n): n is number => typeof n === 'number');
    const priceMin = prices.length ? Math.min(...prices) : 0;
    const priceMax = prices.length ? Math.max(...prices) : 1;

    return (
        <div className="h-[70vh] w-full rounded-xl overflow-hidden border bg-card relative">
            <MapContainer
                center={[31.7, 35.0]}
                zoom={8}
                scrollWheelZoom
                className="h-full w-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitBounds points={points} />
                <ClusterLayer listings={listings} mode={colorBy} priceMin={priceMin} priceMax={priceMax} />
            </MapContainer>

            <style jsx global>{`
                .map-cluster {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 9999px;
                    color: white;
                    font-weight: 700;
                    font-family: var(--font-geist-mono, monospace);
                    font-size: 13px;
                    border: 2px solid rgba(255, 255, 255, 0.9);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                }
                .map-cluster-sm { width: 32px; height: 32px; background: hsl(220, 70%, 50%); }
                .map-cluster-md { width: 40px; height: 40px; background: hsl(280, 70%, 50%); font-size: 14px; }
                .map-cluster-lg { width: 48px; height: 48px; background: hsl(340, 70%, 50%); font-size: 15px; }
                .leaflet-popup-content-wrapper { border-radius: 8px; }
                .leaflet-popup-content { margin: 10px 12px; }
            `}</style>
        </div>
    );
}
