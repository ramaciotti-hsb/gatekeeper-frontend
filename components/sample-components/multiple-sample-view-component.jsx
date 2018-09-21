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
import '../../scss/sample-view/sample-gates.scss'

export default class MultipleSampleView extends Component {

    constructor (props) {
        super(props)

        this.state = {
            plotWidthString: props.plotDisplayWidth,
            plotHeightString: props.plotDisplayHeight,
            filterPlotString: '',
            combinations: [],
            flippedCombinations: [],
            scrollTop: 0,
            containerWidth: 1000
        };

        this.state.combinations = this.filterPlots()

        this.panelRef = React.createRef()
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

    matchLabels(xLabel, yLabel, matchString) {
        let matched = true

        // If the match string has no spaces, match both labels
        if (!matchString.match(' ')) {
            matched = xLabel.toLowerCase().match(matchString.toLowerCase()) || yLabel.toLowerCase().match(matchString.toLowerCase())
        } else {
            // Otherwise match all tokens against the combined string
            for (let token of matchString.split(' ')) {
                const combined = xLabel.toLowerCase() + yLabel.toLowerCase()
                if (!combined.match(token.toLowerCase())) {
                    matched = false
                }
            }
        }

        return matched
    }

    updateFilterPlotString (event) {
        const filterString = event.target.value.replace('\\', '')

        this.setState({
            filterPlotString: filterString
        }, () => {
            this.setState({
                combinations: this.filterPlots()
            })
        })
    }

    filterPlots () {
        const combinations = []
        const sorted = _.keys(this.props.FCSFile.FCSParameters).sort((a, b) => {
            if (!a.match(/\d+/)) {
                return 1
            } else if (!b.match(/\d+/)) {
                return -1
            } else {
                return a.match(/\d+/)[0] - b.match(/\d+/)[0]
            }
        })
        for (let i = 0; i < sorted.length; i++) {
            const parameter = this.props.FCSFile.FCSParameters[sorted[i]]
            // Don't bother displaying the plot if the parameter is disabled
            if (this.props.workspace.disabledParameters[parameter.key]) { continue }
            for (let j = i + 1; j < sorted.length; j++) {
                const parameter2 = this.props.FCSFile.FCSParameters[sorted[j]]
                if (this.props.workspace.disabledParameters[parameter2.key]) { continue }

                if (this.matchLabels(parameter.label, parameter2.label, this.state.filterPlotString)) {

                    let shouldAdd = true
                    if (this.props.workspace.hideUngatedPlots) {
                        if (!_.find(this.props.gates, g =>
                            (g.selectedXParameter === parameter.key && g.selectedYParameter === parameter2.key) ||
                            (g.selectedYParameter === parameter.key && g.selectedXParameter === parameter2.key)
                        )) {
                            shouldAdd = false
                        } else {
                            console.log(parameter, parameter2)
                        }
                    }

                    if (shouldAdd) {
                        const keys = [parameter.key, parameter2.key].sort()
                        if (this.props.workspace.invertedAxisPlots[keys[0] + '_' + keys[1]]) {
                            combinations.push([keys[1], keys[0]])
                        } else {
                            combinations.push([keys[0], keys[1]])
                        }
                    }
                }
            }
        }

        return combinations
    }

    componentDidUpdate (prevProps) {
        if (!this.props.sample) {
            return
        }

        let shouldReset = false
        if (!prevProps.sample) {
            shouldReset = true
        } else if (this.props.sample.id !== prevProps.sample.id) {
            shouldReset = true
        } else if (this.props.workspace.hideUngatedPlots !== prevProps.workspace.hideUngatedPlots) {
            shouldReset = true
        } else if (this.props.workspace.invertedAxisPlots !== prevProps.workspace.invertedAxisPlots) {
            shouldReset = true
        } else if (this.props.FCSFile.FCSParameters.length !== prevProps.FCSFile.FCSParameters.length) {
            shouldReset = true
        } else if (!_.isEqual(prevProps.workspace.disabledParameters, this.props.workspace.disabledParameters)) {
            shouldReset = true
        } else if (prevProps.workspace.id !== this.props.workspace.id) {
            shouldReset = true
        }

        if (shouldReset) {
            this.setState({
                combinations: this.filterPlots()
            })
        }

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

        const minIndex = Math.max(0, (Math.floor(this.state.scrollTop / (this.props.plotDisplayHeight + 115)) - 3) * plotsPerRow)
        const maxIndex = Math.min(this.state.combinations.length, (Math.floor(this.state.scrollTop / (this.props.plotDisplayHeight + 115)) + 4) * plotsPerRow)

        const gates = this.state.combinations.slice(minIndex, maxIndex).map((c, index) => {
            if (!this.props.FCSFile.FCSParameters || this.props.FCSFile.FCSParameters.length === 0 || index >= this.state.combinations.length || !this.props.FCSFile.FCSParameters[c[0]] || !this.props.FCSFile.FCSParameters[c[1]]) {
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

        return (
            <div className='panel sample' ref={this.panelRef}>
                <div className={`loader-outer${this.props.sample.loading ? ' active' : ''}`}><div className='loader'></div><div className='text'>{this.props.sample.loadingMessage}</div></div>
                <div className='panel-inner'>
                    <div className='header'>
                        {upperTitle}
                        <div className='lower'>
                            <div className='title'>{this.props.gateTemplate.title}</div>
                            <div className='counts'><abbr className='highlight'>{this.props.sample.populationCount}</abbr> events {/*(<abbr className='highlight'>50%</abbr> of parent)*/}</div>
                            <div className='file-actions'>
                                <div className='download csv' onClick={this.props.api.saveSampleAsCSV.bind(null, this.props.sample.id)}><i className='lnr lnr-download' />Save as CSV</div>
                            </div>
                        </div>
                    </div>
                    <div className='filters'>
                        <input type='text' placeholder='Filter Plots...' value={this.state.filterPlotString} onChange={this.updateFilterPlotString.bind(this)} />
                        <div className={'hide-ungated' + (this.props.workspace.hideUngatedPlots ? ' active' : '')} onClick={this.props.api.updateWorkspace.bind(null, this.props.workspace.id, { hideUngatedPlots: !this.props.workspace.hideUngatedPlots })}><i className={'lnr ' + (this.props.workspace.hideUngatedPlots ? 'lnr-checkmark-circle' : 'lnr-circle-minus')} />Hide Ungated Plots</div>
                        <div className='dimensions plot-width'>
                            <div className='text'>Plot Dimensions: </div>
                            <input type='text' value={this.state.plotWidthString || this.props.plotDisplayWidth} onChange={this.updatePlotDisplayWidth.bind(this)} onBlur={this.setPlotDimensions.bind(this)} onKeyPress={(event) => { event.key === 'Enter' && event.target.blur() }} />
                            <input type='text' value={this.state.plotHeightString || this.props.plotDisplayHeight} onChange={this.updatePlotDisplayHeight.bind(this)} onBlur={this.setPlotDimensions.bind(this)} onKeyPress={(event) => { event.key === 'Enter' && event.target.blur() }} />
                        </div>
                    </div>
                    <div className='gates' onScroll={(e) => { if (Math.abs(e.target.scrollTop - this.state.scrollTop) > (this.props.plotDisplayHeight + 115) * 2) { this.setState({ scrollTop: e.target.scrollTop }) } } }>
                        <div className='gates-inner' style={{ position: 'relative', height: Math.floor((this.state.combinations.length / plotsPerRow) * (this.props.plotDisplayHeight + 115)) }}>
                            {gates}
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}