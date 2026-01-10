import React from 'react';

interface VideoProps {
    url: string;
    title: string;
}

const Video: React.FC<VideoProps> = ({ url, title }) => {
    return (
        <div className="relative pb-[56.25%] h-0 overflow-hidden max-w-full my-4 rounded-lg shadow-lg bg-black">
            <iframe
                src={url}
                title={title}
                className="absolute top-0 left-0 w-full h-full border-0"
                allowFullScreen
            />
        </div>
    );
};

export default Video;
