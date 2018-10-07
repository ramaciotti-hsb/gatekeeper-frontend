// -------------------------------------------------------------------------
// React component for rendering gates that create subsamples.
// -------------------------------------------------------------------------

import React from 'react'
import ReactDOM from 'react-dom'
import { Component } from 'react'
import _ from 'lodash'
import querystring from 'querystring'
import constants from '../../../gatekeeper-utilities/constants'
import pointInsidePolygon from 'point-in-polygon'
import { heatMapHSLStringForValue, getScales, getPlotImageKey } from '../../../gatekeeper-utilities/utilities'
import BivariatePlot from '../../containers/bivariate-plot-container.jsx'
import Dropdown from '../../lib/dropdown.jsx'
import MultiSelectDropdown from '../../lib/multi-select-dropdown.jsx'
import '../../scss/sample-view/sample-gates.scss'

export default class MultipleSampleView extends Component {

    constructor (props) {
        super(props)

        this.state = {
            plotWidthString: props.plotDisplayWidth,
            plotHeightString: props.plotDisplayHeight,
            combinations: [],
            flippedCombinations: [],
            scrollTop: 0,
            containerWidth: 1000
        };

        this.panelRef = React.createRef()
        this.multiSelectRef = React.createRef()
    }

    updateContainerSize () {
        this.setState({ containerWidth: this.panelRef.current.offsetWidth })
    }

    componentDidMount () {
        this.updateContainerSize()
        this.resizeFunction = _.debounce(this.updateContainerSize.bind(this), 100)
        window.addEventListener('resize', this.resizeFunction)
    }

    componentWillUnmount () {
        window.removeEventListener('resize', this.resizeFunction)
    }

    updatePlotDisplayWidth (event) {
        this.setState({
            plotWidthString: event.target.value
        })
    }

    updatePlotDisplayHeight (event) {
        this.setState({
            plotHeightString: event.target.value
        })
    }

    setPlotDimensions () {
        const plotWidth = Math.max(Math.min(parseInt(this.state.plotWidthString, 10), 1000), 0)
        const plotHeight = Math.max(Math.min(parseInt(this.state.plotHeightString, 10), 1000), 0)
        if (!_.isNaN(plotWidth) && !_.isNaN(plotHeight)) {
            this.props.api.setPlotDisplayDimensions(plotWidth, plotHeight).then(() => {
                this.setState({
                    plotWidthString: this.props.plotDisplayWidth,
                    plotHeightString: this.props.plotDisplayHeight
                })
            })
        }
    }

    calculateHomology (selectedXParameter, selectedYParameter) {
        this.props.api.showGatingModal(this.props.sample.id, selectedXParameter, selectedYParameter)
    }

    selectCombination (combination, event) {
        this.props.setFilteredParameters(this.props.workspace.id, this.props.filteredParameters.concat([combination]))
        this.multiSelectRef.current.getInstance().focusInput()
    }

    removeSelectedCombination (combinationIndex, event) {
        this.props.setFilteredParameters(this.props.workspace.id, this.props.filteredParameters.slice(0, combinationIndex).concat(this.props.filteredParameters.slice(combinationIndex + 1)))
    }

    componentDidUpdate (prevProps) {
        if (!this.props.sample) { return }

        if (prevProps.showDisabledParameters !== this.props.showDisabledParameters) {
            this.updateContainerSize()
        }
    }

