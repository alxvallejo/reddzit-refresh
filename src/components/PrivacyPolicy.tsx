import React from 'react';
import { Link } from 'react-router-dom';
import { faArrowAltCircleLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen bg-[var(--color-primary)] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl w-full">
                <div className="flex justify-between items-center mb-6">
                    <Link className="text-[var(--color-primary)] text-2xl hover:text-[var(--color-primary-dark)] transition-colors" to="/">
                        <FontAwesomeIcon icon={faArrowAltCircleLeft} />
                    </Link>
                    <h1 className="text-xl font-bold text-gray-800 m-0">Privacy Policy</h1>
                    <div className="w-6"></div>
                </div>

                <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
                    <p className="text-gray-500 text-xs">Last updated: February 3, 2025</p>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-800 mb-2">What Reddzit Collects</h2>
                        <p>Reddzit and the Reddzit browser extension collect only the data necessary to provide the service:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li><strong>Reddit authentication token</strong> — used to access your Reddit account on your behalf (saved posts, subscriptions). Stored locally in your browser.</li>
                            <li><strong>Saved quotes</strong> — text you explicitly highlight and save, along with the source page URL and title. Stored on Reddzit servers tied to your account.</li>
                            <li><strong>Stories and notes</strong> — content you create within Reddzit. Stored on Reddzit servers.</li>
                            <li><strong>Theme preferences</strong> — your selected colors, fonts, and palettes. Stored locally in your browser.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-800 mb-2">What Reddzit Does Not Collect</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Reddzit does not read or store your browsing history.</li>
                            <li>Reddzit does not collect page content unless you explicitly save a quote.</li>
                            <li>Reddzit does not sell, share, or transfer your data to third parties.</li>
                            <li>Reddzit does not run analytics or tracking within the browser extension.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-800 mb-2">Browser Extension Permissions</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>storage</strong> — persists your authentication token across browser sessions.</li>
                            <li><strong>activeTab</strong> — reads your text selection when you save a quote. No page content is accessed without your action.</li>
                            <li><strong>Host permissions (reddzit.com, read-api.reddzit.com)</strong> — communicates with Reddzit servers to save and retrieve your quotes and authentication state.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-800 mb-2">Data Storage and Security</h2>
                        <p>Authentication tokens are stored locally in your browser using the Chrome storage API. Quotes and stories are stored on Reddzit servers and are accessible only to your authenticated account. All communication between the extension and Reddzit servers uses HTTPS.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-800 mb-2">Data Deletion</h2>
                        <p>You can delete individual quotes and stories at any time from within Reddzit. Uninstalling the browser extension removes all locally stored data. To request full account data deletion, contact <a href="mailto:privacy@reddzit.com" className="text-[var(--color-primary-dark)] hover:underline">privacy@reddzit.com</a>.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-800 mb-2">Contact</h2>
                        <p>Questions about this policy can be directed to <a href="mailto:privacy@reddzit.com" className="text-[var(--color-primary-dark)] hover:underline">privacy@reddzit.com</a>.</p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
