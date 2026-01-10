import React from 'react';
import { Link } from 'react-router-dom';
import { faArrowAltCircleLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const About = () => {
    return (
        <div className="min-h-screen bg-[var(--color-primary)] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
                <div className="flex justify-between items-center mb-6">
                    <Link className="text-[var(--color-primary)] text-2xl hover:text-[var(--color-primary-dark)] transition-colors" to="/">
                        <FontAwesomeIcon icon={faArrowAltCircleLeft} />
                    </Link>
                    <h1 className="text-xl font-bold text-gray-800 m-0">About</h1>
                    <div className="w-6"></div> {/* Spacer */}
                </div>
                
                <div className="space-y-4">
                    <div>
                        <div className="text-xs uppercase font-bold text-gray-500 mb-1">Twitter</div>
                        <a href="https://twitter.com/seojeek" className="text-lg font-medium text-[var(--color-primary-dark)] hover:underline" target="_blank" rel="noreferrer">
                            @seojeek
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default About;
