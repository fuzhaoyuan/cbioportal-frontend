import * as React from 'react';
import { observer } from 'mobx-react';
import { action, computed, observable, makeObservable } from 'mobx';
import autobind from 'autobind-decorator';
import LoadingIndicator from 'shared/components/loadingIndicator/LoadingIndicator';
import { convertToMutationMapperProps } from 'shared/components/mutationMapper/MutationMapperServerConfig';
import { getGenomeNexusHgvsgUrl } from 'shared/api/urls';
import { getServerConfig } from 'config/config';
import GroupComparisonMutationMapper from './GroupComparisonMutationMapper';
import { Mutation } from 'cbioportal-ts-api-client';
import MutationMapperToolStore from 'pages/staticPages/tools/mutationMapper/MutationMapperToolStore';
import GroupComparisonStore from './GroupComparisonStore';
import _ from 'lodash';
import { MakeMobxView } from 'shared/components/MobxView';
import { countUniqueMutations } from 'shared/lib/MutationUtils';
import ErrorMessage from 'shared/components/ErrorMessage';
import { AxisScale, LollipopTooltipCountInfo } from 'react-mutation-mapper';

interface IGroupComparisonMutationsTabPlotProps {
    store: GroupComparisonStore;
    onScaleToggle: (selectedScale: AxisScale) => void;
    mutations?: Mutation[];
    filters?: any;
}

function plotYAxisLabelFormatter(symbol: string, groupName: string) {
    // lowercase = 1 and uppercase = 1.3 (based on 'w' and 'W'), if groupName >= 22 (13 + 9 leniency), stop and + "..."
    let length = 0;
    let label = '';
    for (let c of groupName!) {
        let value = c === c.toLowerCase() ? 1 : 1.3;
        if (length + value >= 22) {
            label += '...';
            break;
        } else {
            label += c;
            length += value;
        }
    }
    return `${symbol} ${label}`;
}

function plotLollipopTooltipCountInfo(
    count: number,
    mutations?: Mutation[],
    axisMode?: AxisScale
): JSX.Element {
    return (
        <LollipopTooltipCountInfo
            count={count}
            mutations={mutations}
            axisMode={axisMode}
        />
    );
}

@observer
export default class GroupComparisonMutationsTabPlot extends React.Component<
    IGroupComparisonMutationsTabPlotProps,
    {}
> {
    constructor(props: IGroupComparisonMutationsTabPlotProps) {
        super(props);
        makeObservable(this);
    }

    @computed get mutationMapperToolStore() {
        const store = new MutationMapperToolStore(this.props.mutations, {
            ...this.props.filters,
            countUniqueMutations: this.countUniqueMutationsInGroup,
        });
        return store;
    }

    @autobind
    protected countUniqueMutationsInGroup(
        mutations: Mutation[],
        group: string
    ) {
        return this.props.store.axisMode === AxisScale.COUNT
            ? countUniqueMutations(mutations)
            : (countUniqueMutations(mutations) /
                  this.props.store.groupToProfiledSamples.result![group]
                      .length) *
                  100;
    }

    readonly plotUI = MakeMobxView({
        await: () => [
            this.props.store.mutations,
            this.props.store.mutationsByGroup,
            this.mutationMapperToolStore.mutationMapperStores,
            this.props.store.coverageInformation,
            this.props.store.groupToProfiledSamples,
        ],
        render: () => {
            if (
                this.mutationMapperToolStore.getMutationMapperStore(
                    this.props.store.activeMutationMapperGene!.hugoGeneSymbol
                )
            ) {
                const mutationMapperStore = this.mutationMapperToolStore.getMutationMapperStore(
                    this.props.store.activeMutationMapperGene!.hugoGeneSymbol
                );
                return (
                    <>
                        <h3>
                            {this.props.store.activeMutationMapperGene
                                ?.hugoGeneSymbol +
                                ' mutations: ' +
                                _(this.props.store.mutationsByGroup.result!)
                                    .keys()
                                    .join(' vs ')}
                        </h3>
                        <GroupComparisonMutationMapper
                            {...convertToMutationMapperProps({
                                ...getServerConfig(),
                            })}
                            generateGenomeNexusHgvsgUrl={hgvsg =>
                                getGenomeNexusHgvsgUrl(hgvsg, undefined)
                            }
                            store={mutationMapperStore}
                            showTranscriptDropDown={true}
                            plotLollipopTooltipCountInfo={
                                plotLollipopTooltipCountInfo
                            }
                            axisMode={this.props.store.axisMode}
                            onScaleToggle={this.props.onScaleToggle}
                            plotYAxisLabelFormatter={plotYAxisLabelFormatter}
                        />
                    </>
                );
            } else {
                if (
                    Object.values(
                        this.props.store.coverageInformation.result!.samples
                    ).some(s => !_.isEmpty(s.allGenes) || !_.isEmpty(s.byGene))
                ) {
                    return (
                        <div style={{ marginTop: '20px' }}>
                            Selected gene has no mutations for profiled samples.
                        </div>
                    );
                } else {
                    return (
                        <div style={{ marginTop: '20px' }}>
                            Selected gene has no mutations due to no profiled
                            samples.
                        </div>
                    );
                }
            }
        },
        renderPending: () => (
            <LoadingIndicator isLoading={true} center={true} size={'big'} />
        ),
        renderError: () => <ErrorMessage />,
    });

    public render() {
        return this.plotUI.component;
    }
}