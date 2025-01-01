import React, { Component } from 'react';

class NoContent extends Component {
    render() {
        const redditLink = <a href="https://reddit.com">Reddit</a>;

        return (
            <div className="no-content-wrapper">
                <h2>No Reddit Posts Saved Yet!</h2>
                <p>
                    Head to your {redditLink}, start saving stuff that you like or want to read later, and then check
                    back!
                </p>
            </div>
        );
    }
}

export default NoContent;
