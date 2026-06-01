import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { faArrowAltCircleLeft, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import API_BASE_URL from '../config/api';
import Seo from './Seo';

const About = () => {
    const location = useLocation();
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

    useEffect(() => {
        if (location.hash === '#feedback') {
            const el = document.getElementById('feedback');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [location.hash]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || status === 'sending') return;

        setStatus('sending');
        try {
            const res = await fetch(`${API_BASE_URL}/api/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message.trim(), page: window.location.pathname }),
            });
            if (!res.ok) throw new Error();
            setMessage('');
            setStatus('sent');
            setTimeout(() => setStatus('idle'), 3000);
        } catch {
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--color-primary)] flex items-center justify-center p-4">
            <Seo
                title="About Reddzit — a clean reader for your saved Reddit"
                description="Why we built Reddzit and how it keeps your saved posts and comments organized."
                path="/about"
            />
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
                <div className="flex justify-between items-center mb-6">
                    <Link className="text-[var(--color-primary)] text-2xl hover:text-[var(--color-primary-dark)] transition-colors" to="/">
                        <FontAwesomeIcon icon={faArrowAltCircleLeft} />
                    </Link>
                    <h1 className="text-xl font-bold text-gray-800 m-0">About</h1>
                    <div className="w-6"></div>
                </div>

                <div className="space-y-6 text-center">
                    <div>
                        <div className="text-xs uppercase font-bold text-gray-500 mb-1">Twitter</div>
                        <a href="https://twitter.com/seojeek" className="text-lg font-medium text-[var(--color-primary-dark)] hover:underline" target="_blank" rel="noreferrer">
                            @seojeek
                        </a>
                    </div>

                    <div id="feedback" className="pt-4 border-t border-gray-100 scroll-mt-4">
                        <div className="text-xs uppercase font-bold text-gray-500 mb-3">Feedback</div>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="What's on your mind?"
                                maxLength={2000}
                                disabled={status === 'sending'}
                                rows={4}
                                className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 resize-none"
                            />
                            <button
                                type="submit"
                                disabled={!message.trim() || status === 'sending'}
                                className="self-end px-4 py-2 rounded-full text-sm font-medium border-none cursor-pointer bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-default"
                            >
                                {status === 'sending' ? (
                                    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faPaperPlane} className="mr-1.5" />
                                        Send
                                    </>
                                )}
                            </button>
                        </form>

                        {status === 'sent' && (
                            <p className="text-xs mt-2 text-green-600">
                                Thanks for your feedback!
                            </p>
                        )}
                        {status === 'error' && (
                            <p className="text-xs mt-2 text-red-500">
                                Something went wrong. Try again.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default About;
