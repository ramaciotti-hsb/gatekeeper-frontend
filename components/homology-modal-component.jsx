// -------------------------------------------------------------
// A react component that renders the popup modal for selecting
// homology options when performing automated gating.
// -------------------------------------------------------------

import React from 'react'
import { Component } from 'react'
import _ from 'lodash'
import constants from '../../gatekeeper-utilities/constants'
import '../scss/homology-modal.scss'
import Dropdown from '../lib/dropdown.jsx'
import BivariatePlot from '../containers/bivariate-plot-container.jsx'
import uuidv4 from 'uuid/v4'
import { registerKeyListener, deregisterKeyListener } from '../lib/global-keyboard-listener'

export default class HomologyModal extends Component {

    constructor (props) {
        super(props)
        this.state = {
            edgeDistance: this.props.plotWidth * 0.05,
            minPeakHeight: Math.round(this.props.plotWidth * 0.02),
            minPeakSize: props.selectedFCSFile.machineType === constants.MACHINE_CYTOF ? 2000 : 1000,
            createNegativeGate: false,
            createDoubleZeroGate: false,
            selectingComboGate: false,
            selectedComboGateIds: [],
            highlightedGateIds: [],
            showMinPeakSizeGuide: false,
            showSeedCreator: false,
            initialMousePosition: null
        }

        this.innerRef = React.createRef()
        this.outerRef = React.createRef()
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

    componentDidUpdate (prevProps) {
        if (prevProps.selectedFCSFile.machineType !== this.props.selectedFCSFile.machineType) {
            this.setState({
                minPeakSize: this.props.selectedFCSFile.machineType === constants.MACHINE_CYTOF ? 2000 : 1000
            })
        }
    }

    updateState(key, event) {
        this.state[key] = event.target.value
        this.setState(this.state)
    }

    toggleCreateNegativeGate () {
        const exists = _.find(this.props.unsavedGates, g => g.type === constants.GATE_TYPE_NEGATIVE)
        this.props.api.setUnsavedNegativeGateVisible(!exists)
    }

    toggleCreateDoubleZeroGate () {
        const exists = _.find(this.props.unsavedGates, g => g.type === constants.GATE_TYPE_DOUBLE_ZERO)
        this.props.api.setUnsavedDoubleZeroGateVisible(!exists)
    }

    toggleSelectingComboGate () {
        this.setState({
            selectingComboGate: !this.state.selectingComboGate,
            selectedComboGateIds: []
        })
    }

    toggleSelectComboGateWithId (gateId) {
        let found = false
        for (let i = 0; i < this.state.selectedComboGateIds.length; i++) {
            if (this.state.selectedComboGateIds[i] === gateId) {
                found = true
                this.state.selectedComboGateIds.splice(i, 1)
                break
            }
        }

        if (!found) {
            this.state.selectedComboGateIds.push(gateId)
        }

        this.setState({
            selectedComboGateIds: this.state.selectedComboGateIds.slice(0)
        })
    }

    createComboGate () {
        this.props.api.createUnsavedComboGate(this.state.selectedComboGateIds)
        this.setState({
            selectedComboGateIds: [],
            selectingComboGate: false
        })
    }

    removeComboGate (gateId) {
        this.props.api.removeUnsavedGate(gateId)
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

    setShowMinPeakSizeGuide (show) {
        this.setState({
            showMinPeakSizeGuide: show
        })
    }

    setShowSeedCreator (show) {
        this.setState({
            showSeedCreator: show
        })
    }

    updateWidthIndex(gate, increment, event) {
        if (event.shiftKey) {
            increment *= 10
        }
        this.props.api.updateUnsavedGate(gate.id, { gateCreatorData: { widthIndex: gate.gateCreatorData.widthIndex + increment } })
    }

    createGatesClicked () {
        this.props.setGatingModalErrorMessage('')

        this.setState({
            showSeedCreator: false,
            applyGatesLoading: true
        })

        this.props.api.createUnsavedGatesUsingHomology(this.props.selectedWorkspace.id, this.props.selectedFCSFile.id, this.props.selectedSample.id, {
            selectedXParameter: this.props.modalOptions.selectedXParameter,
            selectedYParameter: this.props.modalOptions.selectedYParameter,
            selectedXScale: this.props.selectedWorkspace.selectedXScale,
            selectedYScale: this.props.selectedWorkspace.selectedYScale,
            machineType: this.props.selectedFCSFile.machineType,
            minXValue: this.props.selectedFCSFile.FCSParameters[this.props.modalOptions.selectedXParameter].statistics.positiveMin,
            maxXValue: this.props.selectedFCSFile.FCSParameters[this.props.modalOptions.selectedXParameter].statistics.max,
            minYValue: this.props.selectedFCSFile.FCSParameters[this.props.modalOptions.selectedYParameter].statistics.positiveMin,
            maxYValue: this.props.selectedFCSFile.FCSParameters[this.props.modalOptions.selectedYParameter].statistics.max,
            plotWidth: this.props.plotWidth,
            plotHeight: this.props.plotHeight,
            edgeDistance: this.state.edgeDistance,
            minPeakHeight: parseInt(this.state.minPeakHeight),
            minPeakSize: parseInt(this.state.minPeakSize),
            seedPeaks: this.props.modalOptions.seedPeaks
        }).finally(() => {
            this.setState({
                applyGatesLoading: false
            })
        })
    }

    applyGatesClicked () {
        this.setState({
            applyGatesLoading: true
        })
        this.props.api.applyUnsavedGatesToSample(this.props.selectedSample.id, {
            selectedXParameter: this.props.modalOptions.selectedXParameter,
            selectedYParameter: this.props.modalOptions.selectedYParameter,
            selectedXScale: this.props.selectedWorkspace.selectedXScale,
            selectedYScale: this.props.selectedWorkspace.selectedYScale,
            machineType: this.props.selectedFCSFile.machineType,
            edgeDistance: this.state.edgeDistance,
            minPeakHeight: parseInt(this.state.minPeakHeight),
            minPeakSize: parseInt(this.state.minPeakSize),
            recalculateGates: true
        }).then(() => {
            this.modalOuterClicked()
        }).finally(() => {
            this.setState({
                applyGatesLoading: false
            })
        })
    }

    componentDidMount () {
        this.keyboardListenerId = uuidv4()
        // Hide the modal when the escape key is pressed
        registerKeyListener(this.keyboardListenerId, constants.CHARACTER_CODE_ESCAPE, () => {
            if (this.state.showSeedCreator) {
                this.setState({
                    showSeedCreator: false
                })
            } else {
                this.modalOuterClicked.bind(this)
            }
        })

        window.addEventListener('mousemove', (event) => {
            if (this.state.draggingModal) {
                this.setState({
                    modalLeft: Math.max(Math.min(event.clientX - this.state.mousePositionDifference[0], this.outerRef.current.clientWidth - 1000), 0),
                    modalTop: Math.max(Math.min(event.clientY - this.state.mousePositionDifference[1], this.outerRef.current.clientHeight - 597), 0),
                })

                window.dispatchEvent(new Event('resize'))
            }
        })

        window.addEventListener('mouseup', () => {
            if (this.state.draggingModal) {
                this.setState({
                    draggingModal: false
                })
            }
        })
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

                    let dismissButton
                    if (!this.state.selectingComboGate) {
                        dismissButton = <i className='lnr lnr-cross-circle' onClick={this.props.api.removeUnsavedGate.bind(null, gate.id)}/>
                    }

                    return (
                        <div className={'gate' + (this.state.selectingComboGate ? ' combo-selection' : '') + (this.state.highlightedGateIds.includes(gate.id) ? ' highlighted' : '') + (this.state.selectedComboGateIds.includes(gate.id) ? ' active' : '')} key={gate.id} onClick={this.state.selectingComboGate ? this.toggleSelectComboGateWithId.bind(this, gate.id) : () => {}}
                        onMouseOver={highlightGate} onMouseOut={unHighlightGate}>
                            <div className='left'>
                                <div className='title'>
                                    <div className='text'>{gate.title}</div>
                                    {dismissButton}
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
                            <div className='dismiss'>
                                <i className='lnr lnr-cross-circle' onClick={this.toggleCreateDoubleZeroGate.bind(this)} />
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
                            <div className='dismiss'>
                                <i className='lnr lnr-cross-circle' onClick={this.removeComboGate.bind(this, gate.id)} />
                            </div>
                            <div className='right'>
                                <i className='lnr lnr-checkmark-circle' />
                            </div>
                        </div>
                    )
                }
            })

