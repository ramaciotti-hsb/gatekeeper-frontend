// -------------------------------------------------------------
// A react-redux container for multiple-sample-view-outer-component.jsx.
// -------------------------------------------------------------

import { connect } from 'react-redux'
import { updateGate } from '../actions/gate-actions'
import { updateGateTemplate } from '../actions/gate-template-actions'
import { setFCSFilteredParameters } from '../actions/workspace-actions'
import constants from '../../gatekeeper-utilities/constants'
import MultipleSampleView from '../components/sample-components/multiple-sample-view-component.jsx'
import _ from 'lodash'

const mapStateToProps = (state, ownProps) => {
    // Find the selected FCS file
    const FCSFile = _.find(state.FCSFiles, w => w.id === ownProps.FCSFileId) || {}
    const newFCSFile = _.cloneDeep(FCSFile)

    // Find the workspace that this FCS File is inside
    let workspace = _.find(state.workspaces, w => w.id === newFCSFile.workspaceId)

    if (ownProps.sampleId) {
        const sample = _.find(state.samples, w => w.id === ownProps.sampleId) || {}
        const newSample = _.cloneDeep(sample)
        newSample.subSamples = []
        // If the workspace contains samples, find them and add them as complete objects
        sample.subSamples = _.filter(state.samples, s => s.parentSampleId === newSample.id)

        // Find any gates on this sample
        const gates = []
        const gateTemplates = []
        for (let gate of state.gates) {
            if (gate.parentSampleId === ownProps.sampleId) {
                gates.push(gate)
                gateTemplates.push(_.find(state.gateTemplates, gt => gt.id === gate.gateTemplateId))
            }
        }

        // Find the parent sample if there is one
        if (newSample.parentSampleId) {
            const parent = _.find(state.samples, s => s.id === newSample.parentSampleId)
            newSample.parentTitle = parent.title
            newSample.parentId = parent.id
        }

        // Find the gate template that created this sample
        const gateTemplate = _.find(state.gateTemplates, gt => gt.id === sample.gateTemplateId)

        // Find the gate template group that houses the corresponding gate template
        const gateTemplateGroup = _.find(state.gateTemplateGroups, g => g.id === gateTemplate.gateTemplateGroupId)
        let parentGateTitle
        if (gateTemplateGroup) {
            const parentGateTemplate = _.find(state.gateTemplates, gt => gt.id === gateTemplateGroup.parentGateTemplateId)
            if (!parentGateTemplate.gateTemplateGroupId) {
                parentGateTitle = 'Root Gate'
            } else {
                parentGateTitle = parentGateTemplate.title
            }
        }

        let gatingErrors = _.filter(state.gatingErrors, e => e.sampleId === ownProps.sampleId && _.find(state.gateTemplateGroups, g2 => g2.id === e.gateTemplateGroupId)).map((gatingError) => {
            return Object.assign({}, gatingError, { gateTemplateGroup: state.gateTemplateGroups.find(gt => gt.id === gatingError.gateTemplateGroupId) })
        })

        newSample.machineType = newSample.machineType || constants.MACHINE_FLORESCENT

        return {
            api: state.api,
            workspace,
            FCSFile: newFCSFile,
            sample: newSample,
            gates,
            gateTemplates,
            gateTemplate,
            gateTemplateGroup,
            gatingErrors,
            parentGateTitle,
            plotWidth: state.plotWidth,
            plotHeight: state.plotHeight,
            plotDisplayWidth: state.plotDisplayWidth,
            plotDisplayHeight: state.plotDisplayHeight,
            showDisabledParameters: state.showDisabledParameters,
            filteredParameters: workspace.filteredParameters || []
        }
    } else {
        return { api: state.api, gates: [], FCSFile: newFCSFile, gateTemplate: {}, workspace }
    }
}

const mapDispatchToProps = dispatch => {
    return {
        updateGateTemplate: (gateTemplateId, parameters) => {
            dispatch(updateGateTemplate(gateTemplateId, parameters))
        },
        setFilteredParameters: (workspaceId, parameters) => {
            dispatch(setFCSFilteredParameters(workspaceId, parameters))
        }
    }
}

const MultipleSampleViewWrapped = connect(
    mapStateToProps,
    mapDispatchToProps
)(MultipleSampleView)

export default MultipleSampleViewWrapped