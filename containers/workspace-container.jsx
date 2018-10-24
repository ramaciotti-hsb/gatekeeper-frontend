// -------------------------------------------------------------
// A react-redux container for workspace-component.jsx.
// -------------------------------------------------------------

import { connect } from 'react-redux'
import { createSample, removeSample } from '../actions/sample-actions.js'
import { updateGateTemplate } from '../actions/gate-template-actions'
import WorkspaceView from '../components/workspace-component.jsx'
import { showGatingModal } from '../actions/application-actions'
import { setFCSFilteredParameters, setGatingHash } from '../actions/workspace-actions'
import _ from 'lodash'

const mapStateToProps = (state, ownProps) => {
    if (ownProps.workspaceId) {
        // Find the selected workspace
        const workspace = _.find(state.workspaces, w => w.id === ownProps.workspaceId) || {}
        const newWorkspace = _.clone(workspace)
        newWorkspace.FCSFiles = _.filter(state.FCSFiles, fcs => fcs.workspaceId === newWorkspace.id)

        if (newWorkspace.selectedFCSFileId) {
            for (let FCSFile of newWorkspace.FCSFiles) {
                if (FCSFile.id === newWorkspace.selectedFCSFileId) {
                    newWorkspace.selectedFCSFile = FCSFile
                }
            }
        }

        newWorkspace.gateTemplates = _.filter(state.gateTemplates, gt => gt.workspaceId === ownProps.workspaceId).map((gateTemplate) => {
            const cloneTemplate = _.clone(gateTemplate)
            const sampleForGateTemplate = _.find(state.samples, s => s.FCSFileId === newWorkspace.selectedFCSFileId && s.gateTemplateId === gateTemplate.id)
            if (sampleForGateTemplate) {
                cloneTemplate.parametersLoading = sampleForGateTemplate.parametersLoading
                cloneTemplate.populationCount = sampleForGateTemplate.populationCount
            }
            return cloneTemplate
        })

        if (newWorkspace.selectedGateTemplateId) {
            for (let gateTemplate of newWorkspace.gateTemplates) {
                if (gateTemplate.id === newWorkspace.selectedGateTemplateId) {
                    newWorkspace.selectedGateTemplate = gateTemplate
                }
            }
        }

        if (newWorkspace.selectedFCSFile && newWorkspace.selectedGateTemplate) {
            newWorkspace.selectedSample = _.find(state.samples, s => s.gateTemplateId === newWorkspace.selectedGateTemplate.id && s.FCSFileId === newWorkspace.selectedFCSFile.id)
        }

        newWorkspace.gateTemplateGroups = _.filter(state.gateTemplateGroups, g => g.workspaceId === ownProps.workspaceId).map((gateTemplateGroup) => {
            const relatedSample = _.find(state.samples, s => s.gateTemplateId === gateTemplateGroup.parentGateTemplateId && s.FCSFileId === newWorkspace.selectedFCSFileId)
            // If there are gating errors for this sample and gate template group, mark the group as "errored"
            if (relatedSample) {
                const gatingError = _.find(state.gatingErrors, e => e.sampleId === relatedSample.id && e.gateTemplateGroupId === gateTemplateGroup.id)
                gateTemplateGroup.gatingError = gatingError
            }

            return gateTemplateGroup
        })

        // If there is a highlighted gate, highlight it's subsample
        const highlightedGate = _.find(state.gates, g => g.highlighted && g.workspaceId === newWorkspace.id) || {}
        return { api: state.api, workspace: newWorkspace, highlightedGate }
    } else {
        return { api: state.api }
    }
}

const mapDispatchToProps = dispatch => {
    return {
        updateGateTemplate: (gateTemplateId, parameters) => {
            dispatch(updateGateTemplate(gateTemplateId, parameters))
        },
        showGatingModal: (sampleId, selectedXParameter, selectedYParameter) => {
            dispatch(showGatingModal(sampleId, selectedXParameter, selectedYParameter))
        },
        setFCSFilteredParameters: (workspaceId, parameters) => {
            dispatch(setFCSFilteredParameters(workspaceId, parameters))
        },
        setGatingHash: (workspaceId, hash) => {
            dispatch(setGatingHash(workspaceId, hash))
        }
    }
}

const WorkspaceViewWrapped = connect(
    mapStateToProps,
    mapDispatchToProps
)(WorkspaceView)

export default WorkspaceViewWrapped