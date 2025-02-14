import React from 'react'
import { Component } from 'react'
import _ from 'lodash'
import path from 'path'
import * as d3 from "d3"
import '../../scss/multiple-sample-view-component.scss'
import uuidv4 from 'uuid/v4'
import querystring from 'querystring'
import polygonsIntersect from 'polygon-overlap'
import pointInsidePolygon from 'point-in-polygon'
import { distanceToPolygon, distanceBetweenPoints } from 'distance-to-polygon'
import constants from '../../../gatekeeper-utilities/constants.js'
import { heatMapHSLStringForValue, getScales, getPolygonCenter } from '../../../gatekeeper-utilities/utilities'
import '../../scss/bivariate-plot-component.scss'

export default class BivariatePlot extends Component {

    constructor(props) {
        super(props)
        this.state = {
            graphMargin: {top: 20, right: 0, bottom: 20, left: 50},
            gateSelection: null,
            truePeaks: [],
            homologyPeaks: [],
            iterations: 0,
            homologyHeight: 100,
            visibleGateTooltipId: null,
            selectedXScale: this.props.selectedXScale || this.props.workspace.selectedXScale,
            selectedYScale: this.props.selectedYScale || this.props.workspace.selectedYScale,
            machineType: this.props.FCSFile.machineType || this.props.workspace.machineType,
            mousePosition: [0, 0],
            imageLoading: true,
        }

        this.cacheImageKey = null
        this.cacheImage = null

        this.graphRef = React.createRef()
        this.gatesRef = React.createRef()
        this.canvasRef = React.createRef()
    }

    // -------------------------------------------------------------------------
    // Uses the Persistent Homology technique to discover peaks / populations in
    // 2d data. Each iteration is calculated on a different iteration of the
    // event loop to prevent blocking for large datasets.
    // -------------------------------------------------------------------------

    // This function takes a two dimensional array (e.g foo[][]) and returns an array of polygons
    // representing discovered peaks. e.g:
    // [[2, 1], [2, 2], [1, 2]]
    initHomologyIteration () {
        // Offset the entire graph and add histograms if we're looking at cytof data
        let xOffset = this.props.FCSFile.machineType === constants.MACHINE_CYTOF ? Math.round(Math.min(this.props.plotWidth, this.props.plotHeight) * 0.07) : 0
        let yOffset = this.props.FCSFile.machineType === constants.MACHINE_CYTOF ? Math.round(Math.min(this.props.plotWidth, this.props.plotHeight) * 0.07) : 0
        const population = this.props.api.getPopulationDataForSample(this.props.sample.id, this.props).then((population) => {
            const scales = getScales({
                selectedXScale: this.props.selectedXScale,
                selectedYScale: this.props.selectedYScale,
                xRange: [ this.props.FCSFile.FCSParameters[this.props.selectedXParameter].statistics.min, this.props.FCSFile.FCSParameters[this.props.selectedXParameter].statistics.max ],
                yRange: [ this.props.FCSFile.FCSParameters[this.props.selectedYParameter].statistics.min, this.props.FCSFile.FCSParameters[this.props.selectedYParameter].statistics.max ],
                width: this.props.plotWidth - xOffset,
                height: this.props.plotHeight - yOffset
            })

            const homology = new PersistantHomology({
                sample: this.props.sample,
                population,
                options: this.props
            })

            this.setState({
                densityMap: population.densityMap,
                homology
            })
        })
    }

    performHomologyIteration (edgeDistance = 20, minPeakHeight = 4) {
        if (!this.state.homology) {
            this.initHomologyIteration()
        } else {
            this.state.homology.performHomologyIteration(this.state.homologyHeight)
            this.state.homologyPeaks = this.state.homology.homologyPeaks
            this.setState({ homologyHeight: this.state.homologyHeight - 1 }, this.createGraphLayout)
        }
    }

