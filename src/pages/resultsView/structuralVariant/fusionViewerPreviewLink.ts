import { StructuralVariant } from 'cbioportal-ts-api-client';

// Fusion Viewer lives in PR 5483; its deploy preview hosts it until it merges.
export const FUSION_VIEWER_PREVIEW_ORIGIN =
    'https://deploy-preview-5483.preview.cbioportal.org';

function position(p: number | undefined): string {
    return String(p === undefined || p === null || p === -1 ? 0 : p);
}

/** Same id the Fusion Viewer adapter builds for a structural variant. */
export function fusionViewerFusionId(sv: StructuralVariant): string {
    return [
        sv.sampleId || '',
        sv.site1HugoSymbol || '',
        sv.site2HugoSymbol || '',
        position(sv.site1Position),
        position(sv.site2Position),
    ].join('_');
}

export function fusionViewerPreviewUrl(sv: StructuralVariant): string {
    const query = new URLSearchParams({
        studyId: sv.studyId,
        sampleId: sv.sampleId,
        fusionId: fusionViewerFusionId(sv),
        featureFlags: 'fusionViewer',
    });
    return `${FUSION_VIEWER_PREVIEW_ORIGIN}/patient/fusionViewer?${query.toString()}`;
}
