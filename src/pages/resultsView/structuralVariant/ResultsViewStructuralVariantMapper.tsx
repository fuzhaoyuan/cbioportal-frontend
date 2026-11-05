/*
 * Copyright (c) 2018 The Hyve B.V.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import ResultsViewStructuralVariantTable from './ResultsViewStructuralVariantTable';
import { observer } from 'mobx-react';
import { ResultsViewStructuralVariantMapperStore } from './ResultsViewStructuralVariantMapperStore';
import LoadingIndicator from '../../../shared/components/loadingIndicator/LoadingIndicator';
import { action, computed, makeObservable, observable } from 'mobx';
import {
    getOncoKbIconStyleFromLocalStorage,
    saveOncoKbIconStyleToLocalStorage,
} from 'shared/lib/AnnotationColumnUtils';
import { MakeMobxView } from 'shared/components/MobxView';
import { StructuralVariant } from 'cbioportal-ts-api-client';
import ErrorMessage from 'shared/components/ErrorMessage';
import StructuralVariantChromoscope from './StructuralVariantChromoscope';
import StructuralVariantBreakpoints from './StructuralVariantBreakpoints';
import StructuralVariantPartnerTable from './StructuralVariantPartnerTable';
import { FilterResetPanel } from 'react-mutation-mapper';

export interface IFusionMapperProps {
    store: ResultsViewStructuralVariantMapperStore;
}

@observer
export default class ResultsViewStructuralVariantMapper extends React.Component<
    IFusionMapperProps,
    {}
> {
    @observable mergeFusionTableOncoKbIcons;

    constructor(props: IFusionMapperProps) {
        super(props);
        makeObservable(this);

        this.mergeFusionTableOncoKbIcons = getOncoKbIconStyleFromLocalStorage().mergeIcons;
    }

    @action.bound
    handleOncoKbIconToggle(mergeIcons: boolean) {
        this.mergeFusionTableOncoKbIcons = mergeIcons;
        saveOncoKbIconStyleToLocalStorage({ mergeIcons });
    }

    @action.bound
    handleRowClick(row: StructuralVariant[]) {
        const dataStore = this.props.store.dataStore;
        dataStore.setHighlightedStructuralVariant(
            dataStore.highlightedStructuralVariant === row[0]
                ? undefined
                : row[0]
        );
    }

    @computed get itemsLabelPlural(): string {
        const count = this.props.store.dataStore
            .duplicateStructuralVariantCountInMultipleSamples;
        const structuralVariantsLabel =
            count === 1 ? 'structural variant' : 'structural variants';

        const multipleStructuralVariantInfo =
            count > 0
                ? `: includes ${count} duplicate ${structuralVariantsLabel} in patients with multiple samples`
                : '';

        return `Structural Variants${multipleStructuralVariantInfo}`;
    }

    @computed get breakpointFilterInfo(): string {
        const dataStore = this.props.store.dataStore;
        const parts: string[] = [];
        if (dataStore.selectedPartners.size > 0) {
            parts.push(
                `partner ${Array.from(dataStore.selectedPartners).join(', ')}`
            );
        }
        if (dataStore.selectedBreakpointSlot) {
            parts.push(
                `breakpoint in ${dataStore.selectedBreakpointSlot.label}`
            );
        }
        const n = dataStore.sortedFilteredData.length;
        return `Showing ${n} structural variant${
            n === 1 ? '' : 's'
        } with ${parts.join(' and ')}.`;
    }

    tableUI = MakeMobxView({
        await: () => [
            this.props.store.studyIdToStudy,
            this.props.store.molecularProfileIdToMolecularProfile,
        ],

        render: () => {
            return (
                <>
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 10,
                            alignItems: 'stretch',
                            marginBottom: 10,
                        }}
                    >
                        <div style={{ flex: '0 0 744px', maxWidth: '100%' }}>
                            <StructuralVariantBreakpoints
                                store={this.props.store}
                            />
                        </div>
                        <div style={{ flex: '1 1 480px', minWidth: 0 }}>
                            <StructuralVariantPartnerTable
                                store={this.props.store}
                            />
                        </div>
                    </div>
                    <StructuralVariantChromoscope
                        dataStore={this.props.store.dataStore}
                        studyIdToStudy={this.props.store.studyIdToStudy.result!}
                        entrezGeneId={this.props.store.gene.entrezGeneId}
                    />
                    {this.props.store.dataStore.hasBreakpointFilters && (
                        <FilterResetPanel
                            resetFilters={
                                this.props.store.dataStore
                                    .clearBreakpointFilters
                            }
                            filterInfo={this.breakpointFilterInfo}
                            className="alert alert-success small"
                            buttonClass="btn btn-default btn-xs"
                        />
                    )}
                    <ResultsViewStructuralVariantTable
                        dataStore={this.props.store.dataStore}
                        itemsLabelPlural={this.itemsLabelPlural}
                        studyIdToStudy={this.props.store.studyIdToStudy.result}
                        molecularProfileIdToMolecularProfile={
                            this.props.store
                                .molecularProfileIdToMolecularProfile.result
                        }
                        transcriptToExons={this.props.store.transcriptToExons}
                        uniqueSampleKeyToTumorType={
                            this.props.store.uniqueSampleKeyToTumorType
                        }
                        structuralVariantOncoKbData={
                            this.props.store.structuralVariantOncoKbData
                        }
                        oncoKbCancerGenes={this.props.store.oncoKbCancerGenes}
                        usingPublicOncoKbInstance={
                            this.props.store.usingPublicOncoKbInstance
                        }
                        mergeOncoKbIcons={this.mergeFusionTableOncoKbIcons}
                        onOncoKbIconToggle={this.handleOncoKbIconToggle}
                        onRowClick={this.handleRowClick}
                    />
                </>
            );
        },

        renderPending: () => (
            <LoadingIndicator center={true} isLoading={true} size={'big'} />
        ),
        renderError: () => <ErrorMessage />,
    });

    public render() {
        return this.tableUI.component;
    }
}