    createGraphLayout () {
        d3.select(this.graphRef.current).selectAll(':scope > *').remove();

        // Need to offset the whole graph if we're including cytof 0 histograms
        const xOffset = this.props.FCSFile.machineType === constants.MACHINE_CYTOF ? Math.round(Math.min(this.props.plotWidth, this.props.plotHeight) * 0.07) * (this.props.plotDisplayWidth / this.props.plotWidth) : 0
        const yOffset = this.props.FCSFile.machineType === constants.MACHINE_CYTOF ? Math.round(Math.min(this.props.plotWidth, this.props.plotHeight) * 0.07) * (this.props.plotDisplayHeight / this.props.plotHeight) : 0

        const xStats = this.props.FCSFile.FCSParameters[this.props.selectedXParameter].statistics
        const yStats = this.props.FCSFile.FCSParameters[this.props.selectedYParameter].statistics
        const scales = getScales({
            selectedXScale: this.props.selectedXScale,
            selectedYScale: this.props.selectedYScale,
            xRange: [ this.props.selectedXScale === constants.SCALE_LOG ? xStats.positiveMin : xStats.min, xStats.max ],
            yRange: [ this.props.selectedYScale === constants.SCALE_LOG ? yStats.positiveMin : yStats.min, yStats.max ],
            width: this.props.plotDisplayWidth - xOffset,
            height: this.props.plotDisplayHeight - yOffset
        })

        // let xScale
        // let yScale
        // // If we should invert axis for this plot
        // if (this.props.workspace.invertedAxisPlots[this.props.selectedXParameter + '_' + this.props.selectedYParameter]) {
        //     const
        // }

        const xAxis = d3.axisBottom().scale(scales.xScale).tickFormat(d3.format(".2s")).ticks(Math.round(this.props.plotDisplayWidth / 40))
        const yAxis = d3.axisLeft().scale(scales.yScale).tickFormat(d3.format(".2s")).ticks(Math.round(this.props.plotDisplayHeight / 40))

        const columnWidth = 1
        const rowWidth = 10

        const color = d3.scaleOrdinal(d3.schemeCategory10)
        const svg = d3.select(this.graphRef.current)
        const custom = d3.select(document.createElement('custom'))
        this.svgElement = custom
        // const tooltip = d3.select("#tooltip")
        // x-axis
        svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(" + xOffset + "," + this.props.plotDisplayHeight + ")")
          .call(xAxis)
        .append("text")
          .attr("class", "label")
          .attr("x", this.props.plotDisplayWidth)
          .attr("y", -6)
          .style("text-anchor", "end")

        // y-axis
        svg.append("g")
          .attr("class", "y axis")
          // .attr('transform', 'translate(0, -' + yOffset + ')')
          .call(yAxis)
        .append("text")
          .attr("class", "label")
          .attr("transform", "rotate(-90)")
          .attr("y", 6)
          .attr("dy", ".71em")
          .style("text-anchor", "end")

        // Create bindings for drawing rectangle gates
        const rect = (x, y, w, h) => {
            // Limit to the  of the scatter plot
            if (w > 0) {
                // If the width is positive, cap at rightmost boundary
                w = Math.min(w, this.props.plotDisplayWidth - x)
            } else {
                // If the width is negative, cap at leftmost boundary
                w = Math.max(w, -x)
            }

            if (h > 0) {
                // If the height is positive, cap at lower boundary (coords start from top left and y increases downwards)
                h = Math.min(h, this.props.plotDisplayHeight - y)
            } else {
                // If the height is negative, cap at upper boundary (0)
                h = Math.max(h, -y)
            }
            return "M" + [x, y] + " l" + [w, 0] + " l" + [0, h] + " l" + [-w, 0] + "z";
        }


        const svgGates = d3.select("svg.gates")
        var selection = svgGates.append("path")
          .attr("class", "selection")
          .attr("visibility", "hidden");

        const margin = this.state.graphMargin
        var startSelection = (start) => {
            selection.attr("d", rect(start[0] - margin.left, start[1] - margin.top, 0, 0))
              .attr("visibility", "visible");
        };

        // Draw each individual custom element with their properties.
        var canvas = d3.select(this.canvasRef.current)
          .attr('width', this.props.plotDisplayWidth)
          .attr('height', this.props.plotDisplayHeight);

        var context = canvas.node().getContext('2d')

        const widthDisplayRatio = this.props.plotDisplayWidth / this.props.plotWidth
        const heightDisplayRatio = this.props.plotDisplayHeight / this.props.plotHeight

        const redrawGraph = (cacheImage) => {
            // Determine if there are any 2d gates in the subsamples that match these parameters
            let gatesExist = false
            let filteredGates = _.filter(this.props.gates, g => g.type === constants.GATE_TYPE_POLYGON)
            for (let gate of filteredGates) {
                if (gate.selectedXParameter === this.props.selectedXParameter &&
                    gate.selectedYParameter === this.props.selectedYParameter) {
                    gatesExist = true
                }
            }
            gatesExist = this.state.homologyPeaks.length === 0 && gatesExist

            context.drawImage(cacheImage, 0, 0, this.props.plotDisplayWidth, this.props.plotDisplayHeight)
            const imageData = context.getImageData(0, 0, this.props.plotDisplayWidth, this.props.plotDisplayHeight);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                // Inside the gate, render as greyscale
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i]     = avg; // red
                data[i + 1] = avg; // green
                data[i + 2] = avg; // blue
            }

