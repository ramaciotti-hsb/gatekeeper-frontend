import React from 'react'
import { Component } from 'react'
import _ from 'lodash'
import Dropdown from '../lib/dropdown-inline.jsx'
import constants from '../../gatekeeper-utilities/constants'
import uuidv4 from 'uuid/v4'
import FCSParameterSelector from '../containers/fcs-parameter-selector-container.jsx'
import MultipleSampleView from '../containers/multiple-sample-view-container.jsx'
import { registerKeyListener, deregisterKeyListener } from '../lib/global-keyboard-listener'

export default class FCSFileSelector extends Component {

    constructor(props) {
        super(props)
        this.state = {
            containerWidth: 1000
        }
        this.containerRef = React.createRef()
        this.fileSelectorRef = React.createRef()
        this.machineTypeRef = React.createRef()
        this.xScaleRef = React.createRef()
        this.yScaleRef = React.createRef()
    }

    updateContainerSize () {
        this.setState({ containerWidth: this.containerRef.current.offsetWidth })
    }

    arrowKeyPressed (characterCode) {
        // Don't allow the user to switch between FCS files if there are unsaved gates in a gating modal
        if (this.props.unsavedGates) {
            console.log('Warning: arrow key navigation of FCS files is disabled while unsaved gates exist.')
            return
        }
        // Get the index of the currently selected FCS file
        let index = _.findIndex(this.props.FCSFiles, fcs => fcs.id === this.props.selectedFCSFile.id)

        let newIndex = index
        if (characterCode === constants.CHARACTER_CODE_LEFT_ARROW && index > 0) {
            newIndex = index - 1
        }

        if (characterCode === constants.CHARACTER_CODE_RIGHT_ARROW && index < this.props.FCSFiles.length - 1) {
            newIndex = index + 1
        }

        if (index !== newIndex) {
            this.props.api.selectFCSFile(this.props.FCSFiles[newIndex].id, this.props.workspaceId)
        }
    }

    componentDidMount () {
        this.updateContainerSize()
        this.resizeFunction = _.debounce(this.updateContainerSize.bind(this), 100)
        window.addEventListener('resize', this.resizeFunction)
        // Bind the left and right arrow keys to switch between samples
        this.leftKeyListenerId = uuidv4()
        this.rightKeyListenerId = uuidv4()
        registerKeyListener(this.leftKeyListenerId, constants.CHARACTER_CODE_LEFT_ARROW, this.arrowKeyPressed.bind(this, constants.CHARACTER_CODE_LEFT_ARROW))
        registerKeyListener(this.rightKeyListenerId, constants.CHARACTER_CODE_RIGHT_ARROW, this.arrowKeyPressed.bind(this, constants.CHARACTER_CODE_RIGHT_ARROW))
    }

    componentWillUnmount () {
        window.removeEventListener('resize', this.resizeFunction)
    }

    selectFCSFile (FCSFileId) {
        this.fileSelectorRef.current.getInstance().hideDropdown()
        this.props.api.selectFCSFile(FCSFileId, this.props.workspaceId)
    }

    selectMachineType (FCSFileId, machineType) {
        this.machineTypeRef.current.getInstance().hideDropdown()
        this.props.api.updateFCSFile(FCSFileId, { machineType })
    }

