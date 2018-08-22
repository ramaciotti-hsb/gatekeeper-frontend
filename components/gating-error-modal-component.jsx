// -------------------------------------------------------------
// A react component that renders the popup modal for selecting
// gatingError options when performing automated gating.
// -------------------------------------------------------------

import React from 'react'
import { Component } from 'react'
import _ from 'lodash'
import constants from '../../gatekeeper-utilities/constants'
import '../scss/gating-error-modal.scss'
import Dropdown from '../lib/dropdown.jsx'
import BivariatePlot from '../containers/bivariate-plot-container.jsx'
import uuidv4 from 'uuid/v4'
import { registerKeyListener, deregisterKeyListener } from '../lib/global-keyboard-listener'

export default class GatingErrorModal extends Component {
    
    constructor (props) {
        super(props)
        this.state = {
            highlightedGateIds: [],
            selectedComboGateIds: []
        }
    }

    modalOuterClicked (event) {
        this.props.api.hideGatingModal()
        this.props.api.resetUnsavedGates()
        this.setState({
            showSeedCreator: false
        })
    }

    modalInnerClicked (event) {
        event.stopPropagation()
    }

    updateState(key, event) {
        this.state[key] = event.target.value
        this.setState(this.state)
    }

    setGateHighlight (gateId, highlight) {
        for (let i = 0; i < this.state.highlightedGateIds.length; i++) {
            if (this.state.highlightedGateIds[i] === gateId) {
                this.state.highlightedGateIds.splice(i, 1)
                break
            }
        }

        if (highlight) {
            this.state.highlightedGateIds.push(gateId)
        }

        this.setState({
            highlightedGateIds: this.state.highlightedGateIds.slice(0)
        })
    }

    toggleCreateNegativeGate () {
        const exists = _.find(this.props.unsavedGates, g => g.type === constants.GATE_TYPE_NEGATIVE)
        this.props.api.setUnsavedNegativeGateVisible(!exists)
    }

    toggleSelectingComboGate () {
        this.setState({
            selectingComboGate: !this.state.selectingComboGate,
            selectedComboGateIds: []
        })
    }

    updateWidthIndex(gate, increment, event) {
        if (event.shiftKey) {
            increment *= 10
        }
        this.props.api.updateUnsavedGate(gate.id, { gateCreatorData: { widthIndex: gate.gateCreatorData.widthIndex + increment } })
    }

    applyAutoAnchoring () {
        this.props.setGatingModalErrorMessage('')

        this.setState({
            autoAnchoringLoading: true
        })

        this.props.api.applyErrorHandlerToGatingError(this.props.gatingError.id, { type: constants.GATING_ERROR_HANDLER_AUTO_ANCHOR }).then((result) => {
            this.setState({
                autoAnchoringLoading: false
            })
        })
    }

    resolveErrorUsingIgnore () {
        this.props.api.applyErrorHandlerToGatingError(this.props.gatingError.id, { type: constants.GATING_ERROR_HANDLER_IGNORE }).then((result) => {})
    }

    applyGatesClicked () {
        this.props.api.applyUnsavedGatesToSample(this.props.selectedSample.id, {
            selectedXParameter: this.props.modalOptions.selectedXParameter,
            selectedYParameter: this.props.modalOptions.selectedYParameter,
            selectedXScale: this.props.selectedWorkspace.selectedXScale,
            selectedYScale: this.props.selectedWorkspace.selectedYScale,
            machineType: this.props.selectedFCSFile.machineType,
            edgeDistance: this.state.edgeDistance,
            minPeakHeight: this.state.minPeakHeight
        }).then(this.modalOuterClicked.bind(this))
    }

    recalculateUsingSeedPeaks () {
        this.props.setGatingModalErrorMessage('')

        this.setState({
            manualHandlerLoading: true
        })

        this.props.api.applyErrorHandlerToGatingError(this.props.gatingError.id, { type: constants.GATING_ERROR_HANDLER_MANUAL, seedPeaks: this.props.modalOptions.seedPeaks }).then((result) => {
            this.setState({
                manualHandlerLoading: false
            })
        })
    }

