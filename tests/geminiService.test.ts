import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  generateVideos: vi.fn(),
  getVideosOperation: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateVideos: sdk.generateVideos };
    operations = { getVideosOperation: sdk.getVideosOperation };
  },
}));

import { ApiKeyError, extendVideo, generateInitialVideo } from '../services/geminiService';
import { EXTENSION_MODEL, LOADING_MESSAGES } from '../constants';
import type { VeoOperation } from '../types';

const finished = (uri = 'https://files/video.mp4'): VeoOperation => ({
  done: true,
  name: 'operations/abc',
  response: { generatedVideos: [{ video: { uri, aspectRatio: '16:9' } }] },
});

beforeEach(() => {
  sdk.generateVideos.mockReset();
  sdk.getVideosOperation.mockReset();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('generateInitialVideo', () => {
  it('starts generation with the chosen prompt, model, ratio and resolution', async () => {
    sdk.generateVideos.mockResolvedValue({ name: 'operations/abc', done: false });
    sdk.getVideosOperation.mockResolvedValue(finished());

    const promise = generateInitialVideo('a cat', '9:16', '1080p', 'veo-fast', vi.fn(), LOADING_MESSAGES);
    await vi.advanceTimersByTimeAsync(10_000);
    await promise;

    expect(sdk.generateVideos).toHaveBeenCalledWith({
      model: 'veo-fast',
      prompt: 'a cat',
      config: { numberOfVideos: 1, resolution: '1080p', aspectRatio: '9:16' },
    });
  });

  it('polls with the whole operation object (the SDK reads .name from it) until done', async () => {
    const initial = { name: 'operations/abc', done: false };
    sdk.generateVideos.mockResolvedValue(initial);
    const pending = { name: 'operations/abc', done: false };
    sdk.getVideosOperation.mockResolvedValueOnce(pending).mockResolvedValueOnce(finished());

    const promise = generateInitialVideo('p', '16:9', '720p', 'm', vi.fn(), LOADING_MESSAGES);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(sdk.getVideosOperation).toHaveBeenCalledTimes(1);
    expect(sdk.getVideosOperation).toHaveBeenLastCalledWith({ operation: initial });

    await vi.advanceTimersByTimeAsync(10_000);
    const result = await promise;

    expect(sdk.getVideosOperation).toHaveBeenCalledTimes(2);
    expect(sdk.getVideosOperation).toHaveBeenLastCalledWith({ operation: pending });
    expect(result.response?.generatedVideos[0].video.uri).toBe('https://files/video.mp4');
  });

  it('reports rotating progress messages while waiting', async () => {
    sdk.generateVideos.mockResolvedValue({ name: 'operations/abc' });
    sdk.getVideosOperation
      .mockResolvedValueOnce({ done: false, name: 'operations/abc' })
      .mockResolvedValueOnce(finished());
    const onProgress = vi.fn();

    const promise = generateInitialVideo('p', '16:9', '720p', 'm', onProgress, ['one', 'two', 'three']);
    await vi.advanceTimersByTimeAsync(0);
    expect(onProgress).toHaveBeenCalledWith('one');
    await vi.advanceTimersByTimeAsync(5_000);
    expect(onProgress).toHaveBeenLastCalledWith('one');
    await vi.advanceTimersByTimeAsync(5_000);
    expect(onProgress).toHaveBeenLastCalledWith('two');
    await vi.advanceTimersByTimeAsync(10_000);
    await promise;
  });

  it('stops the progress timer once finished', async () => {
    sdk.generateVideos.mockResolvedValue({ name: 'operations/abc' });
    sdk.getVideosOperation.mockResolvedValue(finished());
    const promise = generateInitialVideo('p', '16:9', '720p', 'm', vi.fn(), ['a']);
    await vi.advanceTimersByTimeAsync(10_000);
    await promise;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('turns "entity not found" from generateVideos into an ApiKeyError', async () => {
    sdk.generateVideos.mockRejectedValue(new Error('Requested entity was not found.'));
    await expect(generateInitialVideo('p', '16:9', '720p', 'm', vi.fn(), ['a'])).rejects.toBeInstanceOf(ApiKeyError);
  });

  it('turns "entity not found" while polling into an ApiKeyError', async () => {
    sdk.generateVideos.mockResolvedValue({ name: 'operations/abc' });
    sdk.getVideosOperation.mockRejectedValue(new Error('Requested entity was not found.'));
    const promise = generateInitialVideo('p', '16:9', '720p', 'm', vi.fn(), ['a']);
    const assertion = expect(promise).rejects.toBeInstanceOf(ApiKeyError);
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('re-throws other errors unchanged', async () => {
    sdk.generateVideos.mockRejectedValue(new Error('quota'));
    const promise = generateInitialVideo('p', '16:9', '720p', 'm', vi.fn(), ['a']);
    await expect(promise).rejects.toThrow('quota');
    await expect(promise).rejects.not.toBeInstanceOf(ApiKeyError);
  });
});

describe('extendVideo', () => {
  it('refuses to extend when there is no previous video', async () => {
    await expect(
      extendVideo('more', 5, { done: true, name: 'op' }, vi.fn(), ['a']),
    ).rejects.toThrow('No previous video found');
    expect(sdk.generateVideos).not.toHaveBeenCalled();
  });

  it('extends the previous video with the extension model, 720p and the same aspect ratio', async () => {
    sdk.generateVideos.mockResolvedValue({ name: 'operations/ext' });
    sdk.getVideosOperation.mockResolvedValue(finished('https://files/extended.mp4'));
    const previous = finished();

    const promise = extendVideo('then it flies', 7, previous, vi.fn(), ['a']);
    await vi.advanceTimersByTimeAsync(10_000);
    const result = await promise;

    expect(sdk.generateVideos).toHaveBeenCalledWith({
      model: EXTENSION_MODEL,
      prompt: 'then it flies',
      video: previous.response!.generatedVideos[0].video,
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9', durationSeconds: 7 },
    });
    expect(result.response?.generatedVideos[0].video.uri).toBe('https://files/extended.mp4');
  });

  it('maps "entity not found" to an ApiKeyError', async () => {
    sdk.generateVideos.mockRejectedValue(new Error('Requested entity was not found.'));
    await expect(extendVideo('x', 5, finished(), vi.fn(), ['a'])).rejects.toBeInstanceOf(ApiKeyError);
  });
});

describe('ApiKeyError', () => {
  it('is an Error with a recognisable name', () => {
    const err = new ApiKeyError('bad key');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ApiKeyError');
    expect(err.message).toBe('bad key');
  });
});
