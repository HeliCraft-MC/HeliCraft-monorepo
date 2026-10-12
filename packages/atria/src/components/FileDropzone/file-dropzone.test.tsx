import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileDropzone } from './file-dropzone';

describe('file dropzone', () => {
  afterEach(cleanup);
  it('opens the chooser from a keyboard-accessible button and supports repeated file selection and drops', async () => {
    const choose = vi.fn<(file: File | null) => void>();
    render(
      <FileDropzone
        id="upload"
        label="Photograph"
        hint="Drop or browse"
        accept="image/png"
        file={null}
        onChoose={choose}
      />,
    );
    const user = userEvent.setup();
    const input = screen.getByLabelText<HTMLInputElement>('Photograph');
    const click = vi.spyOn(input, 'click');
    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(click).toHaveBeenCalledOnce();
    const file = new File(['image'], 'photo.png', { type: 'image/png' });
    await user.upload(input, file);
    await user.upload(input, file);
    expect(choose).toHaveBeenCalledTimes(2);
    const zone = input.parentElement;
    if (!zone) {
      throw new Error('Dropzone missing');
    }
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    expect(choose).toHaveBeenLastCalledWith(file);
  });
  it('does not accept drops while disabled', () => {
    const choose = vi.fn<(file: File | null) => void>();
    render(
      <FileDropzone
        id="upload"
        label="Photograph"
        hint="Drop or browse"
        accept="image/png"
        file={null}
        onChoose={choose}
        disabled
      />,
    );
    const zone = screen.getByLabelText('Photograph').parentElement;
    if (!zone) {
      throw new Error('Dropzone missing');
    }
    fireEvent.drop(zone, { dataTransfer: { files: [new File([''], 'photo.png')] } });
    expect(choose).not.toHaveBeenCalled();
  });
});
