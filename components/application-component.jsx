import React from 'react'
import { Component } from 'react'
import _ from 'lodash'
import Workspace from '../containers/workspace-container.jsx'
import HomologyModal from '../containers/homology-modal-container.jsx'
import GatingErrorModal from '../containers/gating-error-modal-container.jsx'
import MenuBar from './menu-bar-component.jsx'
import Login from './login-component.jsx'

export default class Application extends Component {

    constructor (props) {
        super(props)
        
        this.state = {
            editingWorkspaceTitleId: null,
            editingWorkspaceTitleText: null
        }
    }

    newWorkspace () {
        this.props.api.createWorkspace({
            title: "New Workspace",
            samples: []
        })
    }

    selectWorkspace (workspaceId) {
        this.props.api.selectWorkspace(workspaceId)
    }

    closeWorkspace (workspaceId, event) {
        this.props.api.removeWorkspace(workspaceId)
        // Stop propagation to prevent the selectWorkspace event from firing
        event.stopPropagation()
    }

    onDropFile (event) {
        // event.preventDefault();

        // for (let file of event.dataTransfer.files) {
        //     if (file.path.match(/\.fcs/)) {
        //         this.addNewFCSFilesToWorkspace([file.path])
        //     }
        // }
        
        // return false;
    }

    addNewFCSFilesToWorkspace (filePaths) {
        // Open one or more FCS files and add them to the workspace
        if (filePaths) {
            // Loop through if multiple files were selected
            for (let filePath of filePaths) {
                if (!filePath) { console.log("Error: undefined FCS file passed to readFCSFileData"); continue }

                const FCSFile = {
                    filePath: filePath,
                    title: filePath.split(path.sep).slice(-1)[0], // Returns just the filename without the path
                    description: 'FCS File',
                }
                this.props.api.createFCSFileAndAddToWorkspace(this.props.selectedWorkspaceId, FCSFile)
            }
        }
    }

    enableWorkspaceTitleEditing (workspaceId, workspaceText, event) {
        this.setState({
            editingWorkspaceTitleId: workspaceId,
            editingWorkspaceTitleText: workspaceText
        })
    }

    saveWorkspaceTitle () {
        this.props.api.updateWorkspace(this.state.editingWorkspaceTitleId, { title: this.state.editingWorkspaceTitleText })
        this.setState({
            editingWorkspaceTitleId: null,
            editingWorkspaceTitleText: null
        })
    }

    updateWorkspaceTitleText (event) {
        this.setState({ editingWorkspaceTitleText: event.target.value })
    }

    // TODO
    // openWorkspaceFiles (filePaths) {
    //     const toReturn = []
    //     if (filePaths) {
    //         // Loop through if multiple files were selected
    //         for (let filePath of filePaths) {
    //             const workspace = JSON.parse(fs.readFileSync(filePath))
    //             workspace.filePath = filePath
    //             toReturn.push(workspace)
    //         }
    //     }
    //     return toReturn
    // }

    // TODO
    // showSaveWorkspaceAsDialogBox () {
    //     let workspace = _.find(this.props.workspaces, workspace => workspace.id === this.props.selectedWorkspaceId)

    //     dialog.showSaveDialog({ title: `Save Workspace As:`, message: `Save Workspace As:`, defaultPath: workspace.replace(/\ /g, '-').toLowerCase() + '.json' }, (filePath) => {
    //         if (filePath) {
    //             // Prevent runtime state information such as running commands and stdout from being saved to the workspace file
    //             for (let sample of workspace.samples) {
    //                 sample.toJSON = function () {
    //                     return _.omit(this, [ 'filePath', 'runningCommand', 'running', 'error', 'output', 'status', 'stdinInputValue'])
    //                 };
    //             }
    //             fs.writeFile(filePath, JSON.stringify(workspace, null, 4), function (error) {
    //                 if (error) {
    //                     return console.log(error);
    //                 }

    //                 console.log("The file was saved!");
    //             });
    //         }
    //     })
    // }

    // TODO
    // showOpenWorkspacesDialog () {
    //     dialog.showOpenDialog({ title: `Open Workspace File`, filters: [{ name: 'CLR workspace templates', extensions: ['json']}], message: `Open Workspace File`, properties: ['openFile'] }, (filePaths) => {
    //         const workspace = this.openWorkspaceFiles(filePaths)[0]
    //         this.props.workspaces.push(workspace)
    //         this.setState({ workspaces: this.props.workspaces }, this.saveSessionState.bind(this))
    //     })
    // }

    showOpenFCSFileDialog () {
        // let workspace = _.find(this.props.workspaces, workspace => workspace.id === this.props.selectedWorkspaceId)
        // dialog.showOpenDialog({ title: `Open Sample File`, filters: [{ name: 'FCS Files', extensions: ['fcs']}], message: `Open Sample File`, properties: ['openFile', 'multiSelections'] }, (filePaths) => {
        //     this.addNewFCSFilesToWorkspace(filePaths)
        // })
    }

    render () {
        if (!this.props.authenticatedUser) {
            return (
                <div className='container'>
                    <Login api={this.props.api} />
                </div>
            )
        }

        if (this.props.sessionBroken) {
            return (
                <div className='container'>
                    <div className='broken-message'>
                        <div className='text'>There was an error trying to load your previous session. This could have been caused by a version upgrade.</div>
                        <div className='text'>We apologise for any inconvenience. If you find time, please report this bug on our Trello board.</div>
                        <div className='button' onClick={this.props.api.resetSession}><i className='lnr lnr-cross-circle' />Click here to reset your session</div>
                    </div>
                </div>
            )
        }

        let workspace = _.find(this.props.workspaces, workspace => workspace.id === this.props.selectedWorkspaceId)

        const workspaceTabs = this.props.workspaces.map((workspace) => {
            let tabText
            if (this.state.editingWorkspaceTitleId === workspace.id) {
                tabText = <input type="text" value={this.state.editingWorkspaceTitleText} onChange={this.updateWorkspaceTitleText.bind(this)} onBlur={this.saveWorkspaceTitle.bind(this)} autoFocus onFocus={(event) => { event.target.select() }} onKeyPress={(event) => { event.key === 'Enter' && event.target.blur() }} />
            } else {
                tabText = <div className='text' onClick={this.enableWorkspaceTitleEditing.bind(this, workspace.id, workspace.title)}>{workspace.title}</div>
            }
            return (
                <div className={`tab${this.props.selectedWorkspaceId === workspace.id ? ' selected' : ''}`} key={workspace.id} onClick={this.selectWorkspace.bind(this, workspace.id)}>
                    {tabText}
                    <div className='close-button' onClick={this.closeWorkspace.bind(this, workspace.id)}><i className='lnr lnr-cross' /></div>
                </div>
            )
        })

        let workspaceView

        if (workspace) {
            workspaceView = <Workspace workspaceId={this.props.selectedWorkspaceId}/>
        } else {
            workspaceView = <Workspace />
        }

        return (
            <div className='container' onDrop={this.onDropFile.bind(this)}>
                <MenuBar api={this.props.api} />
                <div className={`loader-outer maxIndex opaque${this.props.sessionLoading ? ' active' : ''}`}><div className='loader'></div><div className='text'>Connecting to server...</div></div>
                <div className='tab-bar'>
                    {workspaceTabs}
                </div>
                <div className='container-inner'>
                    {workspaceView}
                </div>
                <HomologyModal />
                <GatingErrorModal />
            </div>
        )
    }
}