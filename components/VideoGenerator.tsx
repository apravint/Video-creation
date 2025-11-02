import React, { useState } from 'react';
import { Loader } from './Loader';
import { VideoPlayer } from './VideoPlayer';
import { AspectRatio, Resolution } from '../types';

interface VideoGeneratorProps {
    isLoading: boolean;
    loadingMessage: string;
    videoUrl: string | null;
    error: string | null;
    onGenerate: (prompt: string, aspectRatio: AspectRatio, resolution: Resolution, videoEffect: string) => void;
    onExtend: (prompt: string, duration: number) => void;
    onStartOver: () => void;
    aspectRatio: AspectRatio;
    canExtend: boolean;
}

const videoEffects = [
    { value: 'none', label: 'None' },
    { value: 'in slow motion', label: 'Slow Motion' },
    { value: 'in fast forward', label: 'Fast Forward' },
    { value: 'black and white', label: 'Black and White' },
    { value: 'sepia tone', label: 'Sepia' },
    { value: 'vintage film look', label: 'Vintage Film' },
    { value: 'cinematic', label: 'Cinematic' },
];

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const ShareIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
    </svg>
);


export const VideoGenerator: React.FC<VideoGeneratorProps> = ({
    isLoading,
    loadingMessage,
    videoUrl,
    error,
    onGenerate,
    onExtend,
    onStartOver,
    aspectRatio,
    canExtend,
}) => {
    const [prompt, setPrompt] = useState('');
    const [extendPrompt, setExtendPrompt] = useState('');
    const [extensionDuration, setExtensionDuration] = useState(7);
    const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('16:9');
    const [selectedResolution, setSelectedResolution] = useState<Resolution>('720p');
    const [selectedEffect, setSelectedEffect] = useState<string>('none');
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);
    const [isLinkCopied, setIsLinkCopied] = useState(false);

    const handleGenerateClick = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim() && !isLoading) {
            onGenerate(prompt, selectedAspectRatio, selectedResolution, selectedEffect);
        }
    };

    const handleExtendClick = (e: React.FormEvent) => {
        e.preventDefault();
        if (extendPrompt.trim() && !isLoading) {
            onExtend(extendPrompt, extensionDuration);
            setExtendPrompt('');
        }
    };

    const handleStartOverClick = () => {
        setPrompt('');
        setExtendPrompt('');
        setSelectedAspectRatio('16:9');
        setSelectedResolution('720p');
        setExtensionDuration(7);
        setSelectedEffect('none');
        onStartOver();
    };

    const handleDownload = async () => {
        if (!videoUrl || isDownloading) return;

        setDownloadError(null);
        setIsDownloading(true);
        try {
            const response = await fetch(videoUrl);
            if (!response.ok) {
                throw new Error('Network response was not ok while downloading the video.');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `veo-generated-video-${new Date().toISOString()}.mp4`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download failed:', err);
            setDownloadError("Download failed. Please check your connection and try again.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleShare = async () => {
        if (!videoUrl) return;

        const shareData = {
            title: 'Check out my AI-generated video!',
            text: 'Created with the Veo Video Creator.',
            url: videoUrl,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (error) {
                console.error('Sharing failed or was cancelled', error);
            }
        } else {
            // Fallback for browsers that don't support Web Share API
            try {
                await navigator.clipboard.writeText(videoUrl);
                setIsLinkCopied(true);
                setTimeout(() => setIsLinkCopied(false), 3000); // Reset after 3 seconds
            } catch (err) {
                console.error('Failed to copy link:', err);
                // In a real app, you might want to show a user-facing error here
            }
        }
    };

    return (
        <div className="min-h-screen bg-brand-bg text-brand-text-primary p-4 sm:p-6 md:p-8 flex flex-col items-center">
            {isLoading && <Loader message={loadingMessage} />}

            <div className="w-full max-w-2xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">
                        Veo Video Creator
                    </h1>
                    <p className="mt-2 text-brand-text-secondary">
                        Bring your imagination to life with generative video.
                    </p>
                </header>

                {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6" role="alert">
                        <p className="font-bold">An error occurred</p>
                        <p>{error}</p>
                    </div>
                )}

                {videoUrl ? (
                    <section className="space-y-6 flex flex-col items-center">
                        <h2 className="text-2xl font-bold text-center">Your Generated Video</h2>
                        <VideoPlayer videoUrl={videoUrl} aspectRatio={aspectRatio} />
                        
                        <div className="w-full flex flex-col items-center">
                             <div className="flex items-center justify-center flex-wrap gap-4">
                                <button
                                    onClick={handleShare}
                                    className="flex items-center justify-center bg-brand-primary hover:bg-opacity-90 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-surface focus:ring-brand-primary"
                                >
                                    <ShareIcon />
                                    Share
                                </button>
                                 <button
                                    onClick={handleDownload}
                                    disabled={isDownloading}
                                    className="flex items-center justify-center bg-brand-surface hover:bg-opacity-90 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-surface focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                                >
                                    <DownloadIcon />
                                    {isDownloading ? 'Downloading...' : 'Download'}
                                </button>
                                <button
                                    onClick={handleStartOverClick}
                                    className="text-brand-secondary hover:underline focus:outline-none"
                                >
                                    Start Over
                                </button>
                            </div>
                            <div className="h-6 mt-3 flex items-center">
                                {downloadError && (
                                    <div className="text-red-500 text-sm" role="alert">
                                        {downloadError}
                                    </div>
                                )}
                                {isLinkCopied && (
                                    <div className="text-green-400 text-sm" role="status">
                                        Link Copied!
                                    </div>
                                )}
                            </div>
                        </div>

                        {canExtend && (
                           <form onSubmit={handleExtendClick} className="w-full max-w-lg space-y-4 mt-4">
                                <div>
                                    <label htmlFor="extend-prompt" className="block text-sm font-medium text-brand-text-secondary">
                                       Extend your video
                                    </label>
                                    <textarea
                                        id="extend-prompt"
                                        value={extendPrompt}
                                        onChange={(e) => setExtendPrompt(e.target.value)}
                                        placeholder="e.g., something unexpected happens..."
                                        rows={2}
                                        className="w-full p-3 mt-1 bg-brand-surface rounded-lg border border-brand-outline focus:ring-2 focus:ring-brand-primary focus:outline-none transition-shadow"
                                        disabled={isLoading}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="duration-input" className="block text-sm font-medium text-brand-text-secondary">
                                        Extension Duration (1-10 seconds)
                                    </label>
                                     <input
                                        id="duration-input"
                                        type="number"
                                        value={extensionDuration}
                                        onChange={(e) => setExtensionDuration(Math.max(1, Math.min(10, Number(e.target.value))))}
                                        min="1"
                                        max="10"
                                        className="w-full p-3 mt-1 bg-brand-surface rounded-lg border border-brand-outline focus:ring-2 focus:ring-brand-primary focus:outline-none transition-shadow"
                                        disabled={isLoading}
                                    />
                                </div>

                               <button
                                   type="submit"
                                   disabled={isLoading || !extendPrompt.trim()}
                                   className="w-full bg-brand-secondary hover:bg-opacity-90 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-surface focus:ring-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                               >
                                   {isLoading ? 'Extending...' : 'Extend Video'}
                               </button>
                           </form>
                        )}

                    </section>
                ) : (
                    <form onSubmit={handleGenerateClick} className="bg-brand-surface rounded-2xl shadow-lg p-6 space-y-6">
                        <div>
                            <label htmlFor="prompt" className="block text-lg font-semibold mb-2">
                                What do you want to create?
                            </label>
                            <textarea
                                id="prompt"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="A neon hologram of a cat driving at top speed"
                                rows={4}
                                className="w-full p-3 bg-brand-bg rounded-lg border border-brand-outline focus:ring-2 focus:ring-brand-primary focus:outline-none transition-shadow"
                                required
                            />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label className="block text-sm font-medium mb-2 text-brand-text-secondary">Aspect Ratio</label>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setSelectedAspectRatio('16:9')} className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${selectedAspectRatio === '16:9' ? 'bg-brand-primary text-white' : 'bg-brand-bg hover:bg-brand-outline'}`}>16:9 (Landscape)</button>
                                    <button type="button" onClick={() => setSelectedAspectRatio('9:16')} className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${selectedAspectRatio === '9:16' ? 'bg-brand-primary text-white' : 'bg-brand-bg hover:bg-brand-outline'}`}>9:16 (Portrait)</button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-brand-text-secondary">Resolution</label>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setSelectedResolution('720p')} className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${selectedResolution === '720p' ? 'bg-brand-primary text-white' : 'bg-brand-bg hover:bg-brand-outline'}`}>720p</button>
                                    <button type="button" onClick={() => setSelectedResolution('1080p')} className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${selectedResolution === '1080p' ? 'bg-brand-primary text-white' : 'bg-brand-bg hover:bg-brand-outline'}`}>1080p</button>
                                </div>
                            </div>
                        </div>

                         <div>
                            <label htmlFor="effect" className="block text-sm font-medium mb-2 text-brand-text-secondary">Video Effect</label>
                            <select
                                id="effect"
                                value={selectedEffect}
                                onChange={(e) => setSelectedEffect(e.target.value)}
                                className="w-full p-3 bg-brand-bg rounded-lg border border-brand-outline focus:ring-2 focus:ring-brand-primary focus:outline-none transition-shadow"
                            >
                                {videoEffects.map(effect => (
                                    <option key={effect.value} value={effect.value}>
                                        {effect.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !prompt.trim()}
                            className="w-full bg-brand-primary hover:bg-opacity-90 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-surface focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                        >
                            {isLoading ? 'Generating...' : 'Generate Video'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};