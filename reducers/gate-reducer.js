// -------------------------------------------------------------
// A redux reducer for CRUD operations involving gates.
// -------------------------------------------------------------

import _ from 'lodash'

const gates = (state = [], action = {}) => {
    let newState = state.slice(0)
    // --------------------------------------------------
    // Create a new gate and add to state
    // --------------------------------------------------
    if (action.type === 'CREATE_GATE') {
        const newGate = action.payload
        newState.push(newGate)
    }
    // --------------------------------------------------
    // Remove a gate
    // --------------------------------------------------
    else if (action.type === 'REMOVE_GATE') {
        const gateIndex = _.findIndex(state, g => g.id === action.payload.gateId)
        if (gateIndex > -1) {
            newState = newState.slice(0, gateIndex).concat(newState.slice(gateIndex + 1))            
        } else {
            console.log('REMOVE_GATE failed: no gate with id', action.payload.gateId, 'was found')
        }
    }
    // --------------------------------------------------
    // Update a parameter on a gate
    // --------------------------------------------------
    else if (action.type === 'UPDATE_GATE') {
        const gateIndex = _.findIndex(state, g => g.id === action.payload.gateId)
        if (gateIndex > -1) {
            let newGate = _.merge(_.cloneDeep(newState[gateIndex]), action.payload.parameters)
            newState = newState.slice(0, gateIndex).concat([ newGate ]).concat(newState.slice(gateIndex + 1))         
        } else {
            console.log('HIGHLIGHT_GATE failed: no gate with id', action.payload.gateId, 'was found')
        }
    }

    return newState
}

export default gates