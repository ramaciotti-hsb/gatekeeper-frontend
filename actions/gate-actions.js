// -------------------------------------------------------------
// Redux actions for interacting with gates.
// -------------------------------------------------------------

// Create a new gate
export const createGate = (parameters) => {
    return {
        type: 'CREATE_GATE',
        payload: parameters
    }
}

// Update an arbitrary property on a gate
export const updateGate = (gateId, parameters) => {
    return {
        type: 'UPDATE_GATE',
        payload: { gateId, parameters }
    }
}