    setShowSeedCreator (show) {
        this.setState({
            showSeedCreator: show
        })
    }

    componentDidMount () {
        this.keyboardListenerId = uuidv4()
        // Dismiss the modal when the escape key is pressed
        registerKeyListener(this.keyboardListenerId, constants.CHARACTER_CODE_ESCAPE, this.modalOuterClicked.bind(this))
    }

    componentWillUnmount () {
        deregisterKeyListener(this.keyboardListenerId)   
    }

    render () {

        if (!this.props.selectedSample.id) {
            return <div></div>
        }

        let contents

        if (this.props.unsavedGates) {
            const gates = this.props.unsavedGates.map((gate) => {
                const highlightGate = this.setGateHighlight.bind(this, gate.id, true)
                const unHighlightGate = this.setGateHighlight.bind(this, gate.id, false)
                if (gate.type === constants.GATE_TYPE_POLYGON) {
                    let cytofOptions
                    if (this.props.selectedFCSFile.machineType === constants.MACHINE_CYTOF) {
                        cytofOptions = (
                            <div className='cytof-options'>
                                <div className='title'>Mass Cytometry Options</div>
                                <div className={'parameter checkbox include-x-zeroes' + (gate.gateCreatorData.includeXChannelZeroes ? ' active' : '')} onClick={this.props.api.updateUnsavedGate.bind(null, gate.id, { gateCreatorData: { includeXChannelZeroes: !gate.gateCreatorData.includeXChannelZeroes } })}>
                                    <i className={'lnr ' + (gate.gateCreatorData.includeXChannelZeroes ? 'lnr-checkmark-circle' : 'lnr-circle-minus')} />
                                    <div className='text'>Include events where {this.props.selectedFCSFile.FCSParameters[gate.selectedXParameter].label} is zero</div>
                                </div>
                                <div className={'parameter checkbox include-y-zeroes' + (gate.gateCreatorData.includeYChannelZeroes ? ' active' : '')} onClick={this.props.api.updateUnsavedGate.bind(null, gate.id, { gateCreatorData: { includeYChannelZeroes: !gate.gateCreatorData.includeYChannelZeroes } })}>
                                    <i className={'lnr ' + (gate.gateCreatorData.includeYChannelZeroes ? 'lnr-checkmark-circle' : 'lnr-circle-minus')} />
                                    <div className='text'>Include events where {this.props.selectedFCSFile.FCSParameters[gate.selectedYParameter].label} is zero</div>
                                </div>
                            </div>
                        )
                    }

                    return (
                        <div className={'gate' + (this.state.selectingComboGate ? ' combo-selection' : '') + (this.state.highlightedGateIds.includes(gate.id) ? ' highlighted' : '') + (this.state.selectedComboGateIds.includes(gate.id) ? ' active' : '')} key={gate.id} onClick={this.state.selectingComboGate ? this.toggleSelectComboGateWithId.bind(this, gate.id) : () => {}}
                        onMouseOver={highlightGate} onMouseOut={unHighlightGate}>
                            <div className='left'>
                                <div className='title'>
                                    <div className='text'>{gate.title}</div>
                                    <i className='lnr lnr-cross-circle' onClick={this.props.api.removeUnsavedGate.bind(null, gate.id)}/>
                                </div>
                                <div className='population-count'>
                                    <div className='highlight'>{gate.includeEventIds.length}</div> events (<div className='highlight'>{(gate.includeEventIds.length / this.props.selectedSample.populationCount * 100).toFixed(1)}%</div> of parent)
                                </div>
                                <div className='additional-options'>
                                    <div className='title'>Gate Options</div>
                                    <div className='parameter width'>
                                        <div className='text'>Additional Width:</div>
                                        <div className='value'>{gate.gateCreatorData.widthIndex}</div>
                                        <i className='lnr lnr-plus-circle' onClick={this.updateWidthIndex.bind(this, gate, 1)} />
                                        <i className='lnr lnr-circle-minus' onClick={this.updateWidthIndex.bind(this, gate, -1)} />
                                    </div>
                                    <div className={'parameter checkbox mark-optional' + (gate.gateCreatorData.optional ? ' active' : '')} onClick={this.props.api.updateUnsavedGate.bind(null, gate.id, { gateCreatorData: { optional: !gate.gateCreatorData.optional } })}>
                                        <i className={'lnr ' + (gate.gateCreatorData.optional ? 'lnr-checkmark-circle' : 'lnr-circle-minus')} />
                                        <div className='text'>Mark population as optional (won't cause an error if it isn't found)</div>
                                    </div>
                                    {cytofOptions}
                                </div>
                            </div>
                            <div className='right'>
                                <i className='lnr lnr-checkmark-circle' />
                            </div>
                        </div>
                    )
                } else if (gate.type === constants.GATE_TYPE_DOUBLE_ZERO) {
                    return (
                        <div className={'gate double-negative' + (this.state.selectingComboGate ? ' combo-selection' : '') + (this.state.highlightedGateIds.includes(gate.id) ? ' highlighted' : '') + (this.state.selectedComboGateIds.includes(gate.id) ? ' active' : '')} key={gate.id} onClick={this.state.selectingComboGate ? this.toggleSelectComboGateWithId.bind(this, gate.id) : () => {}}
                        onMouseOver={highlightGate} onMouseOut={unHighlightGate}>
                            <div className='left'>
                                <div className='title'>
                                    {gate.title}
                                </div>
                                <div className='population-count'>
                                    <div className='highlight'>{gate.includeEventIds.length}</div> events (<div className='highlight'>{(gate.includeEventIds.length / this.props.selectedSample.populationCount * 100).toFixed(1)}%</div> of parent)
                                </div>
                            </div>
                            <div className='right'>
                                <i className='lnr lnr-checkmark-circle' />
                            </div>
                        </div>
                    )
                } else if (gate.type === constants.GATE_TYPE_NEGATIVE) {
                    return (
                        <div className={'gate negative' + (this.state.selectingComboGate ? ' combo-selection' : '') + (this.state.highlightedGateIds.includes(gate.id) ? ' highlighted' : '') + (this.state.selectedComboGateIds.includes(gate.id) ? ' active' : '')} key={gate.id} onClick={this.state.selectingComboGate ? this.toggleSelectComboGateWithId.bind(this, gate.id) : () => {}}
                        onMouseOver={highlightGate} onMouseOut={unHighlightGate}>
                            <div className='left'>
                                <div className='title'>
                                    {gate.title}
                                </div>
                                <div className='population-count'>
                                    <div className='highlight'>{gate.includeEventIds.length}</div> events (<div className='highlight'>{(gate.includeEventIds.length / this.props.selectedSample.populationCount * 100).toFixed(1)}%</div> of parent)
                                </div>
                            </div>
                            <div className='dismiss'>
                                <i className='lnr lnr-cross-circle' onClick={this.toggleCreateNegativeGate.bind(this)} />
                            </div>
                            <div className='right'>
                                <i className='lnr lnr-checkmark-circle' />
                            </div>
                        </div>
                    )
                } else if (gate.type === constants.GATE_TYPE_COMBO && !this.state.selectingComboGate) {
                    const includedGates = _.filter(this.props.unsavedGates, g => gate.gateCreatorData.gateIds.includes(g.id))
                    const comboList = includedGates.map((g) => {
                        return (
                            <div className='included-gate' key={g.id}>{g.title}</div>
                        )
                    })

                    const highlightGates = () => {
                        for (let g of includedGates) {
                            this.setGateHighlight(g.id, true)
                        }
                    }

                    const unHighlightGates = () => {
                        for (let g of includedGates) {
                            this.setGateHighlight(g.id, false)
                        }
                    }

                    return (
                        <div className='gate combo' key={gate.id} onMouseOver={highlightGates} onMouseOut={unHighlightGates}>
                            <div className='left'>
                                <div className='title'>
                                    {gate.title}
                                </div>
                                <div className='population-count'>
                                    <div className='highlight'>{gate.includeEventIds.length}</div> events (<div className='highlight'>{(gate.includeEventIds.length / this.props.selectedSample.populationCount * 100).toFixed(1)}%</div> of parent)
                                </div>
                                <div className='combo-list'>
                                    {comboList}
                                </div>
                            </div>
                            <div className='right'>
                                <i className='lnr lnr-checkmark-circle' />
                            </div>
                        </div>
                    )
                }
            })

            const negativeGateExists = _.find(this.props.unsavedGates, g => g.type === constants.GATE_TYPE_NEGATIVE)

            let panelTitle
            if (this.state.selectingComboGate) {
                panelTitle = (
                    <div className='title'>
                        <div className='text'>Select Gates for New Combo Gate</div>
                        <div className='close-button'>
                            <i className='lnr lnr-cross' onClick={this.toggleSelectingComboGate.bind(this)}></i>
                        </div>
                    </div>
                )
            } else {
                panelTitle = (
                    <div className='title'>
                        <div className='text'>Gates</div>
                        <Dropdown outerClasses='dark' ref={'optionsDropdown'}>
                            <div className='inner'>
                                <div className='icon'><i className='lnr lnr-cog'></i></div>
                                <div className='menu'>
                                    <div className='menu-header'>Gating Options</div>
                                    <div className='menu-inner'>
                                        <div className='item' onClick={this.toggleSelectingComboGate.bind(this)}>
                                            <i className={'lnr lnr-link'} />                                        
                                            <div>Create Combo Gate (Include Events From Multiple Gates)</div>
                                        </div>
                                        <div className={'item clickable' + (negativeGateExists ? ' active' : '')} onClick={this.toggleCreateNegativeGate.bind(this)}>
                                            <i className={'lnr ' + (negativeGateExists ? 'lnr-checkmark-circle' : 'lnr-circle-minus')} />                                        
                                            <div>Create Negative Gate (Includes All Uncaptured Events)</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Dropdown>
                        <div className='close-button'>
                            <i className='lnr lnr-cross' onClick={this.props.api.resetUnsavedGates.bind(null)}></i>
                        </div>
                    </div>
                )
            }

            let actions

            if (this.state.selectingComboGate) {
                actions = (
                    <div className='actions'>
                        <div className={'button apply-gates' + (this.state.selectedComboGateIds.length < 2 ? ' disabled' : '')} onClick={this.createComboGate.bind(this)}>Create Combo Gate</div>
                    </div>
                )
            } else {
                actions = (
                    <div className='actions'>
                        <div className='button apply-gates' onClick={this.applyGatesClicked.bind(this)}>Apply Gates To Sample</div>
                    </div>
                )
            }

            contents = (
                <div className='unsaved-gates'>
                    {panelTitle}
                    <div className='gates'>
                        {gates}
                    </div>
                    {actions}
                </div>
            )
        } else {
            let criteria
            if (this.props.gatingError) {
                criteria = this.props.gatingError.criteria.map((criteria, index) => {
                    return (
                        <div className={'row' + (criteria.status === constants.STATUS_SUCCESS ? ' success' : ' fail')} key={index}>
                            <div className='text'><i className={`lnr lnr-${criteria.status === constants.STATUS_SUCCESS ? 'checkmark' : 'cross'}-circle`}/>{criteria.message}</div>
                            <div className='info'>{criteria.information}</div>
                        </div>
                    )
                })
            }

            const peaks = this.props.modalOptions.seedPeaks.map((peak) => {
                return (
                    <div className='peak' key={peak.id}>
                        <div className='text'>Peak at [{peak.position[0]}, {peak.position[1]}]</div>
                        <div className='close-button'>
                            <i className='lnr lnr-cross' onClick={this.props.removeGatingModalSeedPeak.bind(null, peak.id)}></i>
                        </div>
                    </div>
                )
            })

            const seedPeaks = (
                <div className='handler seed-peaks'>
                    <div className='title'>Manual Resolution using Seed peaks</div>
                    {peaks}
                    <div>
                        <div className={'button toggle-seed-peaks' + (this.state.showSeedCreator ? ' active' : '')} onClick={this.setShowSeedCreator.bind(this, !this.state.showSeedCreator)}>{this.state.showSeedCreator ? 'Mouse Over Plot to Add' : 'Add Seed Peaks'}</div>
                        <div className={'button recalculate' + (this.props.modalOptions.seedPeaks.length === 0 ? ' disabled' : '')} onClick={this.recalculateUsingSeedPeaks.bind(this)}>Recalculate Using Seeds</div>
                    </div>
                </div>
            )


            contents = (
                <div className='gating-errors'>
                    <div className='title first'>Gating Errors</div>
                    {criteria}
                    <div className='title'>Resolve Errors</div>
                    <div className='handler'>
                        <div className='title'>Auto Anchoring</div>
                        <div className='button' onClick={this.applyAutoAnchoring.bind(this)}>
                            <div className={`loader-outer ${this.state.autoAnchoringLoading ? ' active' : ''}`}><div className='loader small'></div></div>
                            Perform Auto Anchoring
                        </div>
                        <div className={'warning-message' + (this.props.modalOptions.errorMessage ? ' active' : '')}>Error calculating gates: {this.props.modalOptions.errorMessage}</div>
                    </div>
                    {seedPeaks}
                    <div className='handler'>
                        <div className='button' onClick={this.resolveErrorUsingIgnore.bind(this)}>
                            Ignore Or Mark Gates Optional
                        </div>
                    </div>
                </div>
            )
        }

        return (
            <div className={'gating-error-outer' + (this.props.modalOptions.visible === true ? ' active' : '')} onClick={this.modalOuterClicked.bind(this)}>
                <div className='gating-error-inner' onClick={this.modalInnerClicked} style={{ height: 597 }}>
                    <div className='upper'>
                        <div className='title'>{this.props.selectedFCSFile.FCSParameters[this.props.modalOptions.selectedXParameter].label} · {this.props.selectedFCSFile.FCSParameters[this.props.modalOptions.selectedYParameter].label} - Automated Gating Errors for {this.props.selectedSample.title}</div>
                    </div>
                    <div className='lower'>
                        <div className='graph'>
                            <BivariatePlot
                                gates={this.props.unsavedGates || this.props.gatingError.gates}
                                highlightedGateIds={this.state.highlightedGateIds}
                                sampleId={this.props.selectedSample.id}
                                FCSFileId={this.props.selectedFCSFile.id}
                                minPeakSize={1000}
                                showSeedCreator={this.state.showSeedCreator}
                                seedPeaks={this.props.modalOptions.seedPeaks}
                                setGateHighlight={this.setGateHighlight.bind(this)}
                                showGateTemplatePositions={true}
                                selectedXParameter={this.props.selectedGateTemplateGroup.selectedXParameter}
                                selectedYParameter={this.props.selectedGateTemplateGroup.selectedYParameter}
                                selectedXScale={this.props.selectedWorkspace.selectedXScale}
                                selectedYScale={this.props.selectedWorkspace.selectedYScale}
                                plotDisplayWidth={500}
                                plotDisplayHeight={500}
                            />
                        </div>
                        {contents}
                    </div>
                </div>
            </div>
        )
    }
}