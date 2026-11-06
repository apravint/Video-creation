import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";
import { AspectRatio, VeoOperation, Resolution } from '../types';
import { EXTENSION_MODEL } from '../constants';

// A custom error class to signal API key issues specifically.
export class ApiKeyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ApiKeyError';
    }
}

const POLLING_INTERVAL_MS = 10000;

async function pollForVideo(
    operation: GenerateVideosOperation,
    onProgress: (message: string) => void,
    loadingMessages: string[]
): Promise<VeoOperation> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let currentOperation = operation;
    let messageIndex = 0;

    const progressInterval = setInterval(() => {
        onProgress(loadingMessages[messageIndex % loadingMessages.length]);
        messageIndex++;
    }, 5000);

    onProgress(loadingMessages[0]);

    try {
        while (true) {
            await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
            
            try {
                // getVideosOperation needs the operation object (it reads `.name`), not just the name.
                currentOperation = await ai.operations.getVideosOperation({ operation: currentOperation });
            } catch (error: any) {
                 if (error.message && error.message.includes("Requested entity was not found.")) {
                    throw new ApiKeyError("API Key is invalid or not found. Please select a valid API key.");
                }
                throw error; // Re-throw other errors
            }

            if (currentOperation.done) {
                break;
            }
        }
    } finally {
        clearInterval(progressInterval);
    }
    
    return currentOperation as unknown as VeoOperation;
}


export const generateInitialVideo = async (
    prompt: string,
    aspectRatio: AspectRatio,
    resolution: Resolution,
    model: string,
    onProgress: (message: string) => void,
    loadingMessages: string[]
): Promise<VeoOperation> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let initialOperation: GenerateVideosOperation;

    try {
        initialOperation = await ai.models.generateVideos({
            model: model,
            prompt,
            config: {
                numberOfVideos: 1,
                resolution,
                aspectRatio,
            }
        });
    } catch (error: any) {
         if (error.message && error.message.includes("Requested entity was not found.")) {
            throw new ApiKeyError("API Key is invalid or not found. Please select a valid API key.");
        }
        throw error;
    }
    
    return pollForVideo(initialOperation, onProgress, loadingMessages);
};

export const extendVideo = async (
    prompt: string,
    durationSeconds: number,
    previousOperation: VeoOperation,
    onProgress: (message: string) => void,
    loadingMessages: string[]
): Promise<VeoOperation> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const previousVideo = previousOperation.response?.generatedVideos?.[0]?.video;

    if (!previousVideo) {
        throw new Error("No previous video found to extend.");
    }
    
    let extensionOperation: GenerateVideosOperation;

    try {
        extensionOperation = await ai.models.generateVideos({
            model: EXTENSION_MODEL,
            prompt,
            video: previousVideo,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: previousVideo.aspectRatio as AspectRatio,
                durationSeconds: durationSeconds,
            }
        });
    } catch (error: any) {
        if (error.message && error.message.includes("Requested entity was not found.")) {
            throw new ApiKeyError("API Key is invalid or not found. Please select a valid API key.");
        }
        throw error;
    }

    return pollForVideo(extensionOperation, onProgress, loadingMessages);
};