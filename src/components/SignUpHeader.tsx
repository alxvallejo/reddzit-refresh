import React, { Component } from "react";
import smeagol from "../smeagol.png";

class SignUpHeader extends Component {
    render() {
        return (
            <div className="sign-up-header">
                <img className="logo img-fit-contain" src={smeagol} alt="reddzit" />
                <div className="site-name">
                    <div className="welcome-to">Welcome to</div>
                    <h1>Reddzit</h1>
                    <div className="caption">You cannot view this post because you are not logged in.</div>
                    <div className="sign-up-message">
                        Sign up for Reddit today. Already have a Reddit account? <a href="/reddit">Login here</a>.
                    </div>
                </div>
            </div>
        );
    }
}

export default SignUpHeader;
