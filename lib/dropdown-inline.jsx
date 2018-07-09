// -------------------------------------------------------------
// This file contains a react.js component that renders a dropdown
// menu. This particular dropdown uses an "inline" style as if you 
// were selecting an option from a list, and features full text search
// of internal items.
// -------------------------------------------------------------

import React                from 'react'
import { Component }        from 'react'
import ReactDOM             from 'react-dom'
import _                    from 'lodash'
import OnClickOutside       from 'react-onclickoutside'
import constants            from '../../gatekeeper-utilities/constants'
import uuidv4               from 'uuid/v4'
import                           '../scss/dropdown-inline.scss'
import { registerKeyListener, deregisterKeyListener } from './global-keyboard-listener'

// The outer menu react element
class DropdownInline extends Component {
    constructor (props) {
        super(props)
        this.state = {
            items: this.props.items,
            dropdownVisible: false,
            searchText: ''
        }
    }

    showDropdown (event) {
        if (this.state.dropdownVisible === false) {
            this.setState({ dropdownVisible: true }, function () {
                ReactDOM.findDOMNode(this.refs.searchInput).focus()
            })
        }
        event.stopPropagation()
    }

    hideDropdown () {
        this.setState({ dropdownVisible: false, searchText: '' })
    }

    handleClickOutside () {
        this.hideDropdown()
    }

    updateSearchText (event) {
        this.setState({
            searchText: event.target.value
        })
    }

    componentDidMount () {
        this.keyboardListenerId = uuidv4()
        registerKeyListener(this.keyboardListenerId, constants.CHARACTER_CODE_ESCAPE, this.hideDropdown.bind(this))
    }

    componentWillUnmount () {
        deregisterKeyListener(this.keyboardListenerId)   
    }

    render () {
        var textLabel
        if (this.state.dropdownVisible === true) {
            textLabel = <input type='text' placeholder='Type to search...' value={this.state.searchText} onChange={this.updateSearchText.bind(this)} ref='searchInput' />
        } else {
            textLabel = <div className='text'>{this.props.textLabel}</div>
        }

        var filteredItems = this.props.items
        // If the search term was empty, just show all results
        if (this.state.searchText.length !== 0) {
            // Search the index for the input value
            filteredItems = _.filter(filteredItems, (item) => {
                return item.value.toLowerCase().includes(this.state.searchText.toLowerCase())
            })
        }

        var itemsToRender = filteredItems.map((item) => { return item.component })

        return (
            <div className={'dropdown-inline ' + (this.props.outerClasses || '') + (this.state.dropdownVisible ? ' active' : '')} onClick={this.showDropdown.bind(this)}>
                <div className='inner'>
                    {textLabel}
                    <i className="icon fa fa-caret-down"></i>
                    <div className="menu">
                        {itemsToRender}
                    </div>
                </div>
            </div>
        )
    }
}

export default OnClickOutside(DropdownInline)