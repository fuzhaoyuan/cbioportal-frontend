/*
 * Copyright (c) 2018 The Hyve B.V.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as _ from 'lodash';
import { action, computed, makeObservable, observable } from 'mobx';
import {
    getSortedFilteredData,
    SimpleLazyMobXTableApplicationDataStore,
} from 'shared/lib/ILazyMobXTableApplicationDataStore';
import { StructuralVariant } from 'cbioportal-ts-api-client';

export interface IBreakpointSlotSelection {
    key: string;
    label: string;
    structuralVariants: Set<StructuralVariant>;
}

export default class ResultsViewStructuralVariantMapperDataStore extends SimpleLazyMobXTableApplicationDataStore<
    StructuralVariant[]
> {
    /** Restricts the table to this structural variant */
    @observable.ref selectedStructuralVariant: StructuralVariant | undefined;
    @observable.ref highlightedStructuralVariant: StructuralVariant | undefined;

    /** Partner filter of the partner table; empty means no filter. */
    @observable.ref selectedPartners: Set<string> = new Set();
    @observable.ref selectedBreakpointSlot:
        | IBreakpointSlotSelection
        | undefined;
    @observable.ref hoveredStructuralVariants: Set<
        StructuralVariant
    > = new Set();

    constructor(
        data: StructuralVariant[][],
        private partnerOf: (sv: StructuralVariant) => string = () => ''
    ) {
        super(data);
        makeObservable(this);
        // the table search box replaces dataFilter, so the partner and breakpoint filters apply here
        this.getSortedFilteredData = () =>
            getSortedFilteredData(
                this.sortedData,
                this.filterString,
                this.dataFilter
            ).filter(this.passesBreakpointFilters);
        this.dataHighlighter = this.isHighlightedRow;
    }

    @computed get hasBreakpointFilters(): boolean {
        return this.selectedPartners.size > 0 || !!this.selectedBreakpointSlot;
    }

    @computed get passesBreakpointFilters(): (
        row: StructuralVariant[]
    ) => boolean {
        const partners = this.selectedPartners;
        const slot = this.selectedBreakpointSlot;
        return row =>
            (partners.size === 0 || partners.has(this.partnerOf(row[0]))) &&
            (!slot || slot.structuralVariants.has(row[0]));
    }

    @action.bound
    togglePartner(partner: string) {
        const next = new Set(this.selectedPartners);
        if (next.has(partner)) {
            next.delete(partner);
        } else {
            next.add(partner);
        }
        this.selectedPartners = next;
        this.page = 0;
    }

    @action.bound
    toggleBreakpointSlot(selection: IBreakpointSlotSelection) {
        this.selectedBreakpointSlot =
            this.selectedBreakpointSlot?.key === selection.key
                ? undefined
                : selection;
        this.page = 0;
    }

    @action.bound
    clearPartners() {
        this.selectedPartners = new Set();
        this.page = 0;
    }

    @action.bound
    clearBreakpointFilters() {
        this.selectedPartners = new Set();
        this.selectedBreakpointSlot = undefined;
        this.page = 0;
    }

    @action.bound
    setHoveredStructuralVariants(svs: StructuralVariant[] | undefined) {
        this.hoveredStructuralVariants = new Set(svs || []);
    }

    private isHighlightedRow = (row: StructuralVariant[]) =>
        row[0] === this.highlightedStructuralVariant ||
        this.hoveredStructuralVariants.has(row[0]);

    @action.bound
    setSelectedStructuralVariant(sv: StructuralVariant | undefined) {
        this.selectedStructuralVariant = sv;
        this.dataSelector = sv ? row => row[0] === sv : () => false;
    }

    @action.bound
    setHighlightedStructuralVariant(sv: StructuralVariant | undefined) {
        this.highlightedStructuralVariant = sv;
    }

    @computed
    get duplicateStructuralVariantCountInMultipleSamples(): number {
        const countMapper = (structuralVariants: StructuralVariant[]) =>
            structuralVariants.length > 0 ? structuralVariants.length - 1 : 0;

        const sumReducer = (acc: number, current: number) => acc + current;

        return _.chain(this.tableData)
            .flatten()
            .groupBy(structuralVariant => {
                // key = <patient>_<gene1chromosome>_<gene1position>_<gene2chromosome>_<gene2position>
                return `${structuralVariant.patientId}_${structuralVariant.site1Chromosome}_${structuralVariant.site1Position}_${structuralVariant.site2Chromosome}_${structuralVariant.site2Position}`;
            })
            .map(countMapper)
            .reduce(sumReducer, 0)
            .value();
    }
}
