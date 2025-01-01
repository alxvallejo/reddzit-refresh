import React, { Component } from 'react';

class Video extends Component {
    render() {
        const { url, title } = this.props;
        return (
            <div className="vid-container">
                <iframe
                    src={url}
                    title={title}
                    frameBorder="0"
                    allowFullScreen
                    className="video"
                >
                </iframe>
            </div>
        );
    }
}

export default Video;