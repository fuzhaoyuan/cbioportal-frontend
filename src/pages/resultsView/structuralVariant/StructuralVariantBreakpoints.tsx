import * as React from 'react';
import * as _ from 'lodash';
import { observer } from 'mobx-react';
import { computed, makeObservable } from 'mobx';
import styles from './structuralVariantPanels.module.scss';
import LoadingIndicator from 'shared/components/loadingIndicator/LoadingIndicator';
import AnchorGeneTrackRuler, {
    getAnchorTrackHeight,
} from 'pages/patientView/fusionViewer/components/AnchorGeneTrackRuler';
import AnchorLollipopTrack from 'pages/patientView/fusionViewer/components/AnchorLollipopTrack';
import { featureSlotLayout } from 'pages/patientView/fusionViewer/data/trackGeometry';
import { slotLabel } from 'pages/patientView/fusionViewer/data/linkAggregation';
import { colorFor } from 'pages/patientView/fusionViewer/data/partnerPalette';
import { TranscriptData } from 'pages/patientView/fusionViewer/data/types';
import { ResultsViewStructuralVariantMapperStore } from './ResultsViewStructuralVariantMapperStore';
import {
    BreakpointStick,
    buildBreakpointSticks,
} from './structuralVariantPartners';
import { LollipopStick } from 'pages/patientView/fusionViewer/data/linkAggregation';

export interface IStructuralVariantBreakpointsProps {
    store: ResultsViewStructuralVariantMapperStore;
}

const WIDTH = 716;
const DRAW_X = 92;
const DRAW_W = WIDTH - DRAW_X - 16;
const LEGEND_H = 44;
const LABELED_STICKS = 3;
const LEGEND_PARTNERS = 5;

@observer
export default class StructuralVariantBreakpoints extends React.Component<
    IStructuralVariantBreakpointsProps
