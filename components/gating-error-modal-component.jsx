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
            highlightedGateIds: []
        }
    }

    modalOuterClicked (event) {
        if (this.props.modalOptions.visible) {
            this.props.api.hideGatingModal()
            this.props.api.resetUnsavedGates()
        }
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

    applyAutoAnchoring () {
        this.setState({
            autoAnchoringLoading: true
        })

        this.props.api.applyErrorHandlerToGatingError(this.props.gatingError.id, { type: constants.GATE_ERROR_HANDLING_AUTO_ANCHOR }).then((result) => {
            this.setState({
                autoAnchoringLoading: false
            })
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

        const contents = (
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
                </div>
            </div>
        )

        return (
            <div className={'gating-error-outer' + (this.props.modalOptions.visible === true ? ' active' : '')} onClick={this.modalOuterClicked.bind(this)}>
                <div className='gating-error-inner' onClick={this.modalInnerClicked} style={{ height: 597 }}>
                    <div className='upper'>
                        <div className='title'>{this.props.selectedFCSFile.FCSParameters[this.props.modalOptions.selectedXParameterIndex].label} · {this.props.selectedFCSFile.FCSParameters[this.props.modalOptions.selectedYParameterIndex].label} - Automated Gating Errors for {this.props.selectedSample.title}</div>
                    </div>
                    <div className='lower'>
                        <div className='graph'>
                            <BivariatePlot
                                gates={this.props.gatingError.gates}
                                highlightedGateIds={this.state.highlightedGateIds}
                                sampleId={this.props.selectedSample.id}
                                FCSFileId={this.props.selectedFCSFile.id}
                                showGateTemplatePositions={true}
                                selectedXParameterIndex={this.props.selectedGateTemplateGroup.selectedXParameterIndex}
                                selectedYParameterIndex={this.props.selectedGateTemplateGroup.selectedYParameterIndex}
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