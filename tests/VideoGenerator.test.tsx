import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoGenerator } from '../components/VideoGenerator';
import { GENERATION_MODELS } from '../constants';

type Props = ComponentProps<typeof VideoGenerator>;

const setup = (over: Partial<Props> = {}) => {
  const props: Props = {
    isLoading: false,
    loadingMessage: 'Rendering...',
    videoUrl: null,
    error: null,
    onGenerate: vi.fn(),
    onExtend: vi.fn(),
    onStartOver: vi.fn(),
    aspectRatio: '16:9',
    canExtend: true,
    ...over,
  };
  render(<VideoGenerator {...props} />);
  return { props, user: userEvent.setup() };
};

beforeEach(() => {
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
});

describe('<VideoGenerator /> prompt form', () => {
  it('disables Generate until the prompt has non-whitespace text', async () => {
    const { user } = setup();
    const button = screen.getByRole('button', { name: 'Generate Video' });
    expect(button).toBeDisabled();
    await user.type(screen.getByLabelText(/What do you want to create/), '   ');
    expect(button).toBeDisabled();
    await user.type(screen.getByLabelText(/What do you want to create/), 'cat');
    expect(button).toBeEnabled();
  });

  it('submits defaults: 16:9, 720p, no effect, first model', async () => {
    const { props, user } = setup();
    await user.type(screen.getByLabelText(/What do you want to create/), 'a cat');
    await user.click(screen.getByRole('button', { name: 'Generate Video' }));
    expect(props.onGenerate).toHaveBeenCalledWith('a cat', '16:9', '720p', 'none', GENERATION_MODELS[0].value);
  });

  it('submits the selected ratio, resolution, effect and model', async () => {
    const { props, user } = setup();
    await user.type(screen.getByLabelText(/What do you want to create/), 'a dog');
    await user.click(screen.getByRole('button', { name: /9:16/ }));
    await user.click(screen.getByRole('button', { name: '1080p' }));
    await user.selectOptions(screen.getByLabelText('Video Effect'), 'sepia tone');
    await user.click(screen.getByRole('button', { name: GENERATION_MODELS[1].label }));
    await user.click(screen.getByRole('button', { name: 'Generate Video' }));
    expect(props.onGenerate).toHaveBeenCalledWith('a dog', '9:16', '1080p', 'sepia tone', GENERATION_MODELS[1].value);
  });

  it('does not submit while loading', async () => {
    const { props } = setup({ isLoading: true });
    expect(screen.getByRole('button', { name: 'Generating...' })).toBeDisabled();
    expect(screen.getByText('Rendering...')).toBeInTheDocument();
    expect(props.onGenerate).not.toHaveBeenCalled();
  });

  it('shows an error banner', () => {
    setup({ error: 'Quota exceeded' });
    expect(screen.getByRole('alert')).toHaveTextContent('Quota exceeded');
  });
});

describe('<VideoGenerator /> result view', () => {
  const url = 'https://files/v.mp4?alt=media&key=k';

  it('shows the player and hides the prompt form', () => {
    setup({ videoUrl: url });
    expect(screen.getByRole('heading', { name: 'Your Generated Video' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/What do you want to create/)).not.toBeInTheDocument();
  });

  it('only offers extension when canExtend is true', () => {
    setup({ videoUrl: url, canExtend: false });
    expect(screen.queryByLabelText('Extend your video')).not.toBeInTheDocument();
  });

  it('extends with the prompt, then clears the box', async () => {
    const { props, user } = setup({ videoUrl: url });
    const box = screen.getByLabelText('Extend your video');
    await user.type(box, 'now it rains');
    await user.click(screen.getByRole('button', { name: 'Extend Video' }));
    expect(props.onExtend).toHaveBeenCalledWith('now it rains', 7);
    expect(box).toHaveValue('');
  });

  it('clamps the extension duration to 1-10 seconds', async () => {
    const { props, user } = setup({ videoUrl: url });
    const duration = screen.getByLabelText(/Extension Duration/);
    await user.clear(duration);
    await user.type(duration, '99');
    expect(duration).toHaveValue(10);
    fireEvent.change(duration, { target: { value: '0' } });
    expect(duration).toHaveValue(1);
    fireEvent.change(duration, { target: { value: '-4' } });
    expect(duration).toHaveValue(1);
    fireEvent.change(duration, { target: { value: '6' } });
    expect(duration).toHaveValue(6);
    fireEvent.change(duration, { target: { value: '0' } });
    await user.type(screen.getByLabelText('Extend your video'), 'x');
    await user.click(screen.getByRole('button', { name: 'Extend Video' }));
    expect(props.onExtend).toHaveBeenCalledWith('x', 1);
  });

  it('Start Over notifies the parent', async () => {
    const { props, user } = setup({ videoUrl: url });
    await user.click(screen.getByRole('button', { name: 'Start Over' }));
    expect(props.onStartOver).toHaveBeenCalledTimes(1);
  });

  it('copies the link when Web Share is unavailable, then resets the notice', async () => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    const { user } = setup({ videoUrl: url });

    await user.click(screen.getByRole('button', { name: 'Share' }));

    expect(await screen.findByText('Link Copied!')).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe(url);
  });

  it('uses the Web Share API when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    const { user } = setup({ videoUrl: url });
    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url }));
  });

  it('downloads the video as an mp4 blob', async () => {
    const blob = new Blob(['v'], { type: 'video/mp4' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => blob }));
    window.URL.createObjectURL = vi.fn(() => 'blob:v');
    window.URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { user } = setup({ videoUrl: url });

    await user.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith(url);
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toMatch(/^veo-generated-video-.*\.mp4$/);
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:v');
  });

  it('shows an error when the download fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const { user } = setup({ videoUrl: url });
    await user.click(screen.getByRole('button', { name: 'Download' }));
    expect(await screen.findByText(/Download failed/)).toBeInTheDocument();
  });
});
