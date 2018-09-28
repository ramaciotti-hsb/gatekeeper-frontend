// -------------------------------------------------------------
// Redux actions for interacting with workspaces.
// -------------------------------------------------------------

import uuidv4 from 'uuid/v4'
import { sampleLoadingFinished } from './sample-actions.js'

export const selectWorkspace = id => {
    return {
        type: 'SELECT_WORKSPACE',
        payload: { id }
    }
}

export const createWorkspace = (workspace) => {
    return {
        type: 'CREATE_WORKSPACE',
        payload: { workspace }
    }
}

export const updateWorkspace = (workspaceId, parameters) => {
    return {
        type: 'UPDATE_WORKSPACE',
        payload: { workspaceId, parameters }
    }
}

// Selects a gate template within a workspace
export const selectGateTemplate = (gateTemplateId, workspaceId) => {
    return {
        type: 'SELECT_GATE_TEMPLATE',
        payload: { gateTemplateId, workspaceId }
    }
}

export const removeWorkspace = (id) => {
    return {
        type: 'REMOVE_WORKSPACE',
        payload: { id }
    }
}

// Selects an FCS file within a workspace
export const selectFCSFile = (FCSFileId, workspaceId) => {
    return {
        type: 'SELECT_FCS_FILE',
        payload: { FCSFileId, workspaceId }
    }
}

// Selects a sample within a workspace
export const selectSample = (sampleId, workspaceId) => {
    return {
        type: 'SELECT_SAMPLE',
        payload: { sampleId, workspaceId }
    }
}

// Toggles parameter inversion (i.e. flip x and y axis) on a plot for display
export const invertPlotAxis = (workspaceId, selectedXParameter, selectedYParameter) => {
    return {
        type: 'INVERT_PLOT_AXIS',
        payload: { workspaceId, selectedXParameter, selectedYParameter }
    }
}

// Toggles FCS parameters between enabled / disabled
export const setFCSDisabledParameters = (workspaceId, parameters) => {
    return {
        type: 'SET_FCS_DISABLED_PARAMETERS',
        payload: { workspaceId, parameters }
    }
}

// Sets the currently filtered parameters for display
export const setFCSFilteredParameters = (workspaceId, parameters) => {
    return {
        type: 'SET_FCS_FILTERED_PARAMETERS',
        payload: { workspaceId, parameters }
    }
}