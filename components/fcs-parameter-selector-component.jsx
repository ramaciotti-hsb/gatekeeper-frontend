// -------------------------------------------------------------------------
// React component for rendering a scrollable selector for enabling and
// disabling fcs file parameters
// -------------------------------------------------------------------------

import React from 'react'
import ReactDOM from 'react-dom'
import { Component } from 'react'
import _ from 'lodash'
import uuidv4 from 'uuid/v4'
import constants from '../../gatekeeper-utilities/constants'
import '../scss/fcs-parameter-selector.scss'
import { registerKeyListener, deregisterKeyListener } from '../lib/global-keyboard-listener'

export default class FCSParameterSelector extends Component {

    constructor (props) {
        super(props)
        this.state = {
            filterValue: ''
        }

        this.filterInputRef = React.createRef()
    }

    componentDidMount () {
        this.keyboardListenerId = uuidv4()
        registerKeyListener(this.keyboardListenerId, constants.CHARACTER_CODE_ESCAPE, () => { this.setState({ filterValue: '' }); this.filterInputRef.current.blur() })
    }

    componentWillUnmount () {
        deregisterKeyListener(this.keyboardListenerId)
    }

    onFilter (event) {
        this.setState({
            filterValue: event.target.value.replace('\\', '')
        })
    }

    render () {
        const parameters = _.filter(this.props.selectedFCSFile.FCSParameters, p => p.key.toLowerCase().match(this.state.filterValue.toLowerCase()) || p.label.toLowerCase().match(this.state.filterValue.toLowerCase())).sort((a, b) => {
            if (!a.key.match(/\d+/)) {
                return 1
            } else if (!b.key.match(/\d+/)) {
                return -1
            } else {
                return a.key.match(/\d+/)[0] - b.key.match(/\d+/)[0]
            }
        }).map((parameter) => {

            const disabled = this.props.selectedWorkspace.disabledParameters && this.props.selectedWorkspace.disabledParameters[parameter.key]
            let parameterKey
            if (parameter.key !== parameter.label) {
                parameterKey = <div className='parameter-key'><div className='middot'>·</div>{parameter.key}</div>
            }
            return (
                <div className={'parameter-row ' + (disabled ? 'disabled' : 'enabled')} key={parameter.key} onClick={this.props.api.setFCSDisabledParameters.bind(null, this.props.selectedWorkspace.id, { [parameter.key]: !disabled })}>
                    <i className={'lnr ' + (disabled ? 'lnr-circle-minus' : 'lnr-checkmark-circle')} />
                    <div className='text'>{parameter.label}{parameterKey}</div>
                </div>
            )
        })

        const disabledKeys = _.filter(_.keys(this.props.selectedWorkspace.disabledParameters), k => _.find(this.props.selectedFCSFile.FCSParameters, p => p.key === k))
        let someDisabled = false
        disabledKeys.map((k) => {
            someDisabled = this.props.selectedWorkspace.disabledParameters[k] || someDisabled
        })

        let clearInput
        if (this.state.filterValue.length > 0) {
            clearInput = <i className='lnr lnr-cross-circle' onClick={() => { this.setState({ filterValue: '' })} } />
        }

        return (
            <div className='parameter-selector-outer' style={{ width: this.props.showDisabledParameters ? 'auto' : 0, minWidth: this.props.showDisabledParameters ? 200 : 0 }}>
                <div className='header'>Toggle Parameters</div>
                <div className='parameter-row toggle-all' onClick={someDisabled ?
                    this.props.api.setFCSDisabledParameters.bind(null, this.props.selectedWorkspace.id, _.zipObject(_.keys(this.props.selectedFCSFile.FCSParameters), _.keys(this.props.selectedFCSFile.FCSParameters).map(p => false))) :
                    this.props.api.setFCSDisabledParameters.bind(null, this.props.selectedWorkspace.id, _.zipObject(_.keys(this.props.selectedFCSFile.FCSParameters), _.keys(this.props.selectedFCSFile.FCSParameters).map(p => true))) }>
                    <i className={'lnr lnr-menu-circle'} />
                    <div className='text'>{someDisabled ? 'Enable All' : 'Disable All'}</div>
                </div>
                <div className='parameter-row filter'>
                    <i className={'lnr lnr-magnifier'} />
                    <input type='text' placeholder='Filter' value={this.state.filterValue} onChange={this.onFilter.bind(this)} ref={this.filterInputRef} />
                    {clearInput}
                </div>
                <div className='parameter-selector-inner'>
                    {parameters}
                </div>
                <div className='close-tab' onClick={this.props.api.toggleShowDisabledParameters} >
                    <div className='arrow top' />
                    <i className={'lnr lnr-chevron-' + (this.props.showDisabledParameters ? 'left' : 'right')} />
                    <div className='arrow bottom' />
                </div>
            </div>
        )
    }
}