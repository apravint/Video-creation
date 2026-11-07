// Injected by the Google AI Studio host page; absent when running locally.
interface Window {
    aistudio?: {
        hasSelectedApiKey(): Promise<boolean>;
        openSelectKey(): Promise<void>;
    };
}