            context.putImageData(imageData, 0, 0);

            if (gatesExist) {
                // Redraw the image and greyscale any points that are outside the gate
                context.beginPath();

                for (let gate of filteredGates) {
                    if (gate.type !== constants.GATE_TYPE_POLYGON) { return }

                    const polygon = gate.renderedPolygon.map(p => [ (p[0] * widthDisplayRatio) + xOffset, p[1] * heightDisplayRatio ])

                    context.moveTo(polygon[0][0], polygon[0][1])
                    for (let i = 1; i < polygon.length; i++) {
                        context.lineTo(polygon[i][0], polygon[i][1])
                    }
                    context.lineTo(polygon[0][0], polygon[0][1])

                    if (gate.gateCreatorData.includeXChannelZeroes) {
                        const xCutoffs = gate.renderedXCutoffs.map(cutoff => cutoff * widthDisplayRatio)
                        context.moveTo(0, xCutoffs[0])
                        context.lineTo(xOffset, xCutoffs[0])
                        context.lineTo(xOffset, xCutoffs[1])
                        context.lineTo(0, xCutoffs[1])
                        context.lineTo(0, xCutoffs[0])
                    }

                    if (gate.gateCreatorData.includeYChannelZeroes) {
                        const yCutoffs = gate.renderedYCutoffs.map(cutoff => cutoff * heightDisplayRatio)
                        context.moveTo(yCutoffs[0] + xOffset, this.props.plotDisplayWidth)
                        context.lineTo(yCutoffs[0] + xOffset, this.props.plotDisplayWidth - yOffset)
                        context.lineTo(yCutoffs[1] + xOffset, this.props.plotDisplayWidth - yOffset)
                        context.lineTo(yCutoffs[1] + xOffset, this.props.plotDisplayWidth)
                        context.lineTo(yCutoffs[0] + xOffset, this.props.plotDisplayWidth)
                    }

                    if (gate.gateCreatorData.includeXChannelZeroes === true && gate.gateCreatorData.includeYChannelZeroes === true) {
                        context.moveTo(0, this.props.plotDisplayWidth - yOffset)
                        context.lineTo(xOffset, this.props.plotDisplayWidth - yOffset)
                        context.lineTo(xOffset, this.props.plotDisplayWidth)
                        context.lineTo(0, this.props.plotDisplayWidth)
                        context.lineTo(0, this.props.plotDisplayWidth - yOffset)
                    }
                }

                context.closePath();
                context.clip();

                context.drawImage(cacheImage, 0, 0, this.props.plotDisplayWidth, this.props.plotDisplayHeight)
            } else if (this.state.homologyHeight < 100) {
                // Redraw the image and greyscale any points that are outside the gate
                const imageData = context.getImageData(0, 0, this.props.plotDisplayWidth, this.props.plotDisplayHeight);
                const data = imageData.data;
                let gatesToRender = []

                for (let i = 0; i < data.length; i += 4) {
                    // Inside the gate, render as greyscale
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    data[i]     = avg; // red
                    data[i + 1] = avg; // green
                    data[i + 2] = avg; // blue
                }

                context.putImageData(imageData, 0, 0);

                // Render the gate outlines over the top
                for (let i = 0; i < this.state.homologyPeaks.length; i++) {
                    const gate = this.state.homologyPeaks[i]
                    context.beginPath();
                    context.moveTo(gate.polygon[0][0] + xOffset, gate.polygon[0][1])
                    for (let point of gate.polygon) {
                        context.lineTo(point[0] + xOffset, point[1])
                    }
                    context.closePath()
                    context.stroke()
                }
            } else {
                context.drawImage(cacheImage, 0, 0, this.props.plotDisplayWidth, this.props.plotDisplayHeight)
            }

