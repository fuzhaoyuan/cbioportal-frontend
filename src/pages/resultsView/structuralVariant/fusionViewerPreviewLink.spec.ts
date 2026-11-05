import { assert } from 'chai';
import { StructuralVariant } from 'cbioportal-ts-api-client';
import {
    fusionViewerFusionId,
    fusionViewerPreviewUrl,
} from './fusionViewerPreviewLink';

const sv = {
    studyId: 'msk_impact_50k_2026',
    sampleId: 'P-0023818-T01-IM6',
    site1HugoSymbol: 'GABPA',
    site2HugoSymbol: 'ERG',
    site1Position: 27139889,
    site2Position: 39755807,
} as StructuralVariant;

describe('fusionViewerPreviewLink', () => {
    it('builds the Fusion Viewer fusion id', () => {
        assert.equal(
            fusionViewerFusionId(sv),
            'P-0023818-T01-IM6_GABPA_ERG_27139889_39755807'
        );
    });

    it('writes 0 for a missing position and an empty site2 gene', () => {
        assert.equal(
            fusionViewerFusionId({
                ...sv,
                site2HugoSymbol: undefined,
                site2Position: -1,
            } as any),
            'P-0023818-T01-IM6_GABPA__27139889_0'
        );
    });

    it('links to the preview with the feature flag on', () => {
        assert.equal(
            fusionViewerPreviewUrl(sv),
            'https://deploy-preview-5483.preview.cbioportal.org/patient/fusionViewer?studyId=msk_impact_50k_2026&sampleId=P-0023818-T01-IM6&fusionId=P-0023818-T01-IM6_GABPA_ERG_27139889_39755807&featureFlags=fusionViewer'
        );
    });
});
