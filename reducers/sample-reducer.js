// -------------------------------------------------------------
// A redux reducer for CRUD operations involving subsamples.
// Subsamples are fractions of a parent sample created using a
// 2d "gate" or some kind of clustering.
// -------------------------------------------------------------

import _ from 'lodash'
import { sampleLoadingFinished, removeSample } from '../actions/sample-actions'

const sampleReducer = (state = [], action = {}) => {
    let newState = state.slice(0)
    // --------------------------------------------------
    // Create a new sample and add to state
    // --------------------------------------------------
    if (action.type === 'CREATE_SAMPLE') {
        const newSample = {
            id: action.payload.id,
            parentSampleId: action.payload.parentSampleId,
            workspaceId: action.payload.workspaceId,
            gateTemplateId: action.payload.gateTemplateId,
            FCSFileId: action.payload.FCSFileId,
            title: action.payload.title,
            description: action.payload.description,
            populationCount: action.payload.populationCount,
            includeEventIds: action.payload.includeEventIds || [],
            parametersLoading: action.payload.parametersLoading || [],
            plotImages: action.payload.plotImages || {}
        }

        newState.push(newSample)
    // --------------------------------------------------
    // Remove a sample, all it's children and any references to it in it's parent
    // --------------------------------------------------
    } else if (action.type === 'REMOVE_SAMPLE') {
        const sample = _.find(state, s => s.id === action.payload.sampleId)

        if (sample) {
            const sampleIndex = _.findIndex(state, s => s.id === sample.id)
            newState = newState.slice(0, sampleIndex).concat(newState.slice(sampleIndex + 1))

            // Remove any sub samples
            for (let subSample of _.filter(newState.samples, s => s.parentSampleId === action.payload.sampleId)) {
                newState = sampleReducer(newState, removeSample(subSample.id))
            }
        } else {
            console.log('REMOVE_SAMPLE failed: no sample with id', action.payload.sampleId, 'was found')
        }
    // --------------------------------------------------
    // Set the url for a sample plot image
    // --------------------------------------------------
    } else if (action.type === 'SET_SAMPLE_PLOT_IMAGE') {
        // Find the target sample if there is one
        const sampleIndex = _.findIndex(state, s => s.id === action.payload.sampleId)
        if (sampleIndex > -1) {
            const newSample = _.clone(state[sampleIndex])
            newSample.plotImages = Object.assign({}, newSample.plotImages)
            newSample.plotImages[action.payload.imageKey] = action.payload.filePath
            newState = state.slice(0, sampleIndex).concat([newSample]).concat(state.slice(sampleIndex + 1))
        } else {
            console.log('SET_SAMPLE_PLOT_IMAGE failed: no sample with id', action.payload.sampleId, 'was found')   
        }
    // --------------------------------------------------
    // Update an arbitrary parameters on a sample
    // --------------------------------------------------
    } else if (action.type === 'UPDATE_SAMPLE') {
        const sampleIndex = _.findIndex(state, s => s.id === action.payload.sampleId)

        if (sampleIndex > -1) {
            const newSample = _.merge(_.clone(state[sampleIndex]), action.payload.parameters)
            newState = state.slice(0, sampleIndex).concat([newSample]).concat(state.slice(sampleIndex + 1))
        }
    // --------------------------------------------------
    // Mark a combination of parameters as loading
    // --------------------------------------------------
    } else if (action.type === 'SET_SAMPLE_PARAMETERS_LOADING') {
        const sampleIndex = _.findIndex(state, s => s.id === action.payload.sampleId)

        if (sampleIndex > -1) {
            const newSample = _.clone(state[sampleIndex])
            newSample.parametersLoading[action.payload.key] = action.payload.value
            newState = state.slice(0, sampleIndex).concat([newSample]).concat(state.slice(sampleIndex + 1))
        }
    }
    return newState
}

export default sampleReducer