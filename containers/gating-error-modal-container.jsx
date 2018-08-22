// -------------------------------------------------------------
// A react-redux container for homology-modal-component.jsx.
// -------------------------------------------------------------

import { connect } from 'react-redux'
import GatingErrorModal from '../components/gating-error-modal-component.jsx'
import { setGatingModalErrorMessage, removeGatingModalSeedPeak } from '../actions/application-actions'
import _ from 'lodash'

const mapStateToProps = (state, ownProps) => {
    const selectedWorkspace = _.find(state.workspaces, w => w.id === state.selectedWorkspaceId) || {}
    const selectedFCSFile = _.find(state.FCSFiles, fcs => fcs.id === selectedWorkspace.selectedFCSFileId) || {}
    let selectedGateTemplateGroup = {}
    let selectedSample = {}

    let gatingError = _.find(state.gatingErrors, e => e.id === state.gatingModal.gatingErrorId)
    if (gatingError) {
        selectedGateTemplateGroup = _.find(state.gateTemplateGroups, g => g.id === gatingError.gateTemplateGroupId)
        selectedSample = _.find(state.samples, s => s.id === gatingError.sampleId) || {}
    }

    return {
        api: state.api,
        selectedWorkspace,
        selectedFCSFile,
        selectedGateTemplateGroup,
        selectedSample,
        gatingError,
        unsavedGates: state.unsavedGates,
        plotWidth: state.plotWidth,
        plotHeight: state.plotHeight,
        modalOptions: {
            visible: state.gatingModal.gatingErrorId && state.gatingModal.visible,
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

const GatingErrorModalWrapped = connect(
    mapStateToProps,
    mapDispatchToProps
)(GatingErrorModal)

export default GatingErrorModalWrapped