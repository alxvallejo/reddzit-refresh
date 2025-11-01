import React, { Component } from 'react';
import ReadControls from './ReadControls';
import { getParsedContent, getArticlePreviewImage } from '../helpers/RedditUtils';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import ReadControlsFooter from './ReadControlsFooter';

class OffCanvas extends Component {
    constructor(props) {
        super(props);
        this.state = {
            copied: false
        };
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
            resetSelected
        } = this.props;

        const wrapperClass = showDrawer ? 'nav-container showDrawer' : 'nav-container';
        let navClass = showDrawer ? 'navigation open' : 'navigation';
        const readControlClass = darkMode ? 'read-controls-wrapper' : 'read-controls-wrapper';
        const readContentClass = darkMode ? 'read-content darkMode' : 'read-content';

        navClass = darkMode ? navClass + ' darkMode' : navClass;

        return (
            <div className={wrapperClass}>
                <ul className={navClass}>
                    <div className={readContentClass}>
                        {showDrawer && (
                            <div className={readControlClass}>
                                {selectedContent && selectedPost && (
                                    <div className="post-title" style={{ fontSize: `${fontSize}px` }}>
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
                        )}

                        {showDrawer && selectedPost && getArticlePreviewImage(selectedPost) && (
                            <div className="article-preview-image">
                                <img 
                                    src={getArticlePreviewImage(selectedPost)} 
                                    alt="" 
                                    className="img-responsive"
                                    style={{ maxWidth: '100%', height: 'auto', marginBottom: '1rem' }}
                                />
                            </div>
                        )}

                        {showDrawer && getParsedContent(selectedContent, contentLoading, selectedPost, fontSize)}
                        {selectedContent && selectedPost && (
                            <ReadControlsFooter
                                selectedPost={selectedPost}
                                showDrawer={showDrawer}
                                saveButton={saveButton}
                            />
                        )}
                    </div>
                </ul>

                <input
                    type="checkbox"
                    id="nav-trigger"
                    className="nav-trigger"
                    checked={showDrawer}
                    onChange={() => showDrawer}
                />

                {showDrawer && (
                    <div className="fixed-controls">
                        <label htmlFor="nav-trigger" onClick={() => resetSelected()}>
                            <button className="btn btn-action btn-lg">
                                <i className="icon icon-cross" />
                            </button>
                        </label>
                    </div>
                )}
            </div>
        );
    }
}

export default OffCanvas;
