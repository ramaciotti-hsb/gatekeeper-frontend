// -------------------------------------------------------------
// Exported functions below
// -------------------------------------------------------------
import applicationReducer from '../reducers/application-reducer'
import { setAuthenticatedUser } from '../actions/application-actions'
import { createWorkspace } from '../actions/workspace-actions'

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
const makeAjaxCall = (url, data) => {
    const headers = new Headers({
        'Content-Type': 'application/json'
    })
    if (data && !_.isEmpty(data)) {
        data = JSON.stringify(data)
    }
    var request = new Request(url, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        headers: headers,
        credentials: 'include',
        body: data
    });

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
        if (result.workspace) {
            const createWorkspaceAction = createWorkspace(parameters)
            reduxStore.dispatch(createWorkspaceAction)
        } else {
            console.log('workspace failed to be created', result)
        }
    }
}