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
import                           '../scss/multi-select-dropdown.scss'
import { registerKeyListener, deregisterKeyListener } from './global-keyboard-listener'

// The outer menu react element
class MultiSelectDropdown extends Component {
    constructor (props) {
        super(props)
        this.state = {
            items: this.props.items,
            dropdownVisible: false,
            searchText: ''
        }

        this.searchRef = React.createRef()
    }

    showDropdown (event) {
        if (this.state.dropdownVisible === false) {
            this.setState({ dropdownVisible: true }, function () {
                ReactDOM.findDOMNode(this.searchRef.current).focus()
            })
        }
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

    onKeyDown (event) {
        if (event.key === 'Backspace' && this.state.searchText.length === 0) {
            if (this.props.selectedItems.length > 0) {
                this.props.removeSelectedItem(this.props.selectedItems.length - 1)
            }
        }
    }

    focusInput () {
        this.setState({
            searchText: ''
        })
        this.searchRef.current.focus()
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
        if (this.state.dropdownVisible === true || this.props.selectedItems.length === 0) {
            textLabel = <input type='text' placeholder={this.props.searchPlaceholder || 'Type to search...'} value={this.state.searchText} onChange={this.updateSearchText.bind(this)} onKeyDown={this.onKeyDown.bind(this)} ref={this.searchRef} />
        }

        var filteredItems = this.props.items
        // If the search term was empty, just show all results
        if (this.state.searchText.length !== 0) {
            // Search the index for the input value
            filteredItems = _.filter(filteredItems, (item) => {
                let matched = true
                for (let term of this.state.searchText.toLowerCase().split(' ')) {
                    matched = matched && item.value.toLowerCase().includes(term)
                }
                return matched
            })
        }

        var itemsToRender = filteredItems.map((item) => { return item.component })

        return (
            <div className={'multi-select-dropdown ' + (this.props.outerClasses || '') + (this.state.dropdownVisible ? ' active' : '')} onClick={this.showDropdown.bind(this)}>
                <div className='inner'>
                    <div className='input-outer'>
                        {this.props.selectedItems}
                        {textLabel}
                    </div>
                    <i className="icon fa fa-caret-down"></i>
                    <div className="menu">
                        {itemsToRender}
                    </div>
                </div>
            </div>
        )
    }
}

export default OnClickOutside(MultiSelectDropdown)