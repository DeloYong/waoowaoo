'use client'

import { useTranslations } from 'next-intl'
import { SegmentedControl } from '@/components/ui/SegmentedControl'

// ─── Types ────────────────────────────────────────────

export type AssetKindFilter = 'all' | 'character' | 'location' | 'prop'

interface AssetFilterBarProps {
    /** Current kind filter */
    kindFilter: AssetKindFilter
    onKindFilterChange: (value: AssetKindFilter) => void
    /** Asset counts for display */
    counts: {
        all: number
        character: number
        location: number
        prop: number
    }
}

// ─── Component ────────────────────────────────────────

export default function AssetFilterBar({
    kindFilter,
    onKindFilterChange,
    counts,
}: AssetFilterBarProps) {
    const t = useTranslations('assets')

    const segmentOptions = [
        { value: 'all' as const, label: `${t('filterBar.all')} (${counts.all})` },
        { value: 'character' as const, label: `${t('stage.characters')} (${counts.character})` },
        { value: 'location' as const, label: `${t('stage.locations')} (${counts.location})` },
        { value: 'prop' as const, label: `${t('stage.props')} (${counts.prop})` },
    ]

    return (
        <div className="px-4 py-3 bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_40px_rgba(167,87,255,0.2)] rounded-xl rounded-xl">
            <div className="overflow-x-auto">
                <SegmentedControl
                    options={segmentOptions}
                    value={kindFilter}
                    onChange={onKindFilterChange}
                    layout="compact"
                    className="min-w-max"
                />
            </div>
        </div>
    )
}
