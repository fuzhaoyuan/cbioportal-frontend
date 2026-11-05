import { assert } from 'chai';
import { Gene, StructuralVariant } from 'cbioportal-ts-api-client';
import {
    anchorStructuralVariant,
    buildBreakpointSticks,
    buildPartnerSummaries,
    INTRAGENIC,
    isInFrame,
    NO_PARTNER,
} from './structuralVariantPartners';
import { TrackLayout } from 'pages/patientView/fusionViewer/data/trackGeometry';
import ResultsViewStructuralVariantMapperDataStore from './ResultsViewStructuralVariantMapperDataStore';

const ALK = { entrezGeneId: 238, hugoGeneSymbol: 'ALK' } as Gene;

function sv(fields: Partial<StructuralVariant>): StructuralVariant {
    return {
        uniqueSampleKey: 's1',
        site1EntrezGeneId: 238,
        site1HugoSymbol: 'ALK',
        site1Position: 100,
        site2EntrezGeneId: 27436,
        site2HugoSymbol: 'EML4',
        site2Position: 900,
        variantClass: 'INVERSION',
        eventInfo: '',
        ...fields,
    } as StructuralVariant;
}

describe('structuralVariantPartners', () => {
    it('takes the queried gene breakpoint from either site', () => {
        const onSite2 = anchorStructuralVariant(
            sv({
                site1EntrezGeneId: 27436,
                site1HugoSymbol: 'EML4',
                site1Position: 900,
                site2EntrezGeneId: 238,
                site2HugoSymbol: 'ALK',
                site2Position: 100,
            }),
            ALK
        );
        assert.equal(onSite2.breakpoint, 100);
        assert.equal(onSite2.partner, 'EML4');
    });

    it('labels intragenic and partnerless events', () => {
        assert.equal(
            anchorStructuralVariant(
                sv({ site2EntrezGeneId: 238, site2HugoSymbol: 'ALK' }),
                ALK
            ).partner,
            INTRAGENIC
        );
        assert.equal(
            anchorStructuralVariant(
                sv({ site2EntrezGeneId: undefined, site2HugoSymbol: '' }),
                ALK
            ).partner,
            NO_PARTNER
        );
    });

    it('reads the frame call from site2EffectOnFrame or Event_Info', () => {
        assert.isTrue(isInFrame(sv({ site2EffectOnFrame: 'in_frame' })));
        assert.isTrue(
            isInFrame(sv({ eventInfo: 'Protein Fusion: in frame {EML4:ALK}' }))
        );
        assert.isFalse(
            isInFrame(sv({ eventInfo: 'Protein Fusion: out of frame' }))
        );
    });

    it('counts samples, events and SV types per partner', () => {
        const summaries = buildPartnerSummaries(
            [
                sv({ uniqueSampleKey: 'a' }),
                sv({ uniqueSampleKey: 'a', variantClass: 'TRANSLOCATION' }),
                sv({ uniqueSampleKey: 'b', site2HugoSymbol: 'KIF5B' }),
            ].map(s => anchorStructuralVariant(s, ALK))
        );
        assert.deepEqual(
            summaries.map(s => [s.partner, s.sampleCount, s.eventCount]),
            [
                ['EML4', 1, 2],
                ['KIF5B', 1, 1],
            ]
        );
        assert.deepEqual(summaries[0].eventsByType, {
            Del: 0,
            Dup: 0,
            Inv: 1,
            Transl: 1,
        });
    });

    it('groups breakpoints into one stick per slot', () => {
        const layout: TrackLayout = {
            slots: [],
            assign: bps =>
                bps.map(bp =>
                    bp === null
                        ? undefined
                        : bp < 500
                        ? { key: 'intron:19', x: 10, width: 5 }
                        : { key: 'exon:20', x: 20, width: 5 }
                ),
        };
        const sticks = buildBreakpointSticks(
            [
                sv({ uniqueSampleKey: 'a', site1Position: 100 }),
                sv({ uniqueSampleKey: 'b', site1Position: 200 }),
                sv({ uniqueSampleKey: 'c', site1Position: 600 }),
                sv({ uniqueSampleKey: 'd', site1Position: -1 }),
            ].map(s => anchorStructuralVariant(s, ALK)),
            layout
        );
        assert.deepEqual(
            sticks.map(s => [s.key, s.kind, s.sampleCount]),
            [
                ['intron:19', 'intron', 2],
                ['exon:20', 'exon', 1],
            ]
        );
    });
});

describe('ResultsViewStructuralVariantMapperDataStore breakpoint filters', () => {
    const eml4 = sv({ uniqueSampleKey: 'a' });
    const kif5b = sv({ uniqueSampleKey: 'b', site2HugoSymbol: 'KIF5B' });
    const partnerOf = (s: StructuralVariant) => s.site2HugoSymbol;

    it('filters rows by partner and by breakpoint slot', () => {
        const store = new ResultsViewStructuralVariantMapperDataStore(
            [[eml4], [kif5b]],
            partnerOf
        );
        store.togglePartner('KIF5B');
        assert.deepEqual(store.sortedFilteredData, [[kif5b]]);

        store.clearPartners();
        store.toggleBreakpointSlot({
            key: 'intron:19',
            label: 'ALK intron 19',
            structuralVariants: new Set([eml4]),
        });
        assert.deepEqual(store.sortedFilteredData, [[eml4]]);

        store.clearBreakpointFilters();
        assert.equal(store.sortedFilteredData.length, 2);
    });

    it('keeps the partner filter when the table search filter is set', () => {
        const store = new ResultsViewStructuralVariantMapperDataStore(
            [[eml4], [kif5b]],
            partnerOf
        );
        store.togglePartner('EML4');
        store.setFilter(() => true);
        assert.deepEqual(store.sortedFilteredData, [[eml4]]);
    });

    it('highlights hovered rows', () => {
        const store = new ResultsViewStructuralVariantMapperDataStore(
            [[eml4], [kif5b]],
            partnerOf
        );
        store.setHoveredStructuralVariants([kif5b]);
        assert.isTrue(store.isHighlighted([kif5b]));
        assert.isFalse(store.isHighlighted([eml4]));
    });
});
