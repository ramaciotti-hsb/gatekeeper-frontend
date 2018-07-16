// -------------------------------------------------------------
// Exported functions below
// -------------------------------------------------------------
import applicationReducer from '../reducers/application-reducer'
import { setAuthenticatedUser } from '../actions/application-actions'
import { createWorkspace, selectWorkspace, removeWorkspace, updateWorkspace } from '../actions/workspace-actions'

let reduxStore = {}
// Keep a copy of the redux store and dispatch events
export const setStore = (store) => {
    reduxStore = store
    if (localStorage.getItem('user-data')) {
        const setAuthenticatedUserAction = setAuthenticatedUser(JSON.parse(localStorage.getItem('user-data')))
        reduxStore.dispatch(setAuthenticatedUserAction)
        
    }
}

let postSendHook
// Check every response from the server for 401 codes
const checkResponse = (response, url, data) => {
    if (response.status === 401) {
        const setAuthenticatedUserAction = setAuthenticatedUser(null)
        reduxStore.dispatch(setAuthenticatedUserAction)
        localStorage.removeItem('user-data')
    }
    // If the user successfully logged in, get the user data and save the logged in session to the local storage
    if (url.match(/login/) && data.errors.length === 0) {
        const setAuthenticatedUserAction = setAuthenticatedUser(data.user)
        reduxStore.dispatch(setAuthenticatedUserAction)
        localStorage.setItem('user-data', JSON.stringify(data.user))
    }
    // If the user successfully logged out, remove the user data from local storage
    if (url.match(/logout/) && data.errors.length === 0) {
        // Remove the logged in user from the local storage
        const setAuthenticatedUserAction = setAuthenticatedUser(null)
        reduxStore.dispatch(setAuthenticatedUserAction)
        localStorage.removeItem('user-data')
    }
}

// Wrapper for more easily making AJAX calls
const makeAjaxCall = (url, data, multipart) => {
    let request

    if (multipart) {
        const formData = new FormData()
        formData.append("file", data)
        request = new Request(url, {
            method: 'POST',
            mode: 'cors',
            credentials: 'include',
            body: formData
        })
    } else {
        let headers = new Headers({})
        if (data && !_.isEmpty(data)) {
            headers = new Headers({
                'Content-Type': 'application/json'
            })
            
            data = JSON.stringify(data)
        }

        request = new Request(url, {
            method: 'POST',
            mode: 'cors',
            redirect: 'follow',
            headers: headers,
            credentials: 'include',
            body: data
        })
    }

    return new Promise(function (resolve, reject) {
        fetch(request)
        .then((response) => {
            const bodyData = response.json()
            bodyData.then((json) => {
                checkResponse(response, url, json)
                resolve(json)
            }).catch((error) => {
                checkResponse(response, url, {})
                reject(error)
            })
        })
        .catch((response, message) => {
            checkResponse(response, url, {})
            reject(message);
        });
    });
};

// Start a recurring 5s authentication / internet connection check
// setInterval(() => {
//     api.getCurrentUser();
// }, 5000);

