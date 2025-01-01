import React, { Component } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb as fasLightbulb } from '@fortawesome/free-solid-svg-icons';
import { faLightbulb as farLightbulb } from '@fortawesome/free-regular-svg-icons';

class ReadControls extends Component {
    getLightbulb() {
        const { darkMode } = this.props;
        return darkMode ? fasLightbulb : farLightbulb;
    }

    render() {
        let increment = 2;
        let fontSize = this.props.fontSize;
        const linkClass = 'btn btn-primary';
        return (
            <div className="read-controls">
                <div className="control">
                    <button className={linkClass + ' btn-sm'} onClick={() => this.props.setSize(fontSize - increment)}>
                        A
                    </button>
                    <button className={linkClass} onClick={() => this.props.setSize(fontSize + increment)}>
                        A
                    </button>
                    <button className={linkClass} onClick={() => this.props.toggleDarkMode()}>
                        <FontAwesomeIcon icon={this.getLightbulb()} />
                    </button>
                </div>
            </div>
        );
    }
}

export default ReadControls;
