// -------------------------------------------------------------------------
// React component for rendering a login screen
// -------------------------------------------------------------------------

import React from 'react'
import ReactDOM from 'react-dom'
import { Component } from 'react'
import '../scss/login-component.scss'

export default class Login extends Component {

    constructor (props) {
        super(props)
        console.log(this.props.api)
        this.state = {
            username: '',
            password: '',
            loading: false
        }
    }

    login (event) {
        this.setState({ loading: true });
        this.props.api.login(this.state.username, this.state.password)
    }

    updateField (key, event) {
        this.state[key] = event.target.value
        this.setState(this.state)
    }

    render () {
        return (
            <div className='login-container'>
                <input type='text' placeholder='Email Address' value={this.state.username} onChange={this.updateField.bind(this, 'username')} />
                <input type='password' placeholder='Password' value={this.state.password} onChange={this.updateField.bind(this, 'password')} />
                <div className='submit' onClick={this.login.bind(this)}>Submit</div>
            </div>
        )
    }
}