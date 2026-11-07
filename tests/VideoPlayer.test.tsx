import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VideoPlayer } from '../components/VideoPlayer';

const video = () => document.querySelector('video') as HTMLVideoElement;

describe('<VideoPlayer />', () => {
  it('plays the given source, muted and looping', () => {
    render(<VideoPlayer videoUrl="https://x/v.mp4" aspectRatio="16:9" />);
    expect(video()).toHaveAttribute('src', 'https://x/v.mp4');
    expect(video().loop).toBe(true);
    expect(video().muted).toBe(true);
  });

  it('picks the container aspect class from the ratio', () => {
    const { container, rerender } = render(<VideoPlayer videoUrl="u" aspectRatio="16:9" />);
    expect(container.firstChild).toHaveClass('aspect-video');
    rerender(<VideoPlayer videoUrl="u" aspectRatio="9:16" />);
    expect(container.firstChild).toHaveClass('aspect-[9/16]');
  });

  it('shows elapsed / total time formatted as mm:ss', () => {
    render(<VideoPlayer videoUrl="u" aspectRatio="16:9" />);
    expect(screen.getAllByText('00:00')).toHaveLength(2);

    Object.defineProperty(video(), 'duration', { configurable: true, value: 125 });
    Object.defineProperty(video(), 'currentTime', { configurable: true, writable: true, value: 65 });
    act(() => {
      fireEvent(video(), new Event('loadedmetadata'));
      fireEvent(video(), new Event('timeupdate'));
    });

    expect(screen.getByText('01:05')).toBeInTheDocument();
    expect(screen.getByText('02:05')).toBeInTheDocument();
  });

  it('seeks proportionally to the duration', () => {
    render(<VideoPlayer videoUrl="u" aspectRatio="16:9" />);
    Object.defineProperty(video(), 'duration', { configurable: true, value: 200 });
    Object.defineProperty(video(), 'currentTime', { configurable: true, writable: true, value: 0 });
    act(() => {
      fireEvent(video(), new Event('loadedmetadata'));
    });

    fireEvent.change(screen.getAllByRole('slider')[0], { target: { value: '25' } });

    expect(video().currentTime).toBe(50);
  });

  it('swaps the play/pause icon on media events', () => {
    render(<VideoPlayer videoUrl="u" aspectRatio="16:9" />);
    const iconPath = () => document.querySelector('button svg path')!.getAttribute('d');
    const playing = iconPath();
    act(() => {
      fireEvent(video(), new Event('pause'));
    });
    expect(iconPath()).not.toBe(playing);
    act(() => {
      fireEvent(video(), new Event('play'));
    });
    expect(iconPath()).toBe(playing);
  });
});
