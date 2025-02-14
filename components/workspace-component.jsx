// -------------------------------------------------------------
// A react.js component that renders the currently open
// workspace, including the side bar of samples and the main sample
// view.
// -------------------------------------------------------------

import React from 'react'
import { Component } from 'react'
import _ from 'lodash'
import '../scss/workspace-component.scss'
import constants from '../../gatekeeper-utilities/constants'
import FCSFileSelector from '../containers/fcs-file-selector-container.jsx'

export default class WorkspaceView extends Component {

    constructor (props) {
        super(props)

        this.state = {
            sidebarWidth: 250,
            draggingSidebar: false
        }
    }

    componentDidMount () {
        window.addEventListener('mousemove', (event) => {
            if (this.state.draggingSidebar) {
                this.setState({
                    sidebarWidth: event.clientX
                })

                window.dispatchEvent(new Event('resize'))
            }
        })

        window.addEventListener('mouseup', () => {
            if (this.state.draggingSidebar) {
                this.setState({
                    draggingSidebar: false
                })
            }
        })
    }

    removeGateTemplateGroup (gateTemplateId, event) {
        event.stopPropagation()
        this.props.api.removeGateTemplateGroup(gateTemplateId)
    }

    renderSubGateTemplates (gateTemplate) {
        // Find any gate groups that refer to this gating template
        const childGroups = _.filter(this.props.workspace.gateTemplateGroups, g => g.parentGateTemplateId === gateTemplate.id)

        if (childGroups.length === 0) { return }
        return childGroups.map((childGateTemplateGroup) => {
            const childGateTemplates = _.filter(this.props.workspace.gateTemplates, gt => gt.gateTemplateGroupId === childGateTemplateGroup.id)
            const childrenRendered = childGateTemplates.map((childGateTemplate) => {
                return (
                    <div className={'sidebar-gate-template' + (childGateTemplate.id === this.props.workspace.selectedGateTemplateId ? ' selected' : '') + (childGateTemplate.highlighted ? ' highlighted' : '') + (!childGateTemplate.populationCount ? ' disabled' : '')}
                    onMouseEnter={this.props.updateGateTemplate.bind(null, childGateTemplate.id, { highlighted: true })}
                    onMouseLeave={this.props.updateGateTemplate.bind(null, childGateTemplate.id, { highlighted: false })}
                    key={childGateTemplate.id}>
                        <div className='body' onClick={this.props.api.selectGateTemplate.bind(null, childGateTemplate.id, this.props.workspace.id)}>
                            <div className='title'><div className='text'>{childGateTemplate.title}</div></div>
                            <div className='optional' style={!childGateTemplate.typeSpecificData || !childGateTemplate.typeSpecificData.optional ? { display: 'none'} : null}>Optional</div>
                            <div className='number' style={!childGateTemplate.populationCount ? { display: 'none'} : null}>{childGateTemplate.populationCount} ({(childGateTemplate.populationCount / gateTemplate.populationCount * 100).toFixed(1)}%)</div>
                        </div>
                        <div className='child-gate-templates'>{this.renderSubGateTemplates(childGateTemplate)}</div>
                    </div>
                )
            })


            const totalEvents = childGateTemplates.reduce((accumulator, current) => {
                if (current.type === constants.GATE_TYPE_POLYGON || current.type === constants.GATE_TYPE_NEGATIVE) {
                    return accumulator + (current.populationCount || 0)
                } else {
                    return accumulator
                }
            }, 0)

            let gatingError
            if (childGateTemplateGroup.gatingError) {
                gatingError = <div className='error-overlay'><i className='lnr lnr-cross-circle' /><div className='text'>Error Applying Gating Template</div></div>
            }

            let gateTemplateGroupLoading
            if (gateTemplate.parametersLoading && gateTemplate.parametersLoading[childGateTemplateGroup.selectedXParameter + '_' + childGateTemplateGroup.selectedYParameter] && gateTemplate.parametersLoading[childGateTemplateGroup.selectedXParameter + '_' + childGateTemplateGroup.selectedYParameter].loading) {
                gateTemplateGroupLoading = true
            }

            let totalEventsRendered
            if (totalEvents > 0) {
                totalEventsRendered = <div className='number'>{totalEvents} ({(totalEvents / gateTemplate.populationCount * 100).toFixed(1)}%)</div>
            }

            return (
                <div className={'sidebar-gate-template-group' + (gatingError ? ' gating-error' : '')} key={childGateTemplateGroup.id} onClick={gatingError ? this.props.api.showGatingModal.bind(null, childGateTemplateGroup.gatingError.sampleId, childGateTemplateGroup.selectedXParameter, childGateTemplateGroup.selectedYParameter ) : () => {}}>
                    <div className='title' onClick={() => { this.props.api.selectGateTemplate(childGateTemplateGroup.parentGateTemplateId, this.props.workspace.id); this.props.setFCSFilteredParameters(this.props.workspace.id, [[ childGateTemplateGroup.selectedXParameter, childGateTemplateGroup.selectedYParameter ]]) }}>
                        <div className='text'>{childGateTemplateGroup.title}</div>
                        <div className='remove-gate-template-group' onClick={this.removeGateTemplateGroup.bind(this, childGateTemplateGroup.id)}>
                            <i className='lnr lnr-cross'></i>
                        </div>
                        {totalEventsRendered}
                    </div>
                    <div className='gate-templates'>
                        <div className={`loader-outer${gateTemplateGroupLoading && this.props.workspace.selectedFCSFile ? ' active' : ''}`}><div className='loader small'></div></div>
                        {gatingError}
                        {childrenRendered}
                    </div>
                </div>
            )
        })
    }

