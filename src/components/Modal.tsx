import React, { Component } from 'react';

import ReadControls from './ReadControls';
import ReadControlsFooter from './ReadControlsFooter';
import { getParsedContent, getArticlePreviewImage } from '../helpers/RedditUtils';
import { CopyToClipboard } from 'react-copy-to-clipboard';

class Modal extends Component {
    constructor(props) {
        super(props);

        this.state = {
            copied: false
        };

        this.getOverlayClass = this.getOverlayClass.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleContent = this.handleContent.bind(this);
    }

    componentDidMount() {
        // const { selectedContent, selectedPost } = this.props;
        // this.setState({
        //     selectedContent,
        //     selectedPost,
        //     closing: false
        // });
        // this.handleContent();
    }

    componentDidUpdate(prevProps) {
        if (this.props.selectedContent !== prevProps.selectedContent) {
            this.setState({
                selectedContent: this.props.selectedContent
            });
            // this.handleContent();
        }
    }

    componentWillUnmount() {
        // this.setState({
        //     selectedContent: null,
        //     selectedPost: null,
        //     content: null
        // });
    }

    getOverlayClass(close = false) {
        const { darkMode } = this.props;

        if (darkMode) {
            return close ? 'content-modal-overlay darkMode close' : 'content-modal-overlay darkMode';
        } else {
            return close ? 'content-modal-overlay close' : 'content-modal-overlay';
        }
    }

    handleClose() {
        const { resetSelected } = this.props;
        this.setState({
            closing: true
        });
        resetSelected();
    }

    handleContent() {
        // const { contentLoading, fontSize } = this.props;
        // const { selectedContent, selectedPost } = this.state;
        // if ((selectedContent, selectedPost)) {
        //     let newContent = getParsedContent(selectedContent, contentLoading, selectedPost, fontSize);
        //     console.log('newContent', newContent);
        //     // this.setState({
        //     //     content: newContent
        //     // });
        //     return newContent;
        // }
        // return <div />;
    }

    copyButton() {
        const { selectedPost } = this.props;
        const { copied } = this.state;
        const origin = window.location.origin || (window.location.protocol + '//' + window.location.host);
        const copyUrl = `${origin}/p/${selectedPost.name}`;
        const copyLabel = copied ? 'Copied' : 'Copy Share Link';

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
        const {
            showDrawer,
            selectedContent,
            selectedPost,
            darkMode,
            setSize,
            fontSize,
            contentLoading,
            toggleDarkMode,
            redditLink,
            saveButton,
            copyButton
        } = this.props;

        const { closing } = this.state;

        const readControlClass = darkMode ? 'read-controls-wrapper' : 'read-controls-wrapper';
        const readContentClass = darkMode ? 'read-content content-modal darkMode' : 'read-content content-modal';
        const modalClass = selectedPost ? 'active' : 'out';

        return (
            <div id="modal-container" className={modalClass}>
                <div className="modal-background">
                    <div className={readContentClass}>
                        <div className={readControlClass}>
                            {selectedPost && (
                                <div className="post-title">
                                    <h2>{redditLink(selectedPost)}</h2>
                                    <div className="subtitle">
                                        <span className="subreddit">{selectedPost.subreddit}</span>
                                    </div>
                                </div>
                            )}
                            <ReadControls
                                fontSize={fontSize}
                                setSize={setSize}
                                darkMode={darkMode}
                                toggleDarkMode={toggleDarkMode}
                            />
                        </div>

                        {selectedPost && getArticlePreviewImage(selectedPost) && (
                            <div className="article-preview-image">
                                <img 
                                    src={getArticlePreviewImage(selectedPost)} 
                                    alt="" 
                                    className="img-responsive"
                                    style={{ maxWidth: '100%', height: 'auto', marginBottom: '1rem' }}
                                />
                            </div>
                        )}

                        {getParsedContent(selectedContent, contentLoading, selectedPost, fontSize)}
                        {selectedContent && selectedPost && (
                            <ReadControlsFooter
                                selectedPost={selectedPost}
                                showDrawer={showDrawer}
                                saveButton={saveButton}
                            />
                        )}
                    </div>
                    <button
                        className="btn btn-primary btn-action btn-lg close-modal"
                        onClick={() => this.handleClose()}
                    >
                        <i className="icon icon-cross" />
                    </button>
                </div>
            </div>
        );
    }
}

export default Modal;