> {
    constructor(props: IStructuralVariantBreakpointsProps) {
        super(props);
        makeObservable(this);
    }

    private get gene(): string {
        return this.props.store.gene.hugoGeneSymbol;
    }

    @computed private get sticks(): BreakpointStick[] {
        const transcript = this.props.store.geneTranscript.result;
        if (!transcript) return [];
        return buildBreakpointSticks(
            this.props.store.anchoredStructuralVariants,
            featureSlotLayout(transcript, DRAW_X, DRAW_W)
        );
    }

    @computed private get stickByKey(): Map<string, BreakpointStick> {
        return new Map(this.sticks.map(s => [s.key, s]));
    }

    @computed private get labelKeys(): Set<string> {
        return new Set(
            _.sortBy(this.sticks, s => -s.sampleCount)
                .slice(0, LABELED_STICKS)
                .filter(s => s.sampleCount > 1)
                .map(s => s.key)
        );
    }

    @computed private get chromosome(): string | undefined {
        const gene = this.props.store.gene;
        for (const sv of this.props.store.fusions) {
            if (sv.site1EntrezGeneId === gene.entrezGeneId) {
                return sv.site1Chromosome;
            }
            if (sv.site2EntrezGeneId === gene.entrezGeneId) {
                return sv.site2Chromosome;
            }
        }
        return undefined;
    }

    private colorOf = (category: string) =>
        colorFor(this.props.store.partnerColorMap, category);

    private onSelect = (stick: LollipopStick) => {
        const s = this.stickByKey.get(stick.key);
        if (!s) return;
        this.props.store.dataStore.toggleBreakpointSlot({
            key: s.key,
            label: `${this.gene} ${slotLabel(s.key)}`,
            structuralVariants: new Set(s.structuralVariants),
        });
    };

    private onHover = (stick: LollipopStick | undefined) => {
        this.props.store.dataStore.setHoveredStructuralVariants(
            stick && this.stickByKey.get(stick.key)?.structuralVariants
        );
    };

    private renderLegend(y: number) {
        const partners = this.props.store.partnerSummaries
            .slice(0, LEGEND_PARTNERS)
            .map(p => p.partner);
        const hasOther =
            this.props.store.partnerSummaries.length > LEGEND_PARTNERS;
        const entries = hasOther ? [...partners, 'other'] : partners;
        let x = DRAW_X + 4;
        return (
            <g fontSize={9.5} fill="#444">
                <text x={DRAW_X - 8} y={y + 3.5} textAnchor="end" fill="#777">
                    partner
                </text>
                {entries.map(p => {
                    const cx = x;
                    x += 22 + p.length * 6;
                    return (
                        <g key={p}>
                            <circle
                                cx={cx}
                                cy={y}
                                r={4.5}
                                fill={this.colorOf(p)}
                            />
                            <text x={cx + 8} y={y + 3.5}>
                                {p}
                            </text>
                        </g>
                    );
                })}
                <circle cx={DRAW_X + 4} cy={y + 17} r={4} fill="#999" />
                <text x={DRAW_X + 12} y={y + 20.5} fill="#777">
                    intron break
                </text>
                <rect
                    x={DRAW_X + 84}
                    y={y + 13}
                    width={8}
                    height={8}
                    fill="#999"
                />
                <text x={DRAW_X + 96} y={y + 20.5} fill="#777">
                    exon break
                </text>
            </g>
        );
    }

    private renderNote(transcript: TranscriptData) {
        const placed = _.sumBy(this.sticks, s => s.structuralVariants.length);
        const total = this.props.store.fusions.length;
        const inIntrons = _.sumBy(
            this.sticks.filter(s => s.kind === 'intron'),
            s => s.structuralVariants.length
        );
        const top = _.maxBy(this.sticks, s => s.structuralVariants.length);
        return (
            <div
                className={styles.pinBottom}
                style={{ fontSize: 11, color: '#888', padding: '0 10px 8px' }}
            >
                {this.gene}-side breakpoints on {transcript.transcriptId}, one
                slot per exon and intron. {placed} of {total} events placed
                {placed > 0 &&
                    `; ${Math.round(
                        (inIntrons / placed) * 100
                    )}% fall in introns`}
                {top &&
                    placed > 0 &&
                    `; ${slotLabel(top.key)} holds ${
                        top.structuralVariants.length
                    }`}
                . Click a lollipop to filter the table.
            </div>
        );
    }

    render() {
        const { store } = this.props;
        const transcript = store.geneTranscript.result;
        const trackH = getAnchorTrackHeight([]);
        return (
            <div className={`panel panel-default ${styles.panel}`}>
                <div className="panel-heading" style={{ padding: '7px 10px' }}>
                    <b>{this.gene} breakpoints</b>{' '}
                    <span style={{ color: '#777' }}>&mdash; all partners</span>
                </div>
                {store.geneTranscript.isPending && (
                    <LoadingIndicator isLoading={true} center={true} />
                )}
                {store.geneTranscript.isComplete && !transcript && (
                    <div style={{ padding: 10, color: '#777' }}>
                        No transcript found for {this.gene} in Genome Nexus.
                    </div>
                )}
                {store.geneTranscript.isError && (
                    <div style={{ padding: 10, color: '#777' }}>
                        Could not load the {this.gene} transcript.
                    </div>
                )}
                {transcript && (
                    <>
                        <svg
                            width={WIDTH}
                            height={trackH + LEGEND_H}
                            data-test="sv-breakpoints-plot"
                        >
                            <AnchorGeneTrackRuler
                                transcript={transcript}
                                symbol={this.gene}
                                breakpoints={[]}
                                drawX={DRAW_X}
                                drawW={DRAW_W}
                                labelX={DRAW_X - 8}
                                labelAnchor="end"
                                mode="feature"
                                chromosome={this.chromosome}
                                hideHistogram={true}
                            />
                            <AnchorLollipopTrack
                                sticks={this.sticks}
                                colorOf={this.colorOf}
                                gene={this.gene}
                                chromosome={this.chromosome}
                                shapeOf={s =>
                                    this.stickByKey.get(s.key)?.kind === 'exon'
                                        ? 'square'
                                        : 'circle'
                                }
                                dominantColor={true}
                                labelKeys={this.labelKeys}
                                selectedKey={
                                    store.dataStore.selectedBreakpointSlot?.key
                                }
                                onSelect={this.onSelect}
                                onHover={this.onHover}
                            />
                            {this.renderLegend(trackH + 8)}
                        </svg>
                        {this.renderNote(transcript)}
                    </>
                )}
            </div>
        );
    }
}