    isParentOfGate (toFindId, current) {
        if (toFindId === current.id) {
            return true
        } else {
            if (current.gateTemplateGroupId) {
                return this.isParentOfGate(toFindId, this.props.workspace.gateTemplates.find(gt => gt.id === this.props.workspace.gateTemplateGroups.find(g => g.id === current.gateTemplateGroupId).parentGateTemplateId))
            } else {
                return false
            }
        }
    }

    toggleActiveGate (gateId) {
        const gateIndex = this.state.activeGateTemplateIds.findIndex(g => g === gateId)

        if (gateIndex > -1) {
            this.state.activeGateTemplateIds = this.state.activeGateTemplateIds.slice(0, gateIndex).concat(this.state.activeGateTemplateIds.slice(gateIndex + 1))
        } else {
            this.state.activeGateTemplateIds.push(gateId)
        }

        this.setState({
            activeGateTemplateIds: this.state.activeGateTemplateIds
        })

        this.props.api.createPopulationFromGates(this.props.workspace.id, this.props.workspace.selectedFCSFile, this.state.activeGateTemplateIds.map(id => this.props.workspace.gateTemplates.find(gt => gt.id === id)))
    }

    renderFlatGateTemplates () {
        const gateList = this.props.workspace.gateTemplates.filter(gt => gt.gateTemplateGroupId).map((gateTemplate) => {
            const active = this.state.activeGateTemplateIds.includes(gateTemplate.id)
            return (
                <div className={'gate-template' + (active ? ' active' : '')} onClick={this.toggleActiveGate.bind(this, gateTemplate.id)} key={gateTemplate.id}>
                    <i className={'lnr ' + (active ? 'lnr-checkmark-circle' : 'lnr-circle-minus')}></i>
                    {gateTemplate.title}
                </div>
            )
        })
        return <div className='flat-gate-templates'>{gateList}</div>
    }

    calculateFlatGatePopulation () {
        const activeGateList = this.props.workspace.gateTemplates.filter(gt => gt.gateTemplateGroupId).filter(gateTemplate => this.props.workspace.selectedGateTemplateId && this.isParentOfGate(gateTemplate.id, this.props.workspace.selectedGateTemplate))
        this.setState({
            activeGateTemplateIds: activeGateList.map(g => g.id)
        })
        this.props.api.createPopulationFromGates(this.props.workspace.id, this.props.workspace.selectedFCSFile, activeGateList)
    }

    render () {
        if (!this.props.workspace) {
            return (
                <div className='workspace'>
                    <div className='sidebar'>
                    </div>
                    <div className='fcs-file-selector-outer'>
                        <div className='fcs-file-selector-inner empty'>
                            <div>Use File -> New Workspace to get started.</div>
                        </div>
                    </div>
                </div>
            )
        }


        let sidebarContents = []

        if (this.state.showFlatView) {
            sidebarContents = this.renderFlatGateTemplates()
        } else {
            let renderedHeirarchy = []
            for (let gateTemplate of this.props.workspace.gateTemplates) {
                // Start with the root sample (i.e. doesn't have a group)
                if (!gateTemplate.gateTemplateGroupId) {
                    renderedHeirarchy.push((
                        <div className={'sidebar-gate-template' + (gateTemplate.id === this.props.workspace.selectedGateTemplateId ? ' selected' : '') + (gateTemplate.id === this.props.highlightedGate.childGateTemplateId ? ' highlighted' : '')} key={gateTemplate.id}>
                            <div className='body' onClick={this.props.api.selectGateTemplate.bind(null, gateTemplate.id, this.props.workspace.id)}>
                                <div className='title'>{gateTemplate.title}</div>
                                <div className='number'>{gateTemplate.populationCount} (100%)</div>
                            </div>
                            <div className='child-gate-templates'>{this.renderSubGateTemplates(gateTemplate)}</div>
                        </div>
                    ))
                }
            }
            sidebarContents = (
                <div className='heirarchy-gate-templates'>{renderedHeirarchy}</div>
            )
        }

        const panel = <FCSFileSelector selectedFCSFile={this.props.workspace.selectedFCSFile} workspaceId={this.props.workspace.id} selectedGateTemplate={this.props.selectedGateTemplate} />

        return (
            <div className='workspace'>
                <div className='sidebar-handle' style={{ left: this.state.sidebarWidth - 5 }} onMouseDown={() => { this.setState({ draggingSidebar: true }) }}></div>
                <div className='sidebar' style={{ width: this.state.sidebarWidth }}>
                    <div className='view-type'>
                        <div className={'type heirarchy' + (this.state.showFlatView ? '' : ' active')} onClick={() => { this.setState({ showFlatView: false }); this.props.setGatingHash(this.props.workspace.id, null) }} >Heirarchy</div>
                        <div className={'type flat' + (this.state.showFlatView ? ' active' : '')} onClick={() => { this.setState({ showFlatView: true }); this.calculateFlatGatePopulation() }}>Flat</div>
                    </div>
                    {sidebarContents}
                </div>
                {panel}
            </div>
        )
    }
}