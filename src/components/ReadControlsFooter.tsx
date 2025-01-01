import React, { Component } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { reddit_host } from '../helpers/RedditAuth';

class ReadControlsFooter extends Component {
    constructor(props) {
        super(props);
        this.state = {
            copied: false
        };
    }

    copyButton() {
        const { selectedPost } = this.props;
        const { copied } = this.state;
        let pathname = window.location.pathname;
        let copyUrl = 'https://' + window.location.hostname + pathname + '?name=' + selectedPost.name;
        const copyLabel = copied ? 'Copied' : 'Copy Link';

        return (
            <div className="copy-wrapper">
                <CopyToClipboard
                    text={copyUrl}
                    onCopy={() =>
                        this.setState({
                            copied: true
                        })
                    }
                >
                    <button className="btn">{copyLabel}</button>
                </CopyToClipboard>
            </div>
        );
    }

    render() {
        const { selectedPost, saveButton, showDrawer } = this.props;

        const buttonClass = 'btn-link';

        return (
            <div className="read-controls-footer">
                <div className="control">
                    <a
                        className={'btn ' + buttonClass}
                        target="_blank"
                        rel="noopener noreferrer"
                        href={reddit_host + selectedPost.permalink}
                    >
                        Visit
                    </a>
                    {saveButton(buttonClass)}
                    {showDrawer && selectedPost && this.copyButton()}
                </div>
            </div>
        );
    }
}

export default ReadControlsFooter;