            let selectionMinX, selectionMaxX, selectionMinY, selectionMaxY
        }


        if (this.cacheImage) {
            this.cacheImage.onLoad = null
        }

        let parameters

        if (this.props.sample) {
            parameters = {
                workspaceId: this.props.workspace.id,
                FCSFileId: this.props.FCSFile.id,
                sampleId: this.props.sample.id,
                machineType: this.props.machineType,
                selectedXParameterIndex: this.props.FCSFile.FCSParameters[this.props.selectedXParameter].index,
                selectedXScale: this.props.selectedXScale,
                selectedYParameterIndex: this.props.FCSFile.FCSParameters[this.props.selectedYParameter].index,
                selectedYScale: this.props.selectedYScale,
                minXValue: this.props.FCSFile.FCSParameters[this.props.selectedXParameter].statistics.positiveMin,
                maxXValue: this.props.FCSFile.FCSParameters[this.props.selectedXParameter].statistics.max,
                minYValue: this.props.FCSFile.FCSParameters[this.props.selectedYParameter].statistics.positiveMin,
                maxYValue: this.props.FCSFile.FCSParameters[this.props.selectedYParameter].statistics.max,
                plotWidth: this.props.plotWidth,
                plotHeight: this.props.plotHeight
            }
        } else {
            parameters = {
                workspaceId: this.props.workspace.id,
                FCSFileId: this.props.FCSFile.id,
                gatingHash: this.props.gatingHash,
                machineType: this.props.machineType,
                selectedXParameterIndex: this.props.FCSFile.FCSParameters[this.props.selectedXParameter].index,
                selectedXScale: this.props.selectedXScale,
                selectedYParameterIndex: this.props.FCSFile.FCSParameters[this.props.selectedYParameter].index,
                selectedYScale: this.props.selectedYScale,
                minXValue: this.props.FCSFile.FCSParameters[this.props.selectedXParameter].statistics.positiveMin,
                maxXValue: this.props.FCSFile.FCSParameters[this.props.selectedXParameter].statistics.max,
                minYValue: this.props.FCSFile.FCSParameters[this.props.selectedYParameter].statistics.positiveMin,
                maxYValue: this.props.FCSFile.FCSParameters[this.props.selectedYParameter].statistics.max,
                plotWidth: this.props.plotWidth,
                plotHeight: this.props.plotHeight
            }
        }

        if (this.cacheImageKey !== querystring.stringify(parameters)) {
            if (this.cacheImage) {
                this.cacheImage.src = ''
            }
            this.cacheImageKey = querystring.stringify(parameters)
            this.cacheImage = new Image()
            this.props.api.generatePlotImage(parameters)
            this.cacheImage.src = this.props.api.getJobsApiUrl() + '/plot_images?' + querystring.stringify(parameters)
            this.setState({
                imageLoading: true
            })
        } else {
            redrawGraph(this.cacheImage)
        }

        this.cacheImage.onload = function (src) {
            if (this.cacheImage.src === src) {
                this.setState({
                    imageLoading: false
                })
                redrawGraph(this.cacheImage)
            }
        }.bind(this, this.cacheImage.src)

        this.cacheImage.onerror = function (src) {
            if (this.cacheImage.src === src) {
                setTimeout(() => {
                    this.cacheImage.src = ''
                    this.cacheImage.src = this.props.api.getJobsApiUrl() + '/plot_images?' + querystring.stringify(parameters)
                }, 1000)
            }
            return true
        }.bind(this, this.cacheImage.src)
    }

    updateTypeSpecificData (gateTemplate, data) {
        this.props.api.updateGateTemplateAndRecalculate(gateTemplate.id, { typeSpecificData: _.merge(gateTemplate.typeSpecificData, data) })
    }

    selectGateTemplate (gateTemplateId) {
        this.props.api.selectGateTemplate(gateTemplateId, this.props.workspace.id)
    }

    componentDidMount() {
        if (this.props.selectedXParameter && this.props.selectedYParameter) {
            this.createGraphLayout()
        }
        // this.initHomologyIteration()
    }

    setMouseOver (mouseOver) {
        this.setState({
            mouseOver: mouseOver
        })
    }

    updateMousePosition (event) {
        this.setState({
            mousePosition: [event.nativeEvent.offsetX, event.nativeEvent.offsetY]
        })
    }

    componentWillUnmount () {
        if (this.cacheImage) {
            this.cacheImage.onload = null
            this.cacheImage.onerror = null
        }
    }

    componentDidUpdate(prevProps) {
        // Update the graph if visible gates have changed
        const prevPropGates = _.filter(prevProps.gates, g => g.selectedXParameter === prevProps.selectedXParameter && g.selectedYParameter === prevProps.selectedYParameter)
        const propGates = _.filter(this.props.gates, g => g.selectedXParameter === this.props.selectedXParameter && g.selectedYParameter === this.props.selectedYParameter)

        let shouldReset = false
        if (prevPropGates.length !== propGates.length) {
            shouldReset = true
        }

        for (let i = 0; i < prevPropGates.length; i++) {
            if (!this.props.gates[i]) {
                shouldReset = true;
            }
            // If there are more points in one of the new gates
            else if (prevPropGates[i].polygon && prevPropGates[i].length !== this.props.gates[i].polygon.length) {
                shouldReset = true
            }
            // If the gate's widthIndex has changed
            else if (prevPropGates[i].gateCreatorData.widthIndex !== this.props.gates[i].gateCreatorData.widthIndex) {
                shouldReset = true
            }
            // If the inclusion of zero value data has changed
            else if (prevPropGates[i].gateCreatorData.includeXChannelZeroes !== this.props.gates[i].gateCreatorData.includeXChannelZeroes || prevPropGates[i].gateCreatorData.includeYChannelZeroes !== this.props.gates[i].gateCreatorData.includeYChannelZeroes) {
                shouldReset = true
            }
        }

        if (prevProps.sampleId !== this.props.sampleId) {
            shouldReset = true
        }

        if (prevProps.selectedXParameter !== this.props.selectedXParameter || prevProps.selectedYParameter !== this.props.selectedYParameter) {
            shouldReset = true
        }

        // If the plot has been inverted
        if (prevProps.workspace.selectedXScale !== this.props.workspace.selectedXScale || prevProps.workspace.selectedYScale !== this.props.workspace.selectedYScale) {
            shouldReset = true
        }

        // If the plot has been inverted
        if (prevProps.workspace.invertedAxisPlots[this.props.selectedXParameter + '_' + this.props.selectedYParameter] !== this.props.workspace.invertedAxisPlots[this.props.selectedXParameter + '_' + this.props.selectedYParameter]) {
            shouldReset = true
        }

        // If the size of the plots has changed
        if (prevProps.plotDisplayWidth !== this.props.plotDisplayWidth || prevProps.plotDisplayHeight !== this.props.plotDisplayHeight) {
            shouldReset = true
        }

        if (prevProps.gatingHash !== this.props.gatingHash) {
            shouldReset = true
        }

        if (shouldReset && this.props.selectedXParameter && this.props.selectedYParameter) {
            this.createGraphLayout()
        }
    }

    render () {
        // FCS File not ready yet or no sample selected
        if (this.props.FCSFile.FCSParameters.length === 0 || (!this.props.sample && !this.props.gatingHash) || !this.props.selectedXParameter || !this.props.selectedYParameter) {
            return (
                <div className='svg-outer'><svg className='axis'></svg><canvas className="canvas"/></div>
            )
        }

        const gateCreators = {}
        gateCreators[constants.GATE_CREATOR_PERSISTENT_HOMOLOGY] = 'Calculated with Persistent Homology'
        gateCreators[constants.GATE_CREATOR_MANUAL] = 'Created Manually'

        // Need to offset the whole graph if we're including cytof 0 histograms
        const xOffset = this.props.FCSFile.machineType === constants.MACHINE_CYTOF ? Math.round(Math.min(this.props.plotWidth, this.props.plotHeight) * 0.07) * (this.props.plotDisplayWidth / this.props.plotWidth) : 0
        const yOffset = this.props.FCSFile.machineType === constants.MACHINE_CYTOF ? Math.round(Math.min(this.props.plotWidth, this.props.plotHeight) * 0.07) * (this.props.plotDisplayHeight / this.props.plotHeight) : 0
        const xStats = this.props.FCSFile.FCSParameters[this.props.selectedXParameter].statistics
        const yStats = this.props.FCSFile.FCSParameters[this.props.selectedYParameter].statistics
        const scales = getScales({
            selectedXScale: this.props.selectedXScale,
            selectedYScale: this.props.selectedYScale,
            xRange: [ this.props.selectedXScale === constants.SCALE_LOG ? xStats.positiveMin : xStats.min, xStats.max ],
            yRange: [ this.props.selectedYScale === constants.SCALE_LOG ? yStats.positiveMin : yStats.min, yStats.max ],
            width: this.props.plotDisplayWidth - xOffset,
            height:  this.props.plotDisplayHeight - yOffset
        })

        let tooltip
        const widthDisplayRatio = this.props.plotDisplayWidth / this.props.plotWidth
        const heightDisplayRatio = this.props.plotDisplayHeight / this.props.plotHeight
        const gates = _.filter(this.props.gates, g => g.type === constants.GATE_TYPE_POLYGON).map((gate) => {
            const gateTemplate = _.find(this.props.gateTemplates, gt => gt.id === gate.gateTemplateId)
            const gateTemplateGroup = _.find(this.props.gateTemplateGroups, g => g.id === gateTemplate.gateTemplateGroupId)

            if (gate.type === constants.GATE_TYPE_POLYGON) {
                const scaledPoints = gate.renderedPolygon.map(p => [ (p[0] * widthDisplayRatio) + xOffset, p[1] * heightDisplayRatio ])
                const points = scaledPoints.reduce((string, point) => {
                    return string + point[0] + " " + point[1] + " "
                }, "")
                const center = [ gate.gateData.nucleus[0] * widthDisplayRatio + xOffset, gate.gateData.nucleus[1] * heightDisplayRatio ]

                let gateTemplatePosition
                // If this is a real gate template, link mouse events to gate templates and sub samples
                if (gateTemplate) {
                    if (this.props.showGateTemplatePositions) {
                        gateTemplatePosition = (
                            <g className='group-label'>
                                <rect x={center[0] - 12} y={center[1] - 20} width="45" height="30"></rect>
                                <text x={center[0]} y={center[1]}>{gate.xGroup},{gate.yGroup}</text>
                            </g>
                        )
                    }
                    return (
                        <svg onMouseEnter={this.props.updateGateTemplate.bind(null, gateTemplate.id, { highlighted: true })}
                            onMouseLeave={this.props.updateGateTemplate.bind(null, gateTemplate.id, { highlighted: false })}
                            onClick={this.selectGateTemplate.bind(this, gate.gateTemplateId)}
                            key={gate.id}>
                            <polygon points={points} className={'gate' + (gateTemplate.highlighted ? ' highlighted' : '')} />
                            {gateTemplatePosition}
                        </svg>
                    )
                // If these are unsaved gates, link them to modal actions
                } else {
                    if (this.props.showGateTemplatePositions) {
                        gateTemplatePosition = (
                            <g className='group-label'>
                                <rect x={center[0] - 12} y={center[1] - 20} width="45" height="30"></rect>
                                <text x={center[0]} y={center[1]}>{gate.xGroup},{gate.yGroup}</text>
                            </g>
                        )
                    }
                    return (
                        <svg key={gate.id} onMouseEnter={this.props.setGateHighlight.bind(null, gate.id, true)}
                            onMouseLeave={this.props.setGateHighlight.bind(null, gate.id, false )}>
                            <polygon points={points} className={'gate' + (this.props.highlightedGateIds && this.props.highlightedGateIds.includes(gate.id) ? ' highlighted' : '')} />
                            {gateTemplatePosition}
                        </svg>
                    )
                }
            }
        })

        if (this.props.showMinPeakSizeGuide && this.props.minPeakSize > 0) {
            const edges = 20
            const radius = Math.sqrt(this.props.minPeakSize / Math.PI)
            const circle = []
            for (let i = 0; i < edges; i++) {
                circle.push([
                    ((this.props.plotDisplayWidth / 2) + xOffset) + radius * Math.cos(2 * Math.PI * i / edges),
                    ((this.props.plotDisplayHeight / 2)) + radius * Math.sin(2 * Math.PI * i / edges)
                ])
            }

            const points = circle.reduce((string, point) => {
                return string + point[0] + " " + point[1] + " "
            }, "")
            gates.push((
                <svg key={'guide'}>
                    <polygon points={points} className={'guide'} />
                </svg>
            ))
        }

        if (this.props.seedPeaks) {
            for (let peak of this.props.seedPeaks) {
                const edges = 20
                const radius = Math.sqrt(this.props.minPeakSize / Math.PI)
                if (_.isUndefined(this.props.minPeakSize)) {
                    console.log(this.props)
                }
                const circle = []
                for (let i = 0; i < edges; i++) {
                    circle.push([
                        (peak.position[0] * widthDisplayRatio + xOffset) + radius * Math.cos(2 * Math.PI * i / edges),
                        (peak.position[1] * heightDisplayRatio) + radius * Math.sin(2 * Math.PI * i / edges)
                    ])
                }

                const points = circle.reduce((string, point) => {
                    return string + point[0] + " " + point[1] + " "
                }, "")
                gates.push((
                    <svg key={peak.id}>
                        <polygon points={points} className={'guide'} />
                    </svg>
                ))
            }
        }

        if (this.props.showSeedCreator) {
            if (this.state.mouseOver) {
                const edges = 20
                const radius = Math.sqrt(this.props.minPeakSize / Math.PI)
                const circle = []
                for (let i = 0; i < edges; i++) {
                    circle.push([
                        (this.state.mousePosition[0]) + radius * Math.cos(2 * Math.PI * i / edges),
                        (this.state.mousePosition[1]) + radius * Math.sin(2 * Math.PI * i / edges)
                    ])
                }

                const points = circle.reduce((string, point) => {
                    return string + point[0] + " " + point[1] + " "
                }, "")
                gates.push((
                    <svg key={'guide'}>
                        <polygon points={points} className={'guide'} />
                    </svg>
                ))
            }
        }

        // Show a loading indicator if the parameters are marked as loading or if there is no image for the requested parameter combination
        let isLoading
        let loadingMessage
        if (this.props.sample) {
            if (this.props.sample.parametersLoading[this.props.selectedXParameter + '_' + this.props.selectedYParameter]
                && this.props.sample.parametersLoading[this.props.selectedXParameter + '_' + this.props.selectedYParameter].loading) {
                isLoading = true
                loadingMessage = this.props.sample.parametersLoading[this.props.selectedXParameter + '_' + this.props.selectedYParameter] && this.props.sample.parametersLoading[this.props.selectedXParameter + '_' + this.props.selectedYParameter].loadingMessage
            } else if (this.state.imageLoading) {
                isLoading = true
                loadingMessage = 'Generating image for plot...'
            }
        }

        // Show an error message if automated gates failed to apply
        let gatingError
        if (this.props.gatingError) {
            gatingError = (
                <div className='error-overlay' onClick={this.props.api.showGatingModal.bind(null, this.props.sample.id, this.props.selectedXParameter, this.props.selectedYParameter)}>
                    <div className='red-background' />
                    <i className='lnr lnr-cross-circle' />
                    <div className='text'>Error Applying Gating Template</div>
                </div>
            )
        }

        return (
            <div className='svg-outer'>
                <div className={`loader-outer${isLoading ? ' active' : ''}`}><div className='loader'></div><div className="text">{loadingMessage}</div></div>
                {gatingError}
                {/* D3 Axis */}
                <svg className={'axis' + (gatingError ? ' gating-error' : '')} width={this.props.plotDisplayWidth + this.state.graphMargin.left + this.state.graphMargin.right} height={this.props.plotDisplayHeight + this.state.graphMargin.bottom + this.state.graphMargin.top} ref={this.graphRef}></svg>
                {/* Gate Paths */}
                <svg className={'gates' + (gatingError ? ' gating-error' : '')} onMouseEnter={this.setMouseOver.bind(this, true)} onMouseLeave={this.setMouseOver.bind(this, false)} onMouseMove={this.props.showSeedCreator ? this.updateMousePosition.bind(this) : () => {}}
                    onClick={this.props.showSeedCreator ? this.props.createGatingModalSeedPeak.bind(this, [ Math.round((this.state.mousePosition[0] - xOffset) / widthDisplayRatio), Math.round(this.state.mousePosition[1] / heightDisplayRatio) ]) : () => {}}
                    width={this.props.plotDisplayWidth + this.state.graphMargin.left + this.state.graphMargin.right} height={this.props.plotDisplayHeight + this.state.graphMargin.bottom + this.state.graphMargin.top} ref={this.gatesRef}>
                    {gates}
                </svg>
                {tooltip}
                <canvas className={'canvas' + (gatingError ? ' gating-error' : '')} ref={this.canvasRef}/>
                {/*<div className='step' onClick={this.performHomologyIteration.bind(this, 15, 4)}>Step</div>*/}
            </div>
        )
    }
}