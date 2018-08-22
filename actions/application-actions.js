// -------------------------------------------------------------
// Redux actions for interacting with the global application state.
// -------------------------------------------------------------

import uuidv4 from 'uuid/v4'

export const setAuthenticatedUser = (authenticatedUser) => {
    return {
        type: 'SET_AUTHENTICATED_USER',
        payload: { authenticatedUser }
    }
}

export const showGatingModal = (sampleId, selectedXParameter, selectedYParameter) => {
    return {
        type: 'SHOW_GATING_MODAL',
        payload: { sampleId, selectedXParameter, selectedYParameter }
    }
}

export const hideGatingModal = () => {
    return {
        type: 'HIDE_GATING_MODAL'
    }
}

export const setGatingModalErrorMessage = (message) => {
    return {
        type: 'SET_GATING_MODAL_ERROR_MESSAGE',
        payload: { message }
    }
}

export const createGatingModalSeedPeak = (position) => {
    return {
        type: 'CREATE_GATING_MODAL_SEED_PEAK',
        payload: { seedPeak: { id: uuidv4(), position } }
    }
}

export const removeGatingModalSeedPeak = (seedPeakId) => {
    return {
        type: 'REMOVE_GATING_MODAL_SEED_PEAK',
        payload: { seedPeakId }
    }
}

export const setPlotDimensions = (plotWidth, plotHeight) => {
    return {
        type: 'SET_PLOT_DIMENSIONS',
        payload: { plotWidth, plotHeight }
    }
}

export const setPlotDisplayDimensions = (plotDisplayWidth, plotDisplayHeight) => {
    return {
        type: 'SET_PLOT_DISPLAY_DIMENSIONS',
        payload: { plotDisplayWidth, plotDisplayHeight }
    }
}


export const toggleShowDisabledParameters = () => {
    return {
        type: 'TOGGLE_SHOW_DISABLED_PARAMETERS'
    }
}

export const setUnsavedGates = (unsavedGates) => {
    return {
        type: 'SET_UNSAVED_GATES',
        payload: { unsavedGates }
    }
}