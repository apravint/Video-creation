// This is a simplified representation of the operation object from the Gemini API
// for type safety within our application.
export interface VeoOperation {
    done: boolean;
    name: string;
    response?: {
        generatedVideos: {
            video: {
                uri: string;
                aspectRatio: string;
            };
        }[];
    };
    // We can add other properties like 'error' if needed for error handling.
}

export type AspectRatio = '16:9' | '9:16';

export type Resolution = '720p' | '1080p';
