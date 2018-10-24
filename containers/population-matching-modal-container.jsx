// -------------------------------------------------------------
// A react-redux container for population-matching-modal-component.jsx.
// -------------------------------------------------------------

import { connect } from 'react-redux'
import PopulationMatchingModal from '../components/population-matching-modal-component.jsx'
import { setGatingModalErrorMessage, removeGatingModalSeedPeak } from '../actions/application-actions'
import _ from 'lodash'

const mapStateToProps = (state, ownProps) => {
    const selectedWorkspace = _.find(state.workspaces, w => w.id === state.selectedWorkspaceId) || {}
    const selectedFCSFile = _.find(state.FCSFiles, fcs => fcs.id === selectedWorkspace.selectedFCSFileId) || {}

    let selectedGateTemplateGroup
    let selectedSample
    let gatingError = _.find(state.gatingErrors, e => e.id === state.gatingModal.gatingErrorId)
    if (gatingError) {
        selectedGateTemplateGroup = _.find(state.gateTemplateGroups, g => g.id === gatingError.gateTemplateGroupId)
        selectedSample = _.find(state.samples, s => s.id === gatingError.sampleId) || {}
    }


    let exampleGates = []
    if (selectedGateTemplateGroup) {
        const childGateTemplates = state.gateTemplates.filter(gt => gt.gateTemplateGroupId === selectedGateTemplateGroup.id)
        console.log(childGateTemplates)
        exampleGates = state.gates.filter(g => childGateTemplates.find(gt => gt.exampleGateId === g.id))
        console.log(exampleGates)
    }

    return {
        api: state.api,
        selectedWorkspace,
        selectedFCSFile,
        selectedGateTemplateGroup,
        selectedSample,
        exampleGates,
        gatingError,
        plotWidth: state.plotWidth,
        plotHeight: state.plotHeight,
        modalOptions: {
            visible: state.gatingModal.sampleId && state.gatingModal.visible,
            sampleId: state.gatingModal.sampleId,
            selectedXParameter: state.gatingModal.selectedXParameter,
            selectedYParameter: state.gatingModal.selectedYParameter,
            errorMessage: state.gatingModal.errorMessage,
            seedPeaks: state.gatingModal.seedPeaks || []
        }
    }
}

const mapDispatchToProps = dispatch => {
    return {
        setGatingModalErrorMessage: (message) => {
            dispatch(setGatingModalErrorMessage(message))
        },
        removeGatingModalSeedPeak: (peakId) => {
            dispatch(removeGatingModalSeedPeak(peakId))
        }
    }
}

const PopulationMatchingModalWrapped = connect(
    mapStateToProps,
    mapDispatchToProps
)(PopulationMatchingModal)

export default PopulationMatchingModalWrapped