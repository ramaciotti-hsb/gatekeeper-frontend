// -------------------------------------------------------------
// Redux actions for interacting with gates template groups.
// -------------------------------------------------------------

import uuidv4 from 'uuid/v4'

// Create a new gate template group
export const createGateTemplateGroup = (parameters) => {
    return {
        type: 'CREATE_GATE_TEMPLATE_GROUP',
        payload: parameters
    }
}

// Remove a gate template group
export const removeGateTemplateGroup = (gateTemplateGroupId) => {
    console.log(gateTemplateGroupId)
    return {
        type: 'REMOVE_GATE_TEMPLATE_GROUP',
        payload: { gateTemplateGroupId }
    }
}

// Update an arbitrary property on a gate template group
export const updateGateTemplateGroup = (gateTemplateGroupId, parameters) => {
    return {
        type: 'UPDATE_GATE_TEMPLATE_GROUP',
        payload: { gateTemplateGroupId, parameters }
    }
}

// Remove a gate template from a gate template group
export const setGateTemplateGroupSampleLoading = (gateTemplateGroupId, sampleId, loadingParameters) => {
    return {
        type: 'SET_GATE_TEMPLATE_GROUP_SAMPLE_LOADING',
        payload: { gateTemplateGroupId, sampleId, loadingParameters }
    }
}