// Load the workspaces and samples the user last had open when the app was used
export const api = {

    login: async function (username, password) {
        let result

        result = await makeAjaxCall(`${process.env.API_URL}/auth/login`, { email: username, password })

        const setAuthenticatedUserAction = setAuthenticatedUser(result.user)
        reduxStore.dispatch(setAuthenticatedUserAction)
        // api.getSession()
    },

    getCurrentUser: async function () {
        await makeAjaxCall(`${process.env.API_URL}/auth/get_current_user`)
    },

    getSession: async function () {
        const session = await makeAjaxCall(`${process.env.API_URL}/get_session`)

        try {
            reduxStore.dispatch({ type: 'SET_SESSION_BROKEN', payload: { sessionBroken: false } })
            reduxStore.dispatch({ type: 'SET_SESSION_STATE', payload: session.session })
            reduxStore.dispatch({ type: 'SET_SESSION_LOADING', payload: { sessionLoading: false } })
            // cleanupImageDirectories()
        } catch (error) {
            reduxStore.dispatch({ type: 'SET_SESSION_BROKEN', payload: { sessionBroken: true } })
            reduxStore.dispatch({ type: 'SET_SESSION_LOADING', payload: { sessionLoading: false } })
            console.log(error)
        }

        // After reading the session, if there's no workspace, create a default one
        // if (currentState.workspaces.length === 0) {
        //     const workspaceId = await api.createWorkspace({ title: 'New Workspace', description: 'New Workspace' })
        //     await api.selectWorkspace(workspaceId)
        // }
    },

    createWorkspace: async function (parameters) {
        const result = await makeAjaxCall(`${process.env.API_URL}/workspaces/create_workspace`, parameters)
        if (result.success) {
            const createWorkspaceAction = createWorkspace(result.workspace)
            reduxStore.dispatch(createWorkspaceAction)
        } else {
            console.log('workspace failed to be created', result)
        }
    },

    selectWorkspace: async function (workspaceId) {
        const result = await makeAjaxCall(`${process.env.API_URL}/user_settings/select_workspace`, { workspaceId })
        if (result.success) {
            const selectWorkspaceAction = selectWorkspace(workspaceId)
            reduxStore.dispatch(selectWorkspaceAction)
        } else {
            console.log('workspace failed to be selected', result)
        }
    },

    removeWorkspace: async function (workspaceId) {
        const result = await makeAjaxCall(`${process.env.API_URL}/workspaces/remove_workspace`, { workspaceId })
        if (result.success) {
            const removeAction = removeWorkspace(workspaceId)
            reduxStore.dispatch(removeAction)
        }
    },

    // Update a workspace with arbitrary parameters
    updateWorkspace: async function (workspaceId, parameters) {
        const result = await makeAjaxCall(`${process.env.API_URL}/workspaces/update_workspace`, { workspaceId, parameters })
        if (result.success) {
            const updateWorkspaceAction = updateWorkspace(workspaceId, result.workspace)
            reduxStore.dispatch(updateWorkspaceAction)
        }
    },

    // createFCSFileAndAddToWorkspace: async function (workspaceId, FCSFileParameters) {
    //     const result = await makeAjaxCall(`${process.env.API_URL}/fcs_files/create_fcs_file`, { workspaceId, parameters: FCSFileParameters })

    //     if (result.success) {
    //         // Find the associated workspace
    //         let workspace = _.find(currentState.workspaces, w => w.id === workspaceId)

    //         let FCSFile = {
    //             id: FCSFileId,
    //             filePath: FCSFileParameters.filePath,
    //             title: FCSFileParameters.title,
    //             description: FCSFileParameters.description,
    //         }

    //         const createFCSFileAction = createFCSFileAndAddToWorkspace(workspaceId, FCSFile)
    //         currentState = applicationReducer(currentState, createFCSFileAction)
    //         reduxStore.dispatch(createFCSFileAction)

    //         const FCSMetaData = await getFCSMetadata(FCSFile.filePath)

    //         const updateAction = updateFCSFile(FCSFileId, FCSMetaData)
    //         currentState = applicationReducer(currentState, updateAction)
    //         reduxStore.dispatch(updateAction)

    //         const sampleId = uuidv4()
    //         const createSampleAction = createSampleAndAddToWorkspace(workspaceId, {
    //             id: sampleId,
    //             title: 'Root Sample',
    //             FCSFileId,
    //             description: 'Top level root sample for this FCS File',
    //             gateTemplateId: workspace.gateTemplateIds[0],
    //             populationCount: FCSMetaData.populationCount
    //         })
    //         currentState = applicationReducer(currentState, createSampleAction)
    //         reduxStore.dispatch(createSampleAction)

    //         const workspaceParameters = {
    //             selectedGateTemplateId: workspace.gateTemplateIds[0],
    //             selectedXScale: FCSMetaData.machineType === constants.MACHINE_CYTOF ? constants.SCALE_LOG : constants.SCALE_BIEXP,
    //             selectedYScale: FCSMetaData.machineType === constants.MACHINE_CYTOF ? constants.SCALE_LOG : constants.SCALE_BIEXP
    //         }

    //         const updateWorkspaceAction = updateWorkspace(workspaceId, workspaceParameters)
    //         currentState = applicationReducer(currentState, updateWorkspaceAction)
    //         reduxStore.dispatch(updateWorkspaceAction)

    //         const sample = _.find(currentState.samples, s => s.id === sampleId)
    //         getAllPlotImages(sample, workspaceParameters)

    //         saveSessionToDisk()

    //         // Recursively apply the existing gating hierarchy
    //         // api.applyGateTemplatesToSample(sampleId)
    //     }
    // },

    uploadFCSFile: async function (file) {
        // Create a new form upload to s3
        const result = await makeAjaxCall(`${process.env.API_URL}/fcs_files/upload_fcs_file`, file, true)
    },
}