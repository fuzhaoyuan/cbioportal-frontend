import { Gene, StructuralVariant } from 'cbioportal-ts-api-client';
import {
    INTRAGENIC,
    NO_PARTNER,
} from 'pages/patientView/fusionViewer/data/comparisonRows';
import { classifyFrame } from 'pages/patientView/fusionViewer/data/cohortAggregation';
import { TrackLayout } from 'pages/patientView/fusionViewer/data/trackGeometry';
import { GenomeBuild } from 'pages/patientView/fusionViewer/data/genomeNexusTranscriptService';

export { INTRAGENIC, NO_PARTNER };

export type SvTypeColumn = 'Del' | 'Dup' | 'Inv' | 'Transl';
export const SV_TYPE_COLUMNS: SvTypeColumn[] = ['Del', 'Dup', 'Inv', 'Transl'];

const SV_TYPE_SYNONYMS: { [variantClass: string]: SvTypeColumn } = {
    DEL: 'Del',
    DELETION: 'Del',
    DUP: 'Dup',
    DUPLICATION: 'Dup',
    'TANDEM-DUP': 'Dup',
    TANDEMDUPLICATION: 'Dup',
    INV: 'Inv',
    INVERSION: 'Inv',
    TRA: 'Transl',
    BND: 'Transl',
    TRANSLOCATION: 'Transl',
};

/** One structural variant seen from the queried gene. */
export interface AnchoredStructuralVariant {
    sv: StructuralVariant;
    /** Breakpoint position on the queried gene; undefined when not reported. */
    breakpoint: number | undefined;
    /** Partner symbol, or NO_PARTNER / INTRAGENIC. */
    partner: string;
    svType: SvTypeColumn | undefined;
    inFrame: boolean;
}

export interface PartnerSummary {
    partner: string;
    sampleCount: number;
    eventCount: number;
    eventsByType: { [type in SvTypeColumn]: number };
    anyInFrame: boolean;
}

function isGeneSite(
    gene: Gene,
    symbol: string | undefined,
    entrezGeneId: number | undefined
): boolean {
    return (
        (!!entrezGeneId && entrezGeneId === gene.entrezGeneId) ||
        (!!symbol && symbol === gene.hugoGeneSymbol)
    );
}

function validPosition(p: number | undefined): number | undefined {
    return p !== undefined && p !== null && p > 0 ? p : undefined;
}

export function svTypeColumn(sv: StructuralVariant): SvTypeColumn | undefined {
    return SV_TYPE_SYNONYMS[(sv.variantClass || '').trim().toUpperCase()];
}

export function isInFrame(sv: StructuralVariant): boolean {
    if (classifyFrame(sv.site2EffectOnFrame || '') === 'inFrame') {
        return true;
    }
    // MSK data carries the frame call only in Event_Info, e.g. "Protein Fusion: in frame"
    const info = (sv.eventInfo || '').toLowerCase();
    return (
        /\bin[\s_-]?frame\b/.test(info) &&
        !/out[\s_-]?of[\s_-]?frame/.test(info)
    );
}

export function anchorStructuralVariant(
    sv: StructuralVariant,
    gene: Gene
): AnchoredStructuralVariant {
    const site1 = isGeneSite(gene, sv.site1HugoSymbol, sv.site1EntrezGeneId);
    const site2 = isGeneSite(gene, sv.site2HugoSymbol, sv.site2EntrezGeneId);
    const onSite2Only = site2 && !site1;
    const breakpoint = validPosition(
        onSite2Only ? sv.site2Position : sv.site1Position
    );
    const otherSymbol = (onSite2Only
        ? sv.site1HugoSymbol
        : sv.site2HugoSymbol
    )?.trim();

    let partner: string;
    if (site1 && site2) {
        partner = INTRAGENIC;
    } else if (!otherSymbol || otherSymbol.toUpperCase() === 'NA') {
        partner = NO_PARTNER;
    } else {
        partner = otherSymbol;
    }

    return {
        sv,
        breakpoint,
        partner,
        svType: svTypeColumn(sv),
        inFrame: isInFrame(sv),
    };
}

