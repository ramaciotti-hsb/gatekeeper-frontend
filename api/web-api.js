// -------------------------------------------------------------
// Exported functions below
// -------------------------------------------------------------

const reduxStore = {}

// Keep a copy of the redux store and dispatch events
export const setStore = (store) => { reduxStore = store }

// Load the workspaces and samples the user last had open when the app was used
export const api = { }