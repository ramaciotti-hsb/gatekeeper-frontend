// -------------------------------------------------------------
// A redux reducer for CRUD operations involving workspaces.
// -------------------------------------------------------------

import uuidv4 from 'uuid/v4'
import _ from 'lodash'
import constants from '../../gatekeeper-utilities/constants'

const initialState = []

const workspaces = (state = initialState, action = {}) => {
    let newState = state.slice(0)

    // --------------------------------------------------
    // Create a new workspace
    // --------------------------------------------------
    if (action.type === 'CREATE_WORKSPACE') {
        newState.push(action.payload.workspace)
    // --------------------------------------------------
    // Remove a workspace from the state
    // --------------------------------------------------
    } else if (action.type === 'REMOVE_WORKSPACE') {
        const workspaceIndex = _.findIndex(state, w => w.id === action.payload.id)
        if (workspaceIndex > -1) {
            newState = newState.slice(0, workspaceIndex).concat(newState.slice(workspaceIndex + 1))
        } else {
            console.log('REMOVE_WORKSPACE failed: no workspace with id', action.payload.id, 'was found')
        }
    // --------------------------------------------------
    // Select a gate template that is already within a workspace
    // --------------------------------------------------
    } else if (action.type === 'SELECT_GATE_TEMPLATE') {
        const workspaceIndex = _.findIndex(state, w => w.id === action.payload.workspaceId)

        if (workspaceIndex > -1) {
            const newWorkspace = _.clone(state[workspaceIndex])
            newWorkspace.selectedGateTemplateId = action.payload.gateTemplateId
            newState[workspaceIndex] = newWorkspace
        } else {
            console.log('SELECT_GATE_TEMPLATE failed: no workspace with id', action.payload.workspaceId, 'was found')
        }
    // --------------------------------------------------
    // Select an FCS File that is already within a workspace
    // --------------------------------------------------
    } else if (action.type === 'SELECT_FCS_FILE') {
        const workspaceIndex = _.findIndex(state, w => w.id === action.payload.workspaceId)

        if (workspaceIndex > -1) {
            const newWorkspace = _.clone(state[workspaceIndex])
            newWorkspace.selectedFCSFileId = action.payload.FCSFileId
            newState[workspaceIndex] = newWorkspace
        } else {
            console.log('SELECT_FCS_FILE failed: no workspace with id', action.payload.workspaceId, 'was found')
        }
    // --------------------------------------------------
    // Update an arbitrary parameters on a workspace
    // --------------------------------------------------
    } else if (action.type === 'UPDATE_WORKSPACE') {
        const workspaceIndex = _.findIndex(state, s => s.id === action.payload.workspaceId)

        if (workspaceIndex > -1) {
            const newWorkspace = _.merge(_.cloneDeep(state[workspaceIndex]), action.payload.parameters)
            newState = state.slice(0, workspaceIndex).concat([newWorkspace]).concat(state.slice(workspaceIndex + 1))
        } else {
            console.log('UPDATE_WORKSPACE failed: no workspace with id', action.payload.workspaceId, 'was found')
        }
    // --------------------------------------------------
    // Toggle parameter inversion for display (i.e flip x and y axis)
    // --------------------------------------------------
    } else if (action.type === 'INVERT_PLOT_AXIS') {
        const workspaceIndex = _.findIndex(state, s => s.id === action.payload.workspaceId)

        if (workspaceIndex > -1) {
            const newWorkspace = _.clone(state[workspaceIndex])
            newWorkspace.invertedAxisPlots = _.clone(state[workspaceIndex].invertedAxisPlots)
            const parameters = [action.payload.selectedXParameter, action.payload.selectedYParameter].sort()

            if (!newWorkspace.invertedAxisPlots[`${parameters[0]}_${parameters[1]}`]) {
                newWorkspace.invertedAxisPlots[`${parameters[0]}_${parameters[1]}`] = true
            } else {
                newWorkspace.invertedAxisPlots[`${parameters[0]}_${parameters[1]}`] = false
            }
            newState = newState.slice(0, workspaceIndex).concat([ newWorkspace ]).concat(newState.slice(workspaceIndex + 1))
        }
    // --------------------------------------------------
    // Toggle FCS parameters betweeen enabled / disabled
    // --------------------------------------------------
    } else if (action.type === 'SET_FCS_DISABLED_PARAMETERS') {
        const workspaceIndex = _.findIndex(state, s => s.id === action.payload.workspaceId)

        if (workspaceIndex > -1) {
            const newWorkspace = _.clone(state[workspaceIndex])
            newWorkspace.disabledParameters = _.clone(state[workspaceIndex].disabledParameters)
            if (!newWorkspace.disabledParameters) {
                newWorkspace.disabledParameters = {}
            }
            newWorkspace.disabledParameters = _.merge(newWorkspace.disabledParameters, action.payload.parameters)
            newState = newState.slice(0, workspaceIndex).concat([ newWorkspace ]).concat(newState.slice(workspaceIndex + 1))
        }
    // --------------------------------------------------
    // Set the current "filtered" parameter keys used to decide which parameters will be displayed
    // --------------------------------------------------
    } else if (action.type === 'SET_FCS_FILTERED_PARAMETERS') {
        const workspaceIndex = _.findIndex(state, s => s.id === action.payload.workspaceId)

        if (workspaceIndex > -1) {
            const newWorkspace = _.clone(state[workspaceIndex])
            newWorkspace.filteredParameters = action.payload.parameters.slice(0)
            newState = newState.slice(0, workspaceIndex).concat([ newWorkspace ]).concat(newState.slice(workspaceIndex + 1))
        }
    // --------------------------------------------------
    // Set the current "filtered" parameter keys used to decide which parameters will be displayed
    // --------------------------------------------------
    } else if (action.type === 'SET_GATING_HASH') {
        const workspaceIndex = _.findIndex(state, s => s.id === action.payload.workspaceId)

        if (workspaceIndex > -1) {
            const newWorkspace = _.clone(state[workspaceIndex])
            newWorkspace.gatingHash = action.payload.gatingHash
            newState = newState.slice(0, workspaceIndex).concat([ newWorkspace ]).concat(newState.slice(workspaceIndex + 1))
        }
    }

    return newState
}

export default workspaces