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
            newWorkspaceLoading: false
        }
        this.dropdownRef = React.createRef();
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
                                <div className='item'>
                                    <div>Open FCS File(s)</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Dropdown>
            </div>
        )
    }
}