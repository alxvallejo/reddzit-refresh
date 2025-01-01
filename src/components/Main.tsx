import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Link } from "react-router-dom";

class Main extends Component {
    render() {
        return (
            <div className="main-wrapper">
                <p>Welcome to Reddzit</p>
                <div className="portal">
                    <Link to="/reddit" className="btn btn-primary portal-link">Reddit</Link>
                </div>
            </div >
        );
    }
}

export default Main;