    render () {
        if (!this.props.FCSFile.filePath && this.props.FCSFile.uploadProgress > 0) {
            return <div className='panel sample' ref={this.panelRef}><div className='loader-outer active'><div className='loader'></div><div className='text'>Uploading {this.props.FCSFile.title}: {this.props.FCSFile.uploadProgress}%</div></div></div>
        }

        if (!this.props.FCSFile.filePath) {
            return <div className='panel sample' ref={this.panelRef}><div className='loader-outer active'><div className='loader'></div><div className='text'>Waiting for FCS File to be uploaded</div></div></div>
        }

        if (_.values(this.props.FCSFile.FCSParameters).length === 0) {
            return <div className='panel sample' ref={this.panelRef}><div className='loader-outer active'><div className='loader'></div><div className='text'>Loading FCS File Metadata</div></div></div>
        }

        if (!this.props.sample) {
            return <div className='panel sample' ref={this.panelRef}><div className='loader-outer active'><div className='text'>No sample for this gate template and FCS file.</div></div></div>
        }

        const plotsPerRow = Math.floor(this.state.containerWidth / (this.props.plotDisplayWidth + 130))

        // Group gates into the 2d parameters that they use
        const gateGroups = {}
        let plots = []

        for (let gate of this.props.gates) {
            const key = `${gate.selectedXParameter}_${gate.selectedYParameter}`

            if (!gateGroups[key]) {
                gateGroups[key] = {
                    label: this.props.FCSFile.FCSParameters[gate.selectedXParameter].label + ' · ' + this.props.FCSFile.FCSParameters[gate.selectedYParameter].label,
                    selectedXParameter: gate.selectedXParameter,
                    selectedYParameter: gate.selectedYParameter,
                    gates: []
                }
            }

            gateGroups[key].gates.push(gate)
        }

        let upperTitle
        if (this.props.gateTemplateGroup && this.props.gateTemplateGroup.parentGateTemplateId) {
            upperTitle = <div className='upper'>Subsample of<a onClick={this.props.api.selectGateTemplate.bind(null, this.props.gateTemplateGroup.parentGateTemplateId, this.props.workspace.id)}>{this.props.parentGateTitle}</a></div>
        } else {
            upperTitle = <div className='upper'>Root Gate</div>
        }

        const combinations = []
        const combinationsToRender = []
        const sorted = _.keys(this.props.FCSFile.FCSParameters).filter(p => !this.props.workspace.disabledParameters[p]).sort((a, b) => {
            if (!a.match(/\d+/)) {
                return 1
            } else if (!b.match(/\d+/)) {
                return -1
            } else {
                return a.match(/\d+/)[0] - b.match(/\d+/)[0]
            }
        })

        for (let i = 0; i < sorted.length; i++) {
            if (!combinations.find(c => c.length === 1 && c[0] === sorted[i])) {
                combinations.push([sorted[i]])
            }
        }

        for (let i = 0; i < sorted.length; i++) {
            for (let j = i + 1; j < sorted.length; j++) {
                const keys = [sorted[i], sorted[j]].sort()
                if (this.props.workspace.invertedAxisPlots[sorted[i] + '_' + sorted[j]]) {
                    combinations.push([sorted[j], sorted[i]])
                } else {
                    combinations.push([sorted[i], sorted[j]])
                }
            }
        }

        for (let i = 0; i < combinations.length; i++) {
            const combination = combinations[i]
            if (combination.length === 1) {
                continue
            }

            let shouldAdd = true

            if (this.props.filteredParameters.length > 0 && !this.props.filteredParameters.find(c => c.length === 1 ? c[0] === combination[0] || c[0] === combination[1] : c[0] === combination[0] && c[1] === combination[1])) {
                shouldAdd = false
            }

            if (this.props.workspace.hideUngatedPlots) {
                if (!_.find(this.props.gates, g => (g.selectedXParameter === combination[0] && g.selectedYParameter === combination[1]) || (g.selectedYParameter === combination[0] && g.selectedXParameter === combination[1]))
                    && !_.find(this.props.gatingErrors, e => e.gateTemplateGroup.selectedXParameter === combination[0] && e.gateTemplateGroup.selectedYParameter === combination[1])) {
                    shouldAdd = false
                }
            }

            if (shouldAdd) {
                combinationsToRender.push(combination)
            }
        }

        const possibleCombinations = combinations.map((c) => {
            const value = c.length === 1 ? this.props.FCSFile.FCSParameters[c[0]].label : this.props.FCSFile.FCSParameters[c[0]].label + '_' + this.props.FCSFile.FCSParameters[c[1]].label
            let selectedIndex
            if (c.length === 1) {
                selectedIndex = this.props.filteredParameters.findIndex(comb => comb[0] === c[0])
            } else {
                selectedIndex = this.props.filteredParameters.findIndex(comb => comb[0] === c[0] && comb[1] === c[1])
            }

            return {
                value,
                component: (
                    <div className={'item' + (selectedIndex > -1 ? ' active' : '')} key={value} onClick={selectedIndex > -1 ? this.removeSelectedCombination.bind(this, selectedIndex) : this.selectCombination.bind(this, c)}>
                        <div className='text'>{c.length === 1 ? this.props.FCSFile.FCSParameters[c[0]].label : `${this.props.FCSFile.FCSParameters[c[0]].label} · ${this.props.FCSFile.FCSParameters[c[1]].label}`}</div>
                        <div className='dot' />
                    </div>
                )
            }
        })

        const selectedCombinations = this.props.filteredParameters.map((c, index) => {
            if (c.length === 1) {
                return <div className='selected-item' key={c[0]}>{this.props.FCSFile.FCSParameters[c[0]].label}<i className='lnr lnr-cross-circle' onClick={this.removeSelectedCombination.bind(this, index)}/></div>
            } else {
                return (
                    <div className='selected-item' key={c[0] + '_' + c[1]}>{this.props.FCSFile.FCSParameters[c[0]].label} · {this.props.FCSFile.FCSParameters[c[1]].label}<i className='lnr lnr-cross-circle' onClick={this.removeSelectedCombination.bind(this, index)}/></div>
                )
            }
        })

        const minIndex = Math.max(0, (Math.floor(this.state.scrollTop / (this.props.plotDisplayHeight + 115)) - 3) * plotsPerRow)
        const maxIndex = Math.min(combinationsToRender.length, (Math.floor(this.state.scrollTop / (this.props.plotDisplayHeight + 115)) + 4) * plotsPerRow)

        const gates = combinationsToRender.filter(c => c.length > 1).slice(minIndex, maxIndex).map((c, index) => {
            if (!this.props.FCSFile.FCSParameters || this.props.FCSFile.FCSParameters.length === 0 || index >= combinationsToRender.length || !this.props.FCSFile.FCSParameters[c[0]] || !this.props.FCSFile.FCSParameters[c[1]]) {
                return null
            }

            const realIndex = index + minIndex
            const inverted = this.props.workspace.invertedAxisPlots[c[0] + '_' + c[1]] || this.props.workspace.invertedAxisPlots[c[1] + '_' + c[0]]

            const parameters = {
                workspaceId: this.props.workspace.id,
                FCSFileId: this.props.FCSFile.id,
                sampleId: this.props.sample.id,
                machineType: this.props.FCSFile.machineType,
                selectedXParameterIndex: this.props.FCSFile.FCSParameters[c[0]].index,
                selectedXScale: this.props.workspace.selectedXScale,
                selectedYParameterIndex: this.props.FCSFile.FCSParameters[c[1]].index,
                selectedYScale: this.props.workspace.selectedYScale,
                minXValue: this.props.FCSFile.FCSParameters[c[0]].statistics.positiveMin,
                maxXValue: this.props.FCSFile.FCSParameters[c[0]].statistics.max,
                minYValue: this.props.FCSFile.FCSParameters[c[1]].statistics.positiveMin,
                maxYValue: this.props.FCSFile.FCSParameters[c[1]].statistics.max,
                plotWidth: this.props.plotWidth,
                plotHeight: this.props.plotHeight
            }

            return (
                <div className='gate-group' key={c[0] + '_' + c[1]} style={{ position: 'absolute', top: (Math.floor(realIndex / plotsPerRow)) * (this.props.plotDisplayHeight + 115), left: (realIndex % plotsPerRow) * (this.props.plotDisplayWidth + 130) }}>
                    <div className='upper'>
                        <div className='selected-parameters'>
                            {this.props.FCSFile.FCSParameters[c[0]].label + ' · ' + this.props.FCSFile.FCSParameters[c[1]].label}
                            <div className={'icon' + (inverted ? ' active' : '')} onClick={this.props.api.invertPlotAxis.bind(null, this.props.workspace.id, c[0], c[1])}><i className='lnr lnr-sync'></i></div>
                        </div>
                        <div className='download-image' draggable={true} onDragStart={() => {console.log('true')}}>
                            <img src={this.props.api.getJobsApiUrl() + '/plot_images?' + querystring.stringify(parameters)} />
                            <i className='lnr lnr-picture'></i>
                        </div>
                        <Dropdown outerClasses='dark'>
                            <div className='inner'>
                                <div className='icon'>Auto Gate</div>
                                <div className='menu'>
                                    <div className='menu-header'>Auto Gating</div>
                                    <div className='menu-inner'>
                                        <div className='item' onClick={this.calculateHomology.bind(this, c[0], c[1])}><div>Persistent Homology</div></div>
                                    </div>
                                </div>
                            </div>
                        </Dropdown>
                    </div>
                    <div className='graph'>
                        <BivariatePlot sampleId={this.props.sample.id} FCSFileId={this.props.FCSFile.id} selectedXParameter={c[0]} selectedYParameter={c[1]} selectedXScale={this.props.workspace.selectedXScale} selectedYScale={this.props.workspace.selectedYScale} />
                    </div>
                </div>
            )
        })

        let gateTemplateTitle
        if (this.state.editingGateTemplateTitle) {
            const updateTitle = () => {
                this.setState({ editingGateTemplateTitle: false })
                this.props.api.updateGateTemplate(this.props.gateTemplate.id, { title: this.state.editedGateTemplateTitle })
            }

            gateTemplateTitle = <input autoFocus={true} className='gate-template-title-input' type='text' value={this.state.editedGateTemplateTitle}
                onChange={(event) => { this.setState({ editedGateTemplateTitle: event.target.value }) }}
                onKeyPress={(event) => { if (event.key === 'Enter') { updateTitle() }}}
                onBlur={updateTitle}
            />
        } else {
            gateTemplateTitle = <div className='text' onClick={() => { this.setState({ editingGateTemplateTitle: true, editedGateTemplateTitle: this.props.gateTemplate.title }) }}>{this.props.gateTemplate.title}</div>
        }

        return (
            <div className='panel sample' ref={this.panelRef}>
                <div className={`loader-outer${this.props.sample.loading ? ' active' : ''}`}><div className='loader'></div><div className='text'>{this.props.sample.loadingMessage}</div></div>
                <div className='panel-inner'>
                    <div className='header'>
                        {upperTitle}
                        <div className='lower'>
                            <div className='title'>
                                {gateTemplateTitle}
                                <div className='file-actions'>
                                    <div className='download csv' onClick={this.props.api.saveSampleAsCSV.bind(null, this.props.sample.id)}><i className='lnr lnr-download' />Save as CSV</div>
                                </div>
                            </div>
                            <div className='counts'><abbr className='highlight'>{this.props.sample.populationCount}</abbr> events {/*(<abbr className='highlight'>50%</abbr> of parent)*/}</div>
                        </div>
                    </div>
                    <div className='filters'>
                        <div className='filter-text-outer'>
                            <MultiSelectDropdown items={possibleCombinations} selectedItems={selectedCombinations} searchPlaceholder={'Type To Filter...'} removeSelectedItem={this.removeSelectedCombination.bind(this)} ref={this.multiSelectRef} />
                            {/*<input type='text' placeholder='Filter Plots...' value={this.state.filterPlotString} onChange={this.updateFilterPlotString.bind(this)} />*/}
                        </div>
                        <div className={'hide-ungated' + (this.props.workspace.hideUngatedPlots ? ' active' : '')} onClick={this.props.api.updateWorkspace.bind(null, this.props.workspace.id, { hideUngatedPlots: !this.props.workspace.hideUngatedPlots })}><i className={'lnr ' + (this.props.workspace.hideUngatedPlots ? 'lnr-checkmark-circle' : 'lnr-circle-minus')} />Only Show Plots With Gates</div>
                        <div className='dimensions plot-width'>
                            <div className='text'>Plot Dimensions: </div>
                            <input type='text' value={this.state.plotWidthString || this.props.plotDisplayWidth} onChange={this.updatePlotDisplayWidth.bind(this)} onBlur={this.setPlotDimensions.bind(this)} onKeyPress={(event) => { event.key === 'Enter' && event.target.blur() }} />
                            <input type='text' value={this.state.plotHeightString || this.props.plotDisplayHeight} onChange={this.updatePlotDisplayHeight.bind(this)} onBlur={this.setPlotDimensions.bind(this)} onKeyPress={(event) => { event.key === 'Enter' && event.target.blur() }} />
                        </div>
                    </div>
                    <div className='gates' onScroll={(e) => { if (Math.abs(e.target.scrollTop - this.state.scrollTop) > (this.props.plotDisplayHeight + 115) * 2) { this.setState({ scrollTop: e.target.scrollTop }) } } }>
                        <div className='gates-inner' style={{ position: 'relative', height: Math.floor((combinationsToRender.length / plotsPerRow) * (this.props.plotDisplayHeight + 115)) }}>
                            {gates}
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}