export function buildPartnerSummaries(
    anchored: AnchoredStructuralVariant[]
): PartnerSummary[] {
    const acc = new Map<
        string,
        { samples: Set<string>; summary: PartnerSummary }
    >();
    anchored.forEach(a => {
        let entry = acc.get(a.partner);
        if (!entry) {
            entry = {
                samples: new Set<string>(),
                summary: {
                    partner: a.partner,
                    sampleCount: 0,
                    eventCount: 0,
                    eventsByType: { Del: 0, Dup: 0, Inv: 0, Transl: 0 },
                    anyInFrame: false,
                },
            };
            acc.set(a.partner, entry);
        }
        entry.samples.add(a.sv.uniqueSampleKey);
        entry.summary.eventCount += 1;
        if (a.svType) entry.summary.eventsByType[a.svType] += 1;
        if (a.inFrame) entry.summary.anyInFrame = true;
    });
    return Array.from(acc.values())
        .map(({ samples, summary }) => ({
            ...summary,
            sampleCount: samples.size,
        }))
        .sort(
            (p, q) =>
                q.sampleCount - p.sampleCount ||
                q.eventCount - p.eventCount ||
                p.partner.localeCompare(q.partner)
        );
}

export type BreakpointSlotKind = 'exon' | 'intron' | 'promoter' | 'downstream';

export interface BreakpointStick {
    key: string;
    kind: BreakpointSlotKind;
    x: number;
    width: number;
    span?: { gStart: number; gEnd: number };
    structuralVariants: StructuralVariant[];
    sampleIds: string[];
    /** Unique samples with a breakpoint of the queried gene in this slot. */
    sampleCount: number;
    /** Unique samples per partner, descending; may sum to more than sampleCount. */
    byCategory: { category: string; sampleCount: number }[];
}

/** One stick per occupied transcript feature slot (exon, intron, ...). */
export function buildBreakpointSticks(
    anchored: AnchoredStructuralVariant[],
    layout: TrackLayout
): BreakpointStick[] {
    const slots = layout.assign(anchored.map(a => a.breakpoint ?? null));
    const acc = new Map<
        string,
        {
            stick: BreakpointStick;
            samples: Set<string>;
            byCat: Map<string, Set<string>>;
        }
    >();
    anchored.forEach((a, i) => {
        const slot = slots[i];
        if (!slot) return;
        let entry = acc.get(slot.key);
        if (!entry) {
            entry = {
                stick: {
                    key: slot.key,
                    kind: slot.key.split(':')[0] as BreakpointSlotKind,
                    x: slot.x,
                    width: slot.width,
                    span: slot.span,
                    structuralVariants: [],
                    sampleIds: [],
                    sampleCount: 0,
                    byCategory: [],
                },
                samples: new Set<string>(),
                byCat: new Map<string, Set<string>>(),
            };
            acc.set(slot.key, entry);
        }
        entry.stick.structuralVariants.push(a.sv);
        entry.samples.add(a.sv.uniqueSampleKey);
        const set = entry.byCat.get(a.partner) ?? new Set<string>();
        set.add(a.sv.uniqueSampleKey);
        entry.byCat.set(a.partner, set);
    });
    return Array.from(acc.values())
        .map(({ stick, samples, byCat }) => ({
            ...stick,
            sampleIds: Array.from(samples),
            sampleCount: samples.size,
            byCategory: Array.from(byCat.entries())
                .map(([category, s]) => ({ category, sampleCount: s.size }))
                .sort(
                    (p, q) =>
                        q.sampleCount - p.sampleCount ||
                        p.category.localeCompare(q.category)
                ),
        }))
        .sort((p, q) => p.x - q.x);
}

export function genomeBuildOf(
    referenceGenome: string | undefined
): GenomeBuild {
    return (referenceGenome || '').toLowerCase().match(/hg19|grch37/)
        ? 'GRCh37'
        : 'GRCh38';
}
