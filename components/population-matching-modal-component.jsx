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

export default class PopulationMatchingModal extends Component {

    constructor (props) {
        super(props)
        this.state = {}

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

    updateState(key, event) {
        this.state[key] = event.target.value
        this.setState(this.state)
    }

    componentDidMount () {
        this.keyboardListenerId = uuidv4()
        // Dismiss the modal when the escape key is pressed
        registerKeyListener(this.keyboardListenerId, constants.CHARACTER_CODE_ESCAPE, this.modalOuterClicked.bind(this))

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
        if (this.props.exampleGates.length === 0 || !this.props.gatingError) {
            return <div></div>
        }

        return (
            <div className={'gating-error-outer' + (this.props.modalOptions.visible === true ? ' active' : '')} onClick={this.modalOuterClicked.bind(this)} ref={this.outerRef}>
                <div className='gating-error-inner' ref={this.innerRef} style={{ height: 597, left: this.state.modalLeft, top: this.state.modalTop }} onClick={this.modalInnerClicked}>
                    <div className='upper' onMouseDown={(event) => { this.setState({ draggingModal: true, mousePositionDifference: [event.clientX - this.innerRef.current.offsetLeft, event.clientY - this.innerRef.current.offsetTop] }) }}>
                        <div className='title'>Manually match populations</div>
                    </div>
                    <div className='lower'>
                        <div className='graph'>
                            <BivariatePlot
                                gates={this.props.exampleGates}
                                highlightedGateIds={this.state.highlightedGateIds}
                                sampleId={this.props.exampleGates[0].sampleId}
                                FCSFileId={this.props.exampleGates[0].FCSFileId}
                                setGateHighlight={() => {}}
                                showGateTemplatePositions={true}
                                selectedXParameter={this.props.selectedGateTemplateGroup.selectedXParameter}
                                selectedYParameter={this.props.selectedGateTemplateGroup.selectedYParameter}
                                selectedXScale={this.props.selectedWorkspace.selectedXScale}
                                selectedYScale={this.props.selectedWorkspace.selectedYScale}
                                plotDisplayWidth={500}
                                plotDisplayHeight={500}
                            />
                        </div>
                        <div className='graph'>
                            <BivariatePlot
                                gates={this.props.gatingError.gates}
                                highlightedGateIds={this.state.highlightedGateIds}
                                sampleId={this.props.selectedSample.id}
                                FCSFileId={this.props.selectedFCSFile.id}
                                setGateHighlight={() => {}}
                                showGateTemplatePositions={true}
                                selectedXParameter={this.props.selectedGateTemplateGroup.selectedXParameter}
                                selectedYParameter={this.props.selectedGateTemplateGroup.selectedYParameter}
                                selectedXScale={this.props.selectedWorkspace.selectedXScale}
                                selectedYScale={this.props.selectedWorkspace.selectedYScale}
                                plotDisplayWidth={500}
                                plotDisplayHeight={500}
                            />
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}