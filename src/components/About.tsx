import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Link } from 'react-router-dom';
import { faArrowAltCircleLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

class About extends Component {
    render() {
        return (
            <div className="container about-container">
                <div className="about-header">
                    <div className="site-name">
                        <div className="left-box">
                            <Link className="txt-primary back-button" to="/">
                                <FontAwesomeIcon icon={faArrowAltCircleLeft} />
                            </Link>
                        </div>
                        <div className="description">
                            <div className="label">Twitter</div>
                            <div>
                                <a href="https://twitter.com/seojeek">@seojeek</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default About;
