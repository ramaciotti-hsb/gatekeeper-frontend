// -------------------------------------------------------------
// A react-redux container for bivariate-plot-component.jsx.
// -------------------------------------------------------------

import { connect } from 'react-redux'
import { createSubSampleAndAddToWorkspace } from '../actions/workspace-actions'
import { updateGateTemplate } from '../actions/gate-template-actions'
import { createGatingModalSeedPeak } from '../actions/application-actions'
import BivariatePlot from '../components/sample-components/bivariate-plot-component.jsx'
import _ from 'lodash'

const mapStateToProps = (state, ownProps) => {
    // Find the selected FCS file
    const FCSFile = _.find(state.FCSFiles, w => w.id === ownProps.FCSFileId) || {}
    const newFCSFile = _.cloneDeep(FCSFile)

    // Find the workspace that this FCS File is inside
    let workspace = _.find(state.workspaces, w => w.FCSFileIds.includes(ownProps.FCSFileId))
    
    if (ownProps.sampleId) {
        // Find the selected sample
        const sample = _.find(state.samples, w => w.id === ownProps.sampleId) || {}
        const newSample = _.clone(sample)
        // If the workspace contains samples, find them and add them as complete objects
        sample.subSamples = _.filter(state.samples, s => s.parentSampleId === newSample.id)
        
        // Find the parent sample if there is one
        if (newSample.parentSampleId) {
            const parent = _.find(state.samples, s => s.id === newSample.parentSampleId)
            newSample.parentTitle = parent.title
        }

        if (ownProps.gates) {
            return {
                api: state.api,
                workspace,
                sample: newSample,
                gates: ownProps.gates,
                FCSFile,
                setGateHighlight: ownProps.setGateHighlight,
                showSeedCreator: ownProps.showSeedCreator,
                minPeakSize: ownProps.minPeakSize,
                plotWidth: state.plotWidth,
                plotHeight: state.plotHeight,
                plotDisplayWidth: ownProps.plotDisplayWidth || state.plotDisplayWidth,
                plotDisplayHeight: ownProps.plotDisplayHeight || state.plotDisplayHeight,
                machineType: FCSFile.machineType,
                backgroundJobsEnabled: state.backgroundJobsEnabled 
            }
        } else {
            // Find any gates on this plot
            const gates = []
            for (let gate of state.gates) {
                let selectedXParameterIndex = ownProps.selectedXParameterIndex
                let selectedYParameterIndex = ownProps.selectedYParameterIndex
                if (gate.parentSampleId === ownProps.sampleId
                    && gate.selectedXParameterIndex === selectedXParameterIndex
                    && gate.selectedYParameterIndex === selectedYParameterIndex) {
                    gates.push(gate)
                }
            }

            // Find gate templates that gates refer to
            const gateTemplates = gates.map(g => _.find(state.gateTemplates, gt => g.gateTemplateId === gt.id))
            const parentGateTemplate = _.find(state.gateTemplates, gt => gt.id === sample.gateTemplateId)
            let gateTemplateGroup = _.find(state.gateTemplateGroups, g => g.parentGateTemplateId === parentGateTemplate.id && g.selectedXParameterIndex === ownProps.selectedXParameterIndex && g.selectedYParameterIndex === ownProps.selectedYParameterIndex)
            let gatingError
            if (gateTemplateGroup) {
                gatingError = _.find(state.gatingErrors, e => e.gateTemplateGroupId === gateTemplateGroup.id && e.sampleId === ownProps.sampleId)                
            }

            return {
                api: state.api,
                workspace,
                sample: newSample,
                gates,
                gateTemplates,
                gateTemplateGroup,
                gatingError,
                FCSFile,
                showSeedCreator: ownProps.showSeedCreator,
                seedPeaks: ownProps.seedPeaks || [],
                showMinPeakSizeGuide: ownProps.showMinPeakSizeGuide,
                minPeakSize: ownProps.minPeakSize || 1000,
                plotWidth: state.plotWidth,
                plotHeight: state.plotHeight,
                plotDisplayWidth: ownProps.plotDisplayWidth || state.plotDisplayWidth,
                plotDisplayHeight: ownProps.plotDisplayHeight || state.plotDisplayHeight,
                machineType: FCSFile.machineType,
                backgroundJobsEnabled: state.backgroundJobsEnabled 
            }
        }
    } else {
        return { api: state.api, gates: [], gateTemplates: [], workspace, FCSFile, plotWidth: state.plotWidth, plotHeight: state.plotHeight, backgroundJobsEnabled: state.backgroundJobsEnabled }
    }
}

const mapDispatchToProps = dispatch => {
    return {
        updateGateTemplate: (gateTemplateId, parameters) => {
            dispatch(updateGateTemplate(gateTemplateId, parameters))
        },
        createGatingModalSeedPeak: (position) => {
            dispatch(createGatingModalSeedPeak(position))
        }
    }
}

const BivariatePlotWrapped = connect(
    mapStateToProps,
    mapDispatchToProps
)(BivariatePlot)

export default BivariatePlotWrapped