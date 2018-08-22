import { combineReducers } from 'redux'
import { removeFCSFile } from '../actions/fcs-file-actions'
import { removeSample } from '../actions/sample-actions'
import { removeGateTemplate } from '../actions/gate-template-actions'
import { removeGateTemplateGroup, removeGateTemplateFromGroup } from '../actions/gate-template-group-actions.js'
import FCSFileReducer from './fcs-file-reducer'
import sampleReducer from './sample-reducer'
import workspaceReducer from './workspace-reducer'
import gateReducer from './gate-reducer'
import gateTemplateReducer from './gate-template-reducer'
import gateTemplateGroupReducer from './gate-template-group-reducer'
import gatingErrorReducer from './gating-error-reducer'
import _ from 'lodash'
import uuidv4 from 'uuid/v4'

let initialState = {
    FCSFiles: FCSFileReducer(),
    samples: sampleReducer(),
    workspaces: workspaceReducer(),
    gates: gateReducer(),
    gateTemplates: gateTemplateReducer(),
    gateTemplateGroups: gateTemplateGroupReducer(),
    gatingErrors: gatingErrorReducer(),
    selectedWorkspaceId: null,
    sessionLoading: true, // Display a global loading spinner while the session loads
    showDisabledParameters: true,
    gatingModal: {},
    unsavedGates: null,
    // These values determine how large the plots generated on the backend are
    plotWidth: 380,
    plotHeight: 380,
    // This value determines how large the plot should be displayed on the front end
    plotDisplayWidth: 380,
    plotDisplayHeight: 380,
    sessionBroken: false,
    authenticatedUser: null,
    filesUploading: [],
    api: {}
}

