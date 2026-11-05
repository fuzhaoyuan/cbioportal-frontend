/*
 * Copyright (c) 2018 The Hyve B.V.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import StructuralVariantTable, {
    FusionTableColumnType,
    IFusionTableProps,
} from 'shared/components/structuralVariantTable/StructuralVariantTable';
import { StructuralVariant } from 'cbioportal-ts-api-client';
import { fusionViewerPreviewUrl } from './fusionViewerPreviewLink';

const FUSION_VIEWER_COLUMN = 'Fusion Viewer' as FusionTableColumnType;

export interface IResultsViewFusionTableProps extends IFusionTableProps {
    // add results view specific props here if needed
}

export default class ResultsViewStructuralVariantTable extends StructuralVariantTable<
    IResultsViewFusionTableProps
> {
    public static defaultProps = {
        ...StructuralVariantTable.defaultProps,
        // The columns order is defined here
        columns: [
            FusionTableColumnType.STUDY,
            FusionTableColumnType.SAMPLE_ID,
            FusionTableColumnType.CANCER_TYPE_DETAILED,
            FusionTableColumnType.SITE1_HUGO_SYMBOL,
            FusionTableColumnType.SITE1_ENTREZ_GENE_ID,
            FusionTableColumnType.SITE1_ENSEMBL_TRANSCRIPT_ID,
            FusionTableColumnType.SITE1_CHROMOSOME,
            FusionTableColumnType.SITE1_POSITION,
            FusionTableColumnType.SITE1_EXON,
            FusionTableColumnType.SITE1_DESCRIPTION,
            FusionTableColumnType.SITE2_HUGO_SYMBOL,
            FusionTableColumnType.SITE2_ENTREZ_GENE_ID,
            FusionTableColumnType.SITE2_ENSEMBL_TRANSCRIPT_ID,
            FusionTableColumnType.SITE2_CHROMOSOME,
            FusionTableColumnType.SITE2_POSITION,
            FusionTableColumnType.SITE2_EXON,
            FusionTableColumnType.SITE2_DESCRIPTION,
            FusionTableColumnType.SITE2_EFFECT_ON_FRAME,
            FusionTableColumnType.ANNOTATION,
            FusionTableColumnType.MUTATION_STATUS,
            FusionTableColumnType.NCBI_BUILD,
            FusionTableColumnType.DNA_SUPPORT,
            FusionTableColumnType.RNA_SUPPORT,
            FusionTableColumnType.NORMAL_READ_COUNT,
            FusionTableColumnType.TUMOR_READ_COUNT,
            FusionTableColumnType.NORMAL_VARIANT_COUNT,
            FusionTableColumnType.TUMOR_VARIANT_COUNT,
            FusionTableColumnType.NORMAL_PAIRED_END_READ_COUNT,
            FusionTableColumnType.TUMOR_PAIRED_END_READ_COUNT,
            FusionTableColumnType.NORMAL_SPLIT_READ_COUNT,
            FusionTableColumnType.TUMOR_SPLIT_READ_COUNT,
            FusionTableColumnType.SV_DESCRIPTION,
            FusionTableColumnType.BREAKPOINT_TYPE,
            FusionTableColumnType.CENTER,
            FusionTableColumnType.CONNECTION_TYPE,
            FusionTableColumnType.EVENT_INFO,
            FusionTableColumnType.VARIANT_CLASS,
            FUSION_VIEWER_COLUMN,
            FusionTableColumnType.LENGTH,
            FusionTableColumnType.COMMENTS,
        ],
    };

    protected generateColumns() {
        super.generateColumns();
        this._columns[FUSION_VIEWER_COLUMN] = {
            name: FUSION_VIEWER_COLUMN,
            render: (d: StructuralVariant[]) => (
                <a
                    href={fusionViewerPreviewUrl(d[0])}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    data-test="sv-fusion-viewer-link"
                >
                    Open <i className="fa fa-external-link" />
                </a>
            ),
            download: (d: StructuralVariant[]) => fusionViewerPreviewUrl(d[0]),
            tooltip: (
                <span>
                    Open this structural variant in the Fusion Viewer (PR 5483
                    deploy preview)
                </span>
            ),
            visible: true,
        };
    }
}
