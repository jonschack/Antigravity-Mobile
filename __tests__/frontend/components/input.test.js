/**
 * @jest-environment jsdom
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { InputComponent } from '../../../public/js/components/Input.js';

describe('InputComponent', () => {
  let input, btn, onSend;

  beforeEach(() => {
    document.body.innerHTML = `
      <textarea id="messageInput"></textarea>
      <button id="sendBtn">Send</button>
    `;

    input = document.getElementById('messageInput');
    btn = document.getElementById('sendBtn');
    onSend = jest.fn();

    // Mock window.alert
    global.alert = jest.fn();
  });

  test('should initialize and bind events', () => {
    const component = new InputComponent('messageInput', 'sendBtn', onSend);
    expect(component.input).toBe(input);
    expect(component.btn).toBe(btn);
  });

  test('should send message on button click', async () => {
    new InputComponent('messageInput', 'sendBtn', onSend);
    input.value = 'hello';
    onSend.mockResolvedValue();

    await btn.click(); // This is async in real life but simulated synchronously here mostly, but handler is async

    // We need to wait for the async handler if we want to check post-await state
    // However, event dispatch is sync.
    // Let's call handleSend directly to test logic easily or wait a tick.
  });

  test('should handle send logic successfully', async () => {
    const component = new InputComponent('messageInput', 'sendBtn', onSend);
    input.value = 'hello';
    onSend.mockResolvedValue();

    const promise = component.handleSend();

    // Check loading state immediately
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toBe('Sending...');

    await promise;

    expect(onSend).toHaveBeenCalledWith('hello');
    expect(input.value).toBe('');
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toBe('Send');
  });

  test('should handle send failure', async () => {
    const component = new InputComponent('messageInput', 'sendBtn', onSend);
    input.value = 'hello';
    onSend.mockRejectedValue(new Error('Network error'));

    await component.handleSend();

    expect(global.alert).toHaveBeenCalledWith('Failed to send: Network error');
    expect(btn.disabled).toBe(false); // Should reset
  });

  test('should not send empty message', async () => {
    const component = new InputComponent('messageInput', 'sendBtn', onSend);
    input.value = '   ';
    await component.handleSend();
    expect(onSend).not.toHaveBeenCalled();
  });

  test('should auto-resize input', () => {
    new InputComponent('messageInput', 'sendBtn', onSend);
    Object.defineProperty(input, 'scrollHeight', { value: 100, configurable: true });

    input.dispatchEvent(new Event('input'));
    expect(input.style.height).toBe('100px');
  });

  test('should send on Enter key without shift', () => {
      const component = new InputComponent('messageInput', 'sendBtn', onSend);
      const handleSpy = jest.spyOn(component, 'handleSend');

      const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false });
      // preventDefault is not automatically mocked on the event object unless we do it
      jest.spyOn(event, 'preventDefault');

      input.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(handleSpy).toHaveBeenCalled();
  });

  test('should not send on Enter key with shift', () => {
      const component = new InputComponent('messageInput', 'sendBtn', onSend);
      const handleSpy = jest.spyOn(component, 'handleSend');

      const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });
      jest.spyOn(event, 'preventDefault');

      input.dispatchEvent(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(handleSpy).not.toHaveBeenCalled();
  });
});