const applicationReducer = (state = initialState, action) => {
    let newState = {
        FCSFiles: state.FCSFiles ? state.FCSFiles.slice(0) : [],
        samples: state.samples ? state.samples.slice(0) : [],
        workspaces: state.workspaces ? state.workspaces.slice(0) : [],
        gates: state.gates ? state.gates.slice(0) : [],
        gateTemplates: state.gateTemplates ? state.gateTemplates.slice(0) : [],
        gateTemplateGroups: state.gateTemplateGroups ? state.gateTemplateGroups.slice(0) : [],
        gatingErrors: state.gatingErrors ? state.gatingErrors.slice(0) : [],
        unsavedGates: state.unsavedGates ? state.unsavedGates.slice(0) : null,
        selectedWorkspaceId: state.selectedWorkspaceId,
        sessionLoading: state.sessionLoading,
        showDisabledParameters: state.showDisabledParameters,
        plotWidth: state.plotWidth,
        plotHeight: state.plotHeight,
        plotDisplayWidth: state.plotDisplayWidth,
        plotDisplayHeight: state.plotDisplayHeight,
        sessionBroken: state.sessionBroken,
        gatingModal: _.clone(state.gatingModal) || {},
        authenticatedUser: state.authenticatedUser,
        api: state.api
    }

    // --------------------------------------------------
    // Sometimes the session gets irrevocably broken during an
    // update or bad disk write. In this case, we need to give the user the option
    // to start again from scratch.
    // --------------------------------------------------
    if (action.type === 'SET_SESSION_BROKEN') {
        newState.sessionBroken = action.payload.sessionBroken
    }
    // --------------------------------------------------
    // Reset the inbuilt session to default.
    // --------------------------------------------------
    else if (action.type === 'RESET_SESSION') {
        newState = initialState
    }
    // --------------------------------------------------
    // Override the whole local session with new data.
    // Usually used when first bootstrapping from DB or 
    // filesystem.
    // --------------------------------------------------
    else if (action.type === 'SET_SESSION_STATE') {
        newState.FCSFiles = action.payload.FCSFiles ? action.payload.FCSFiles.slice(0) : []
        newState.samples = action.payload.samples ? action.payload.samples.slice(0) : []
        newState.workspaces = action.payload.workspaces ? action.payload.workspaces.slice(0) : []
        newState.gates = action.payload.gates ? action.payload.gates.slice(0) : []
        newState.gateTemplates = action.payload.gateTemplates ? action.payload.gateTemplates.slice(0) : []
        newState.gateTemplateGroups = action.payload.gateTemplateGroups ? action.payload.gateTemplateGroups.slice(0) : []
        newState.gatingErrors = action.payload.gatingErrors ? action.payload.gatingErrors.slice(0) : []
        newState.selectedWorkspaceId = action.payload.selectedWorkspaceId
        newState.plotWidth = action.payload.plotWidth || newState.plotWidth
        newState.plotHeight = action.payload.plotHeight || newState.plotHeight
        newState.plotDisplayWidth = action.payload.plotDisplayWidth || newState.plotDisplayWidth
        newState.plotDisplayHeight = action.payload.plotDisplayHeight || newState.plotDisplayHeight
        newState.showDisabledParameters = action.payload.showDisabledParameters
    }
    // --------------------------------------------------
    // Selects which "API" object to use. This changes from
    // the web version to electron.
    // --------------------------------------------------
    else if (action.type === 'SET_API') {
        newState.api = action.payload.api
    }
    // --------------------------------------------------
    // Sets the global loading indicator
    // the web version to electron.
    // --------------------------------------------------
    else if (action.type === 'SET_SESSION_LOADING') {
        newState.sessionLoading = action.payload.sessionLoading
    }
    // --------------------------------------------------
    // Sets the logged in user
    // --------------------------------------------------
    else if (action.type === 'SET_AUTHENTICATED_USER') {
        newState.authenticatedUser = action.payload.authenticatedUser
    }
    // --------------------------------------------------
    // Show a gating modal for a particular sample and
    // selected X / Y Parameters
    // --------------------------------------------------
    else if (action.type === 'SHOW_GATING_MODAL') {
        newState.gatingModal = {
            visible: true,
            selectedXParameter: action.payload.selectedXParameter,
            selectedYParameter: action.payload.selectedYParameter
        }

        const sample = _.find(newState.samples, s => s.id === action.payload.sampleId)
        const gateTemplateGroup = _.find(newState.gateTemplateGroups, g => g.parentGateTemplateId === sample.gateTemplateId && g.selectedXParameter === action.payload.selectedXParameter && g.selectedYParameter === action.payload.selectedYParameter)

        let gatingError = _.find(newState.gatingErrors, e => gateTemplateGroup && e.gateTemplateGroupId === gateTemplateGroup.id && e.sampleId === sample.id)
        if (gatingError) {
            newState.gatingModal.gatingErrorId = gatingError.id
        } else {
            newState.gatingModal.sampleId = sample.id
            if (gateTemplateGroup) {
                const unsavedGates = _.cloneDeep(_.filter(newState.gates, g => g.parentSampleId === sample.id && _.find(newState.gateTemplates, gt => gt.id === g.gateTemplateId && gt.gateTemplateGroupId === gateTemplateGroup.id))).map((gate) => {
                    const childSample = _.find(newState.samples, s => s.id === gate.childSampleId)
                    gate.includeEventIds = []
                    gate.FCSFileId = sample.FCSFileId
                    gate.sampleId = sample.id
                    gate.id = uuidv4()
                    return gate
                })
                newState.unsavedGates = unsavedGates
            }
        }
    }
    // --------------------------------------------------
    // Hide the gating modal
    // --------------------------------------------------
    else if (action.type === 'HIDE_GATING_MODAL') {
        newState.gatingModal = { visible: false }
    }
    // --------------------------------------------------
    // Set the gating modal error message
    // --------------------------------------------------
    else if (action.type === 'SET_GATING_MODAL_ERROR_MESSAGE') {
        newState.gatingModal.errorMessage = action.payload.message
    }
    // --------------------------------------------------
    // Adds a gating modal seed peak
    // --------------------------------------------------
    else if (action.type === 'CREATE_GATING_MODAL_SEED_PEAK') {
        newState.gatingModal.seedPeaks = newState.gatingModal.seedPeaks || []
        newState.gatingModal.seedPeaks.push(action.payload.seedPeak)
    }
    // --------------------------------------------------
    // Removes a gating modal seed peak
    // --------------------------------------------------
    else if (action.type === 'REMOVE_GATING_MODAL_SEED_PEAK') {
        newState.gatingModal.seedPeaks = newState.gatingModal.seedPeaks || []
        _.remove(newState.gatingModal.seedPeaks, p => p.id === action.payload.seedPeakId)
    }
    // --------------------------------------------------
    // Toggles display of the parameter enable / disable sidebar
    // --------------------------------------------------
    else if (action.type === 'TOGGLE_SHOW_DISABLED_PARAMETERS') {
        newState.showDisabledParameters = !newState.showDisabledParameters
    }
    // --------------------------------------------------
    // Sets plot width and height
    // --------------------------------------------------
    else if (action.type === 'SET_PLOT_DIMENSIONS') {
        newState.plotWidth = action.payload.plotWidth
        newState.plotHeight = action.payload.plotHeight
    }
    // --------------------------------------------------
    // Sets plot display width and height
    // --------------------------------------------------
    else if (action.type === 'SET_PLOT_DISPLAY_DIMENSIONS') {
        newState.plotDisplayWidth = action.payload.plotDisplayWidth
        newState.plotDisplayHeight = action.payload.plotDisplayHeight
    }
    // --------------------------------------------------
    // Sets unsaved gates which will display on the auto gating modal
    // --------------------------------------------------
    else if (action.type === 'SET_UNSAVED_GATES') {
        newState.gatingModal.seedPeaks = []
        newState.unsavedGates = _.cloneDeep(action.payload.unsavedGates)
    }
    // --------------------------------------------------
    // Create a new workspace and select it
    // --------------------------------------------------
    else if (action.type === 'CREATE_WORKSPACE') {
        // Workspaces are always selected after creating them
        newState.workspaces = workspaceReducer(newState.workspaces, { type: 'CREATE_WORKSPACE', payload: action.payload })
        newState.selectedWorkspaceId = action.payload.workspace.id
    // --------------------------------------------------
    // Select an existing workspace
    // --------------------------------------------------
    } else if (action.type === 'SELECT_WORKSPACE') {
        newState.selectedWorkspaceId = action.payload.id
    // --------------------------------------------------
    // Remove a workspace and all the samples in it
    // --------------------------------------------------
    } else if (action.type === 'REMOVE_WORKSPACE') {
        if (newState.selectedWorkspaceId === action.payload.id) {
            const workspaceIndex = _.findIndex(newState.workspaces, w => w.id === action.payload.id)
            let indexToSelect = Math.max(workspaceIndex - 1, 0)
            if (newState.workspaces.length > 1) {
                newState = applicationReducer(newState, { type: 'SELECT_WORKSPACE', payload: { id: newState.workspaces[indexToSelect].id }})
            } else {
                newState = applicationReducer(newState, { type: 'SELECT_WORKSPACE', payload: { id: null }})
            }
        }

        newState.workspaces = workspaceReducer(newState.workspaces, action)

        // Remove the root gate template, which will remove everything else
        const rootGateTemplate = _.find(newState.gateTemplates, gt => !gt.gateTemplateGroupId && gt.workspaceId === action.payload.id)
        newState.gateTemplates = gateTemplateReducer(newState.gateTemplates, { type: 'REMOVE_GATE_TEMPLATE', payload: { gateTemplateId: rootGateTemplate.id } })
    // --------------------------------------------------
    // Remove an FCS File, and all the samples that depend on it
    // --------------------------------------------------    
    } else if (action.type === 'REMOVE_FCS_FILE') {
        newState.FCSFiles = FCSFileReducer(newState.FCSFiles, { type: 'REMOVE_FCS_FILE', payload: { FCSFileId: action.payload.FCSFileId } })
        // Delete any samples that no longer point to a valid FCSFile (i.e. their parent or child has been deleted)
        for (let sample of _.filter(newState.samples, s => s.FCSFileId === action.payload.FCSFileId)) {
            newState = applicationReducer(newState, { type: 'REMOVE_SAMPLE', payload: { sampleId: sample.id } })
        }
    // --------------------------------------------------
    // Remove a gate template, any child gate template groups and samples
    // --------------------------------------------------
    } else if (action.type === 'REMOVE_GATE_TEMPLATE') {
        newState.gateTemplates = gateTemplateReducer(newState.gateTemplates, { type: 'REMOVE_GATE_TEMPLATE', payload: { gateTemplateId: action.payload.gateTemplateId } })
        // Delete any samples that are based on this gate template
        for (let sample of _.filter(newState.samples, s => s.gateTemplateId === action.payload.gateTemplateId)) {
            newState = applicationReducer(newState, { type: 'REMOVE_SAMPLE', payload: { sampleId: sample.id } })
        }
        // Delete any child gate template groups
        for (let gateTemplateGroup of _.filter(newState.gateTemplateGroups, g => g.parentGateTemplateId === action.payload.gateTemplateId)) {
            newState = applicationReducer(newState, { type: 'REMOVE_GATE_TEMPLATE_GROUP', payload: { gateTemplateGroupId: gateTemplateGroup.id } })
        }
    // --------------------------------------------------
    // Remove a gate template group, any child gate templates
    // --------------------------------------------------
    } else if (action.type === 'REMOVE_GATE_TEMPLATE_GROUP') {
        newState.gateTemplateGroups = gateTemplateGroupReducer(newState.gateTemplateGroups, { type: 'REMOVE_GATE_TEMPLATE_GROUP', payload: { gateTemplateGroupId: action.payload.gateTemplateGroupId } })
        // Delete any gating errors that no longer point to a valid gate template group
        let orphanGatingErrors = _.filter(newState.gatingErrors, e => !_.find(newState.gateTemplateGroups, g => e.gateTemplateGroupId === g.id))
        for (let error of orphanGatingErrors) {
            newState.gatingErrors = gatingErrorReducer(newState.gatingErrors, { type: 'REMOVE_GATING_ERROR', payload: { gatingErrorId: error.id } })
        }
        // Delete any gate templates that are no longer in a gate template group
        for (let gateTemplate of _.filter(newState.gateTemplates, gt => gt.gateTemplateGroupId === action.payload.gateTemplateGroupId)) {
            newState = applicationReducer(newState, { type: 'REMOVE_GATE_TEMPLATE', payload: { gateTemplateId: gateTemplate.id } })
        }
    // --------------------------------------------------
    // Remove a sample, any subsamples and unselect if selected
    // --------------------------------------------------
    } else if (action.type === 'REMOVE_SAMPLE') {
        newState.samples = sampleReducer(newState.samples, action)
        // Delete any gates that no longer point to a valid sample (i.e. their parent or child has been deleted)
        for (let gate of _.filter(newState.gates, g => !_.find(newState.samples, s => g.parentSampleId === s.id) || !_.find(newState.samples, s => g.childSampleId === s.id))) {
            newState.gates = gateReducer(newState.gates, { type: 'REMOVE_GATE', payload: { gateId: gate.id } })
        }
        // Delete child samples
        for (let sample of _.filter(newState.samples, s => s.parentSampleId === action.payload.sampleId)) {
            newState = applicationReducer(newState, { type: 'REMOVE_SAMPLE', payload: { sampleId: sample.id } })
        }
    // --------------------------------------------------
    // Select a different FCS File
    // --------------------------------------------------
    } else if (action.type === 'SELECT_FCS_FILE') {
        // Pass on to the workspace reducer
        newState.workspaces = workspaceReducer(newState.workspaces, { type: 'SELECT_FCS_FILE', payload: { workspaceId: action.payload.workspaceId, FCSFileId: action.payload.FCSFileId } })
        const workspace = _.find(newState.workspaces, w => w.id === action.payload.workspaceId)
        const currentSample = _.find(newState.samples, s => s.FCSFileId === action.payload.FCSFileId && s.gateTemplateId === workspace.selectedGateTemplateId)
        
        if (currentSample) {
            if (newState.gatingModal.visible) {
                newState = applicationReducer(newState, { type: 'SHOW_GATING_MODAL', payload: { selectedXParameter: newState.gatingModal.selectedXParameter, selectedYParameter: newState.gatingModal.selectedYParameter, sampleId: currentSample.id } })
            }
        }

    // --------------------------------------------------
    // Remove a gating error
    // --------------------------------------------------
    } else if (action.type === 'REMOVE_GATING_ERROR') {
        const gatingError = _.find(newState.gatingErrors, e => e.id === action.payload.gatingErrorId)
        // Pass on to the gating error reducer
        newState.gatingErrors = gatingErrorReducer(newState.gatingErrors, action)
        // Hide the gating error modal if it's visible and looking at the current gating error
        if (newState.gatingModal.visible && newState.gatingModal.gatingErrorId === action.payload.gatingErrorId) {
            newState = applicationReducer(newState, { type: 'SHOW_GATING_MODAL', payload: { selectedXParameter: newState.gatingModal.selectedXParameter, selectedYParameter: newState.gatingModal.selectedYParameter, sampleId: gatingError.sampleId } })
        }
    // --------------------------------------------------
    // Pass on any unmatched actions to workspaceReducer and
    // sampleReducer
    // --------------------------------------------------
    } else {
        newState.FCSFiles = FCSFileReducer(newState.FCSFiles, action)
        newState.workspaces = workspaceReducer(newState.workspaces, action)
        newState.samples = sampleReducer(newState.samples, action)
        newState.gates = gateReducer(newState.gates, action)
        newState.gateTemplates = gateTemplateReducer(newState.gateTemplates, action)
        newState.gateTemplateGroups = gateTemplateGroupReducer(newState.gateTemplateGroups, action)
        newState.gatingErrors = gatingErrorReducer(newState.gatingErrors, action)
    }

    return newState
}

export default applicationReducer