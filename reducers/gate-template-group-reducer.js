// -------------------------------------------------------------
// A redux reducer for CRUD operations involving gate templates.
// -------------------------------------------------------------

import _ from 'lodash'
import uuidv4 from 'uuid/v4'

const initialState = []

const gateTemplateGroups = (state = initialState, action = {}) => {
    let newState = state.slice(0)

    // --------------------------------------------------
    // Create a new gate and add to state
    // --------------------------------------------------
    if (action.type === 'CREATE_GATE_TEMPLATE_GROUP') {
        const newGateTemplateGroup = {
            id: action.payload.id,
            workspaceId: action.payload.workspaceId,
            title: action.payload.title,
            creator: action.payload.creator,
            parentGateTemplateId: action.payload.parentGateTemplateId,
            selectedXParameterIndex: action.payload.selectedXParameterIndex,
            selectedYParameterIndex: action.payload.selectedYParameterIndex,
            selectedXScale: action.payload.selectedXScale,
            selectedYScale: action.payload.selectedYScale,
            machineType: action.payload.machineType,
            typeSpecificData: action.payload.typeSpecificData
        }

        newState.push(newGateTemplateGroup)
    // --------------------------------------------------
    // Remove a gate template group
    // --------------------------------------------------
    } else if (action.type === 'UPDATE_GATE_TEMPLATE_GROUP') {
        const gateTemplateGroup = _.find(state, s => s.id === action.payload.gateTemplateGroupId)

        if (gateTemplateGroup) {
            const gateTemplateGroupIndex = _.findIndex(state, s => s.id === gateTemplateGroup.id)
            newState = newState.slice(0, gateTemplateGroupIndex).concat([ _.cloneDeep(_.merge(gateTemplateGroup, action.payload.parameters)) ]).concat(newState.slice(gateTemplateGroupIndex + 1))
        } else {
            console.log('UPDATE_GATE_TEMPLATE_GROUP failed: no gateTemplateGroup with id', action.payload.gateTemplateGroupId, 'was found')
        }
    // --------------------------------------------------
    // Remove a gate template group
    // --------------------------------------------------
    } else if (action.type === 'REMOVE_GATE_TEMPLATE_GROUP') {
        const gateTemplateGroup = _.find(state, s => s.id === action.payload.gateTemplateGroupId)

        if (gateTemplateGroup) {
            const gateTemplateGroupIndex = _.findIndex(state, s => s.id === gateTemplateGroup.id)
            newState = newState.slice(0, gateTemplateGroupIndex).concat(newState.slice(gateTemplateGroupIndex + 1))
        } else {
            console.log('REMOVE_GATE_TEMPLATE_GROUP failed: no gateTemplateGroup with id', action.payload.gateTemplateGroupId, 'was found')
        }
    // --------------------------------------------------
    // Sets the loading state of a particular sample for this template group
    // --------------------------------------------------
    } else if (action.type === 'SET_GATE_TEMPLATE_GROUP_SAMPLE_LOADING') {
        const gateTemplateGroupIndex = _.findIndex(state, w => w.id === action.payload.gateTemplateGroupId)

        if (gateTemplateGroupIndex > -1) {
            const newGateTemplateGroup = _.clone(state[gateTemplateGroupIndex])
            newGateTemplateGroup.samplesLoading = _.clone(state[gateTemplateGroupIndex].samplesLoading)
            newGateTemplateGroup.samplesLoading[action.payload.sampleId] = action.payload.loadingParameters
        } else {
            console.log('SET_GATE_TEMPLATE_GROUP_SAMPLE_LOADING failed: no gateTemplateGroup with id', action.payload.gateTemplateGroupId, 'was found')
        }
    }

    return newState
}

export default gateTemplateGroups