            const negativeGateExists = _.find(this.props.unsavedGates, g => g.type === constants.GATE_TYPE_NEGATIVE)
            const doubleZeroGateExists = _.find(this.props.unsavedGates, g => g.type === constants.GATE_TYPE_DOUBLE_ZERO)

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
                                        <div className={'item clickable' + (doubleZeroGateExists ? ' active' : '')} onClick={this.toggleCreateDoubleZeroGate.bind(this)}>
                                            <i className={'lnr ' + (doubleZeroGateExists ? 'lnr-checkmark-circle' : 'lnr-circle-minus')} />
                                            <div>Create Double Zero Gate (Includes All Uncaptured Events)</div>
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
                        <div className={'button apply-gates' + (this.state.applyGatesLoading ? ' disabled' : '')} onClick={this.applyGatesClicked.bind(this)}>
                            <div className={`loader-outer ${this.state.applyGatesLoading ? ' active' : ''}`}><div className='loader small'></div></div>
                            Apply Gates To Sample
                        </div>
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
                <div className='seed-peaks'>
                    <div className='title'>Seed peaks</div>
                    {peaks}
                    <div>
                        <div className={'button toggle-seed-peaks' + (this.state.showSeedCreator ? ' active' : '')} onClick={this.setShowSeedCreator.bind(this, !this.state.showSeedCreator)}>{this.state.showSeedCreator ? 'Mouse Over Plot to Add' : 'Add Seed Peaks'}</div>
                    </div>
                </div>
            )

            contents = (
                <div className='homology-options'>
                    <div className='title'>Homology Options</div>
                    <div className='row'>
                        <div className='text'>Edge Distance</div>
                        <input type='number' value={this.state.edgeDistance} onChange={this.updateState.bind(this, 'edgeDistance')} />
                    </div>
                    <div className='row'>
                        <div className='text'>Minimum Peak Height</div>
                        <input type='number' value={this.state.minPeakHeight} onChange={this.updateState.bind(this, 'minPeakHeight')} />
                    </div>
                    <div className='row'>
                        <div className='text'>Minimum Peak Size</div>
                        <input type='number' value={this.state.minPeakSize} onChange={this.updateState.bind(this, 'minPeakSize')} onMouseOver={this.setShowMinPeakSizeGuide.bind(this, true)} onMouseOut={this.setShowMinPeakSizeGuide.bind(this, false)} />
                    </div>
                    <div className='row'/>
                    {seedPeaks}
                    <div className='divider'></div>
                    <div className={'warning-message' + (this.props.gateHasChildren ? ' active' : '')}>Warning: Current gates and any sub gates will be deleted upon recalculation.</div>
                    <div className={'warning-message' + (this.props.modalOptions.errorMessage ? ' active' : '')}>Error calculating gates: {this.props.modalOptions.errorMessage}</div>
                    <div className='actions'>
                        <div className={'button calculate-homology' + (this.state.applyGatesLoading ? ' disabled' : '')} onClick={this.createGatesClicked.bind(this)}>
                            <div className={`loader-outer ${this.state.applyGatesLoading ? ' active' : ''}`}><div className='loader small'></div></div>
                            Create Gates
                        </div>
                    </div>
                </div>
            )
        }

        const titleParameters = `${this.props.modalOptions.selectedXParameter && this.props.selectedFCSFile.FCSParameters[this.props.modalOptions.selectedXParameter].label} · ${this.props.modalOptions.selectedYParameter && this.props.selectedFCSFile.FCSParameters[this.props.modalOptions.selectedYParameter].label}`

        return (
            <div className={'homology-modal-outer' + (this.props.modalOptions.visible === true ? ' active' : '')} onClick={this.modalOuterClicked.bind(this)} ref={this.outerRef}>
                <div className='homology-modal-inner' ref={this.innerRef} style={{ height: 597, left: this.state.modalLeft, top: this.state.modalTop }} onClick={this.modalInnerClicked} >
                    <div className='upper' onMouseDown={(event) => { this.setState({ draggingModal: true, mousePositionDifference: [event.clientX - this.innerRef.current.offsetLeft, event.clientY - this.innerRef.current.offsetTop] }) }}>
                        <div className='title'>{titleParameters} - Automated gating using Persistent Homology</div>
                    </div>
                    <div className='lower'>
                        <div className='graph'>
                            <BivariatePlot
                                gates={this.props.unsavedGates}
                                setGateHighlight={this.setGateHighlight.bind(this)}
                                showMinPeakSizeGuide={this.state.showMinPeakSizeGuide}
                                minPeakSize={this.state.minPeakSize}
                                showSeedCreator={this.state.showSeedCreator}
                                seedPeaks={this.props.modalOptions.seedPeaks}
                                highlightedGateIds={this.state.highlightedGateIds}
                                sampleId={this.props.selectedSample.id}
                                FCSFileId={this.props.selectedFCSFile.id}
                                showGateTemplatePositions={true}
                                selectedXParameter={this.props.modalOptions.selectedXParameter}
                                selectedYParameter={this.props.modalOptions.selectedYParameter}
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