
import React from 'react';

interface ApiKeySelectorProps {
    onSelectApiKey: () => void;
}

const KeyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H5v-2H3v-2H1v-4a6 6 0 017.743-5.743z" />
    </svg>
);


export const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onSelectApiKey }) => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-brand-bg text-center">
            <div className="max-w-md w-full bg-brand-surface rounded-2xl shadow-lg p-8 space-y-6">
                <h1 className="text-3xl font-bold text-brand-text-primary">Welcome to Veo Video Creator</h1>
                <p className="text-brand-text-secondary">
                    To start generating videos, you need to select a Google AI Studio API key. 
                    This enables the app to connect securely to the Veo model.
                </p>
                <button
                    onClick={onSelectApiKey}
                    className="w-full flex items-center justify-center bg-brand-primary hover:bg-opacity-90 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-surface focus:ring-brand-primary"
                >
                    <KeyIcon />
                    Select API Key
                </button>
                <div className="text-xs text-brand-text-secondary">
                    <p>
                        Video generation is a billable feature. For more information, please see the 
                        <a 
                            href="https://ai.google.dev/gemini-api/docs/billing" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-brand-secondary hover:underline ml-1"
                        >
                            billing documentation
                        </a>.
                    </p>
                </div>
            </div>
        </div>
    );
};
