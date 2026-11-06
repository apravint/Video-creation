import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const svc = vi.hoisted(() => ({ generateInitialVideo: vi.fn(), extendVideo: vi.fn() }));
vi.mock('../services/geminiService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/geminiService')>()),
  ...svc,
}));

import App from '../App';
import { ApiKeyError } from '../services/geminiService';

const done = (uri = 'https://files/v.mp4?alt=media') => ({
  done: true,
  name: 'op',
  response: { generatedVideos: [{ video: { uri, aspectRatio: '16:9' } }] },
});

beforeEach(() => {
  svc.generateInitialVideo.mockReset();
  svc.extendVideo.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
});
afterEach(() => {
  delete (window as { aistudio?: unknown }).aistudio;
});

const generate = async (user: ReturnType<typeof userEvent.setup>, prompt = 'a cat') => {
  await user.type(await screen.findByLabelText(/What do you want to create/), prompt);
  await user.click(screen.getByRole('button', { name: 'Generate Video' }));
};

describe('<App /> API key gate', () => {
  it('asks for a key when AI Studio reports none selected, and continues after selecting', async () => {
    const openSelectKey = vi.fn().mockResolvedValue(undefined);
    window.aistudio = { hasSelectedApiKey: vi.fn().mockResolvedValue(false), openSelectKey };
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /Select API Key/ }));

    expect(openSelectKey).toHaveBeenCalled();
    expect(await screen.findByLabelText(/What do you want to create/)).toBeInTheDocument();
  });

  it('goes straight to the generator outside AI Studio (local dev)', async () => {
    render(<App />);
    expect(await screen.findByLabelText(/What do you want to create/)).toBeInTheDocument();
  });
});

describe('<App /> generation', () => {
  it('appends the chosen effect to the prompt and shows the video with the API key appended', async () => {
    svc.generateInitialVideo.mockResolvedValue(done());
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(await screen.findByLabelText('Video Effect'), 'cinematic');

    await generate(user);

    expect(await screen.findByRole('heading', { name: 'Your Generated Video' })).toBeInTheDocument();
    expect(svc.generateInitialVideo.mock.calls[0][0]).toBe('a cat, cinematic');
    expect(document.querySelector('video')!.getAttribute('src')).toBe('https://files/v.mp4?alt=media&key=test-key');
  });

  it('leaves the prompt untouched when no effect is selected', async () => {
    svc.generateInitialVideo.mockResolvedValue(done());
    const user = userEvent.setup();
    render(<App />);
    await generate(user);
    await screen.findByRole('heading', { name: 'Your Generated Video' });
    expect(svc.generateInitialVideo.mock.calls[0][0]).toBe('a cat');
  });

  it('shows an error when the response has no download link', async () => {
    svc.generateInitialVideo.mockResolvedValue({ done: true, name: 'op', response: { generatedVideos: [] } });
    const user = userEvent.setup();
    render(<App />);
    await generate(user);
    expect(await screen.findByText(/No download link found/)).toBeInTheDocument();
  });

  it('shows generic failures from the service', async () => {
    svc.generateInitialVideo.mockRejectedValue(new Error('Quota exceeded'));
    const user = userEvent.setup();
    render(<App />);
    await generate(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Quota exceeded');
  });

  it('sends the user back to the key selector on an ApiKeyError', async () => {
    svc.generateInitialVideo.mockRejectedValue(new ApiKeyError('bad key'));
    window.aistudio = { hasSelectedApiKey: vi.fn().mockResolvedValue(true), openSelectKey: vi.fn() };
    const user = userEvent.setup();
    render(<App />);
    await generate(user);
    expect(await screen.findByRole('button', { name: /Select API Key/ })).toBeInTheDocument();
  });

  it('extends the last video and replaces the player source', async () => {
    const first = done('https://files/one.mp4?alt=media');
    svc.generateInitialVideo.mockResolvedValue(first);
    svc.extendVideo.mockResolvedValue(done('https://files/two.mp4?alt=media'));
    const user = userEvent.setup();
    render(<App />);
    await generate(user);
    await user.type(await screen.findByLabelText('Extend your video'), 'and then');
    await user.click(screen.getByRole('button', { name: 'Extend Video' }));

    await screen.findByText('Your Generated Video');
    await vi.waitFor(() =>
      expect(document.querySelector('video')!.getAttribute('src')).toBe('https://files/two.mp4?alt=media&key=test-key'),
    );
    expect(svc.extendVideo.mock.calls[0].slice(0, 3)).toEqual(['and then', 7, first]);
  });

  it('hides the extend form for 1080p videos', async () => {
    svc.generateInitialVideo.mockResolvedValue(done());
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: '1080p' }));
    await generate(user);
    await screen.findByRole('heading', { name: 'Your Generated Video' });
    expect(screen.queryByLabelText('Extend your video')).not.toBeInTheDocument();
  });

  it('Start Over returns to the prompt form', async () => {
    svc.generateInitialVideo.mockResolvedValue(done());
    const user = userEvent.setup();
    render(<App />);
    await generate(user);
    await user.click(await screen.findByRole('button', { name: 'Start Over' }));
    expect(await screen.findByLabelText(/What do you want to create/)).toHaveValue('');
  });
});
