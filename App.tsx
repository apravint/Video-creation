import React, { useState, useEffect, useCallback } from 'react';
import { ApiKeySelector } from './components/ApiKeySelector';
import { VideoGenerator } from './components/VideoGenerator';
import { ApiKeyError } from './services/geminiService';
import { VeoOperation, AspectRatio, Resolution } from './types';
import { generateInitialVideo, extendVideo } from './services/geminiService';
import { LOADING_MESSAGES } from './constants';

// FIX: Removed conflicting global declaration for 'aistudio'.
// The type is likely provided by the environment's global type definitions.

function App() {
    const [apiKeySelected, setApiKeySelected] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [lastOperation, setLastOperation] = useState<VeoOperation | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentAspectRatio, setCurrentAspectRatio] = useState<AspectRatio>('16:9');
    const [currentResolution, setCurrentResolution] = useState<Resolution>('720p');


    const checkApiKey = useCallback(async () => {
        if (window.aistudio) {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            setApiKeySelected(hasKey);
        } else {
            // If aistudio is not available, maybe we are in a dev environment
            // For dev purposes, we can assume a key is selected.
            // In a real prod environment, this else might not be needed.
            console.warn("window.aistudio not found. Assuming API key is selected for development.");
            setApiKeySelected(true);
        }
    }, []);

    useEffect(() => {
        checkApiKey();
    }, [checkApiKey]);

    const handleSelectApiKey = async () => {
        if (window.aistudio) {
            await window.aistudio.openSelectKey();
            // Optimistically assume key selection was successful to provide immediate UI feedback.
            setApiKeySelected(true);
        }
    };
    
    const resetApiKey = () => {
        setApiKeySelected(false);
        setError("Your API Key seems to be invalid. Please select a valid key to continue.");
    }

    const handleGenerate = async (prompt: string, aspectRatio: AspectRatio, resolution: Resolution, videoEffect: string) => {
        setIsLoading(true);
        setError(null);
        setVideoUrl(null);
        setCurrentAspectRatio(aspectRatio);
        setCurrentResolution(resolution);

        // Append the effect to the prompt if one is selected
        const finalPrompt = videoEffect !== 'none' ? `${prompt}, ${videoEffect}` : prompt;

        try {
            const resultOperation = await generateInitialVideo(finalPrompt, aspectRatio, resolution, setLoadingMessage, LOADING_MESSAGES);
            const downloadLink = resultOperation.response?.generatedVideos?.[0]?.video?.uri;
            if (downloadLink && process.env.API_KEY) {
                setVideoUrl(`${downloadLink}&key=${process.env.API_KEY}`);
                setLastOperation(resultOperation);
            } else {
                throw new Error("Video generation failed: No download link found.");
            }
        } catch (e) {
            if (e instanceof ApiKeyError) {
                resetApiKey();
            } else {
                 setError(e instanceof Error ? e.message : "An unknown error occurred during video generation.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleExtend = async (prompt: string, duration: number) => {
        if (!lastOperation) {
            setError("Cannot extend video without a previous generation.");
            return;
        }

        setIsLoading(true);
        setError(null);
        
        try {
            const resultOperation = await extendVideo(prompt, duration, lastOperation, setLoadingMessage, LOADING_MESSAGES);
            const downloadLink = resultOperation.response?.generatedVideos?.[0]?.video?.uri;
            if (downloadLink && process.env.API_KEY) {
                setVideoUrl(`${downloadLink}&key=${process.env.API_KEY}`);
                setLastOperation(resultOperation);
            } else {
                throw new Error("Video extension failed: No download link found.");
            }
        } catch (e) {
             if (e instanceof ApiKeyError) {
                resetApiKey();
            } else {
                 setError(e instanceof Error ? e.message : "An unknown error occurred during video extension.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Fix: Add a handler to allow child component to reset the app state.
    const handleStartOver = () => {
        setVideoUrl(null);
        setLastOperation(null);
        setError(null);
    };


    if (apiKeySelected === null) {
        return <div className="min-h-screen flex items-center justify-center bg-brand-bg"><p>Checking API Key status...</p></div>;
    }

    if (!apiKeySelected) {
        return <ApiKeySelector onSelectApiKey={handleSelectApiKey} />;
    }

    return (
        <VideoGenerator
            isLoading={isLoading}
            loadingMessage={loadingMessage}
            videoUrl={videoUrl}
            error={error}
            onGenerate={handleGenerate}
            onExtend={handleExtend}
            onStartOver={handleStartOver}
            aspectRatio={currentAspectRatio}
            canExtend={currentResolution === '720p'}
        />
    );
}

export default App;