    render () {
        let inner

        if (this.props.FCSFiles.length > 0) {
            const FCSFiles = this.props.FCSFiles.map((FCSFile) => {
                const isSelected = this.props.selectedFCSFile && FCSFile.id === this.props.selectedFCSFile.id
                return {
                    value: FCSFile.title,
                    component: (
                        <div className={'item' + (isSelected ? ' selected' : '')} onClick={isSelected ? () => {} : this.selectFCSFile.bind(this, FCSFile.id, this.props.workspaceId)} key={FCSFile.id}>
                            <div className='text'>{FCSFile.title}</div>
                            <div className='dot' />
                        </div>
                    )
                }
            })

            if (this.props.selectedFCSFile) {
                let multipleSampleView
                if (this.props.selectedFCSFile && this.props.selectedSample) {
                    multipleSampleView = <MultipleSampleView FCSFileId={this.props.selectedFCSFile.id} sampleId={this.props.selectedSample.id} />
                }

                const machineTypes = [
                    {
                        key: constants.MACHINE_FLORESCENT,
                        label: 'Florescent'
                    },
                    {
                        key: constants.MACHINE_CYTOF,
                        label: 'Mass Cytometry'
                    }
                ]

                const machineTypesRendered = machineTypes.map((machineType) => {
                    return {
                        value: machineType.label,
                        component: <div className='item' onClick={this.selectMachineType.bind(this, this.props.selectedFCSFile.id, machineType.key)} key={machineType.key}>{machineType.label}</div>
                    }
                })

                let machineTypeMessage
                if (this.props.selectedFCSFile && this.props.selectedFCSFile.machineType) {
                    machineTypeMessage = 'Machine Type: ' + _.find(machineTypes, m => m.key === this.props.selectedFCSFile.machineType).label
                } else {
                    machineTypeMessage = 'Loading...'
                }

                const scales = [
                    { key: constants.SCALE_LOG, label: 'Log' },
                    { key: constants.SCALE_LINEAR, label: 'Linear' },
                    { key: constants.SCALE_BIEXP, label: 'Biexponential' }
                ]

                const xScalesRendered = scales.map((scale) => {
                    return {
                        value: scale.label,
                        component: <div className='item' onClick={() => { this.props.api.updateWorkspace(this.props.workspaceId, { selectedXScale: scale.key }); this.xScaleRef.current.getInstance().hideDropdown() }} key={scale.key}>{scale.label}</div>
                    }
                })

                const yScalesRendered = scales.map((scale) => {
                    return {
                        value: scale.label,
                        component: <div className='item' onClick={() => { this.props.api.updateWorkspace(this.props.workspaceId, { selectedYScale: scale.key }); this.yScaleRef.current.getInstance().hideDropdown() }} key={scale.key}>{scale.label}</div>
                    }
                })

                let xScaleMessage = <div>{scales.find(s => s.key === this.props.selectedWorkspace.selectedXScale).label}</div>
                let yScaleMessage = <div>{scales.find(s => s.key === this.props.selectedWorkspace.selectedYScale).label}</div>

                inner = (
                    <div className='fcs-file-selector-inner'>
                        <div className='header'>
                            <div className='fcs-file-selector-dropdown'><Dropdown items={FCSFiles} textLabel={this.props.selectedFCSFile ? this.props.selectedFCSFile.title : 'Select FCSFile'} ref={this.fileSelectorRef} /></div>
                            <div className={'button delete' + (this.state.containerWidth < 1200 ? ' compact' : '')} onClick={this.props.api.removeFCSFile.bind(null, this.props.selectedFCSFile.id)}>
                                <i className='lnr lnr-cross-circle'></i>
                                <div className='text'>Remove File From Workspace</div>
                            </div>
                            <div className='machine-type-selector-dropdown'><Dropdown items={machineTypesRendered} textLabel={machineTypeMessage} ref={this.machineTypeRef} /></div>
                            <div className='scale-label x'>X</div>
                            <div className='scale-selector x-scale'><Dropdown items={xScalesRendered} textLabel={xScaleMessage} ref={this.xScaleRef} /></div>
                            <div className='scale-label y'>Y</div>
                            <div className='scale-selector y-scale'><Dropdown items={yScalesRendered} textLabel={yScaleMessage} ref={this.yScaleRef} /></div>
                            <div className='divider' />
                        </div>
                        <div className='container-horizontal'>
                            <FCSParameterSelector />
                            {multipleSampleView}
                        </div>
                    </div>
                )
            } else { // There is no selected FCS file
                    inner = (
                    <div className='fcs-file-selector-inner unselected'>
                        <div className='header'>
                            <div className='fcs-file-selector-dropdown'><Dropdown items={FCSFiles} textLabel={this.props.selectedFCSFile ? this.props.selectedFCSFile.title : 'Select FCSFile'} ref={this.fileSelectorRef} /></div>
                            <div className='divider' />
                        </div>
                        <div className='container-horizontal'>
                            <div className='center'>Select an FCS file to get started.</div>
                        </div>
                    </div>
                )
            }
        } else { // There are no FCS files in the workspace
            inner = (
                <div className='fcs-file-selector-inner empty'>
                    <div>Drag and drop FCS Files or use Use File -> Add to workspace to add an FCSFile.</div>
                </div>
            )
        }

        return (
            <div className='fcs-file-selector-outer' ref={this.containerRef}>
                {inner}
            </div>
        )
    }
}