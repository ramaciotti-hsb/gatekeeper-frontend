// -------------------------------------------------------------------------
// React component for rendering the top context menus, a replacement for the
// desktop menu bar in electron
// -------------------------------------------------------------------------

import React from 'react'
import ReactDOM from 'react-dom'
import { Component } from 'react'
import '../scss/menu-bar-component.scss'
import Dropdown from '../lib/dropdown.jsx'

export default class MenuBar extends Component {

    constructor (props) {
        super(props)
        this.state = {
            newWorkspaceLoading: false,
            newFCSFileLoading: false
        }
        this.dropdownRef = React.createRef();
    }

    uploadFCSFile (event) {
        const files = event.target.files;
        this.setState({
            newFCSFileLoading: true
        })
        for (let file of files) {

            this.props.api.createFCSFileAndAddToWorkspace(this.props.workspaceId, { title: file.name }).then((FCSFile) => {
                this.dropdownRef.current.getInstance().hideDropdown()
                this.setState({
                    newFCSFileLoading: false
                })
                this.props.api.uploadFCSFile(FCSFile.id, file)
            })
        }
    }

    newWorkspaceClicked () {
        this.setState({
            newWorkspaceLoading: true
        })
        this.props.api.createWorkspace({
            title: 'New Workspace'
        }).then(() => {
            this.setState({
                newWorkspaceLoading: false
            })
            this.dropdownRef.current.getInstance().hideDropdown()
        })
    }

    render () {
        return (
            <div className='menu-bar'>
                <div className='logo'>Gatekeeper</div>
                <Dropdown outerClasses='dark right button' ref={this.dropdownRef}>
                    <div className='inner'>
                        <div className='text'>File</div>
                        <div className='menu'>
                            <div className='menu-inner'>
                                <div className='item' onClick={this.newWorkspaceClicked.bind(this)}>
                                    <div className={`loader-outer opaque dark${this.state.newWorkspaceLoading ? ' active' : ''}`}><div className='loader small'></div></div>
                                    <div>New Workspace</div>
                                </div>
                                <label className='item upload'>
                                    <input id='file' type='file' name='uploads' accept='.fcs' onChange={this.uploadFCSFile.bind(this)} />
                                    <div>Open FCS File(s)</div>
                                </label>
                            </div>
                        </div>
                    </div>
                </Dropdown>
            </div>
        )
    }
}