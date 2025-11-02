import React from 'react';

interface LoaderProps {
    message: string;
}

export const Loader: React.FC<LoaderProps> = ({ message }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 p-4">
            <div className="w-16 h-16 border-4 border-t-brand-primary border-r-brand-primary border-b-brand-primary border-l-transparent rounded-full animate-spin"></div>
            <p className="mt-6 text-lg text-brand-text-primary text-center max-w-sm animate-pulse">{message}</p>
        </div>
    );
};