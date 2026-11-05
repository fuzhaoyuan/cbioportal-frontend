import * as React from 'react';
import { observer } from 'mobx-react';
import styles from './structuralVariantPanels.module.scss';
import LazyMobXTable, {
    Column,
} from 'shared/components/lazyMobXTable/LazyMobXTable';
import { colorFor } from 'pages/patientView/fusionViewer/data/partnerPalette';
import { ResultsViewStructuralVariantMapperStore } from './ResultsViewStructuralVariantMapperStore';
import {
    INTRAGENIC,
    NO_PARTNER,
    PartnerSummary,
    SV_TYPE_COLUMNS,
} from './structuralVariantPartners';

export interface IStructuralVariantPartnerTableProps {
    store: ResultsViewStructuralVariantMapperStore;
}

class PartnerTable extends LazyMobXTable<PartnerSummary> {}

// rows that fit beside the breakpoint plot without making the row taller
const ROWS_PER_PAGE = 4;

const SV_TYPE_NAMES: { [type: string]: string } = {
    Del: 'deletion',
    Dup: 'duplication',
    Inv: 'inversion',
    Transl: 'translocation',
};

function framePill(inFrame: boolean) {
    return inFrame ? (
        <span
            style={{
                background: '#dff0d8',
                color: '#3c763d',
                borderRadius: 8,
                padding: '0 6px',
                fontSize: 10.5,
                whiteSpace: 'nowrap',
            }}
        >
            in frame
        </span>
    ) : (
        <span style={{ color: '#999' }}>&mdash;</span>
    );
}

@observer
export default class StructuralVariantPartnerTable extends React.Component<
    IStructuralVariantPartnerTableProps
> {
    private get columns(): Column<PartnerSummary>[] {
        const { store } = this.props;
        const dataStore = store.dataStore;
        const gene = store.gene.hugoGeneSymbol;
        return [
            {
                name: 'Filter',
                render: d => (
                    <input
                        type="checkbox"
                        data-test={`sv-partner-filter-${d.partner}`}
                        aria-label={`Filter the table to ${d.partner}`}
                        checked={dataStore.selectedPartners.has(d.partner)}
                        onChange={() => dataStore.togglePartner(d.partner)}
                    />
                ),
                sortBy: d =>
                    dataStore.selectedPartners.has(d.partner) ? 1 : 0,
                download: d => `${dataStore.selectedPartners.has(d.partner)}`,
                width: 40,
            },
            {
                name: '',
                render: d => (
                    <span
                        style={{
                            display: 'inline-block',
                            width: 9,
                            height: 9,
                            borderRadius: '50%',
                            background: colorFor(
                                store.partnerColorMap,
                                d.partner
                            ),
                        }}
                    />
                ),
                download: () => '',
                width: 16,
            },
            {
                name: `${gene} partner`,
                render: d => (
                    <span
                        style={{
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            fontWeight: dataStore.selectedPartners.has(
                                d.partner
                            )
                                ? 'bold'
                                : undefined,
                        }}
                        onClick={() => dataStore.togglePartner(d.partner)}
                    >
                        {d.partner}
                    </span>
                ),
                sortBy: d => d.partner,
                download: d => d.partner,
                filter: (d, _f, upper) =>
                    d.partner.toUpperCase().indexOf(upper || '') > -1,
            },
            {
                name: '# samples',
                render: d => <span>{d.sampleCount}</span>,
                sortBy: d => d.sampleCount,
                download: d => `${d.sampleCount}`,
                align: 'right',
            },
            {
                name: '# events',
                render: d => <span>{d.eventCount}</span>,
                sortBy: d => d.eventCount,
                download: d => `${d.eventCount}`,
                align: 'right',
            },
            ...SV_TYPE_COLUMNS.map(
                (type): Column<PartnerSummary> => ({
                    name: type,
                    tooltip: <span># {SV_TYPE_NAMES[type]} events</span>,
                    render: d => (
                        <span style={{ color: '#666', fontSize: 11 }}>
                            {d.eventsByType[type] || <>&middot;</>}
                        </span>
                    ),
                    sortBy: d => d.eventsByType[type],
                    download: d => `${d.eventsByType[type]}`,
                    align: 'right',
                })
            ),
            {
                name: 'In-frame?',
                render: d =>
                    d.partner === NO_PARTNER
                        ? framePill(false)
                        : framePill(d.anyInFrame),
                sortBy: d => (d.anyInFrame ? 1 : 0),
                download: d => `${d.anyInFrame}`,
            },
        ];
    }

    private renderFilterHint(selected: string[]) {
        return (
            <div
                style={{
                    float: 'left',
                    lineHeight: '30px',
                    color: '#777',
                    maxWidth: '55%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
                title={selected.join(', ')}
            >
                {selected.length === 0 ? (
                    'Check a partner to filter the table below.'
                ) : (
                    <>
                        <a
                            onClick={() =>
                                this.props.store.dataStore.clearPartners()
                            }
                            style={{ cursor: 'pointer' }}
                        >
                            Clear
                        </a>{' '}
                        filter: {selected.join(', ')}
                    </>
                )}
            </div>
        );
    }

    render() {
        const { store } = this.props;
        const summaries = store.partnerSummaries;
        const partnerGenes = summaries.filter(
            s => s.partner !== NO_PARTNER && s.partner !== INTRAGENIC
        ).length;
        const selected = Array.from(store.dataStore.selectedPartners);
        return (
            <div className={`panel panel-default ${styles.panel}`}>
                <div className="panel-heading" style={{ padding: '7px 10px' }}>
                    <b>{store.gene.hugoGeneSymbol} partners</b>{' '}
                    <span style={{ color: '#777' }}>
                        &mdash; {partnerGenes} partner gene
                        {partnerGenes === 1 ? '' : 's'} across{' '}
                        {store.fusions.length} structural variant
                        {store.fusions.length === 1 ? '' : 's'}
                    </span>
                </div>
                <div
                    className={styles.fillTable}
                    style={{ padding: '0 10px' }}
                    data-test="sv-partner-table"
                >
                    <PartnerTable
                        columns={this.columns}
                        data={summaries}
                        showPagination={true}
                        headerComponent={this.renderFilterHint(selected)}
                        initialItemsPerPage={ROWS_PER_PAGE}
                        paginationProps={{ showMoreButton: false }}
                        showColumnVisibility={false}
                        showCopyDownload={true}
                        initialSortColumn="# samples"
                        initialSortDirection="desc"
                    />
                </div>
            </div>
        );
    }
}
