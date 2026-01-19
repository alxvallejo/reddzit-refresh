import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface VideoInfo {
    type: 'youtube' | 'reddit';
    url?: string; // YouTube embed URL
    hlsUrl?: string; // Reddit HLS URL (includes audio)
    fallbackUrl?: string; // Reddit fallback URL (no audio)
    hasAudio?: boolean;
}

interface VideoProps {
    url: VideoInfo | string; // Accept both new object format and legacy string
    title?: string;
}

const Video: React.FC<VideoProps> = ({ url, title = 'Video' }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);

    // Normalize to VideoInfo object for backwards compatibility
    const videoInfo: VideoInfo = typeof url === 'string'
        ? { type: 'youtube', url }
        : url;

    useEffect(() => {
        // Only set up HLS for Reddit videos
        if (videoInfo.type !== 'reddit' || !videoInfo.hlsUrl || !videoRef.current) {
            return;
        }

        const video = videoRef.current;

        // Check if HLS is natively supported (Safari)
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = videoInfo.hlsUrl;
        } else if (Hls.isSupported()) {
            // Use hls.js for Chrome, Firefox, etc.
            const hls = new Hls();
            hlsRef.current = hls;
            hls.loadSource(videoInfo.hlsUrl);
            hls.attachMedia(video);
        } else {
            // Fallback to video-only (no audio) for browsers without HLS support
            video.src = videoInfo.fallbackUrl || '';
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [videoInfo.type, videoInfo.hlsUrl, videoInfo.fallbackUrl]);

    // YouTube: use iframe
    if (videoInfo.type === 'youtube' && videoInfo.url) {
        return (
            <div className="relative pb-[56.25%] h-0 overflow-hidden max-w-full my-4 rounded-lg shadow-lg bg-black">
                <iframe
                    src={videoInfo.url}
                    title={title}
                    className="absolute top-0 left-0 w-full h-full border-0"
                    allowFullScreen
                />
            </div>
        );
    }

    // Reddit: use native video element with HLS
    if (videoInfo.type === 'reddit') {
        return (
            <div className="relative max-w-full my-4 rounded-lg shadow-lg bg-black overflow-hidden">
                <video
                    ref={videoRef}
                    controls
                    playsInline
                    className="w-full h-auto"
                    title={title}
                >
                    Your browser does not support the video tag.
                </video>
            </div>
        );
    }

    return null;
};

export default Video;
