import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordField } from '../src/password-field';
import { FormField } from '../src/form-field';
import { MinecraftAvatar } from '../src/minecraft-avatar';
import { Dialog } from '../src/dialog';

describe('accessible foundation components', () => {
  it('reveals a password while retaining its field name and password-manager hint', async () => {
    const user = userEvent.setup();
    render(
      <FormField label="Пароль" htmlFor="password">
        <PasswordField
          id="password"
          name="password"
          autoComplete="current-password"
          defaultValue="Saved phrase"
        />
      </FormField>,
    );
    const input = screen.getByLabelText('Пароль');
    expect(input).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Показать пароль' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('name', 'password');
    expect(input).toHaveAttribute('autocomplete', 'current-password');
    await user.click(screen.getByRole('button', { name: 'Скрыть пароль' }));
    expect(input).toHaveAttribute('type', 'password');
  });
  it('provides a readable avatar fallback after a failed image request', () => {
    render(<MinecraftAvatar name="Builder" src="/missing-avatar.png" />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('img')).toHaveAccessibleName('Стандартный аватар Builder');
    expect(screen.getByText('B')).toBeVisible();
  });
  it('opens an accessible modal and closes on Escape', async () => {
    const user = userEvent.setup();
    render(
      <Dialog trigger="Открыть" title="Облик игрока" description="Настройки скина">
        <p>Содержимое диалога</p>
      </Dialog>,
    );
    await user.click(screen.getByRole('button', { name: 'Открыть' }));
    const modal = await screen.findByRole('dialog', { name: 'Облик игрока' });
    expect(modal).toHaveAccessibleDescription('Настройки скина');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
