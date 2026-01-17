/**
 * @jest-environment jsdom
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { ChatComponent } from '../../../public/js/components/Chat.js';

describe('ChatComponent', () => {
  let container, content, fab;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div id="chatContainer" style="height: 500px; overflow: auto;"></div>
      <div id="chatContent"></div>
      <button id="scrollToBottom" class="fab"></button>
    `;

    container = document.getElementById('chatContainer');
    content = document.getElementById('chatContent');
    fab = document.getElementById('scrollToBottom');

    // Mock Element properties usually not available in JSDOM unless defined
    Object.defineProperty(container, 'scrollHeight', { value: 1000, writable: true });
    Object.defineProperty(container, 'scrollTop', { value: 0, writable: true });
    Object.defineProperty(container, 'clientHeight', { value: 500, writable: true });
    container.scrollTo = jest.fn();
  });

  test('should initialize and bind events', () => {
    const chat = new ChatComponent('chatContainer', 'chatContent', 'scrollToBottom');
    expect(chat.container).toBe(container);
    expect(chat.content).toBe(content);
    expect(chat.fab).toBe(fab);
  });

  test('should render content and restore scroll position if user was not at bottom', () => {
    const chat = new ChatComponent('chatContainer', 'chatContent', 'scrollToBottom');

    // Simulate user scrolled up
    container.scrollTop = 200;

    const data = { html: '<p>test</p>', css: 'p { color: red; }' };
    chat.render(data);

    expect(content.innerHTML).toContain(data.html);
    expect(content.innerHTML).toContain(data.css);
    // Should restore position
    expect(container.scrollTop).toBe(200);
  });

  test('should render content and scroll to bottom if user was at bottom', () => {
    const chat = new ChatComponent('chatContainer', 'chatContent', 'scrollToBottom');

    // Simulate user at bottom
    // scrollHeight (1000) - scrollTop (500) - clientHeight (500) < 100
    container.scrollTop = 500;

    const data = { html: '<p>test</p>', css: 'p { color: red; }' };
    chat.render(data);

    expect(container.scrollTo).toHaveBeenCalledWith({
      top: 1000,
      behavior: 'smooth',
    });
  });

  test('should update fab visibility on scroll', () => {
    const chat = new ChatComponent('chatContainer', 'chatContent', 'scrollToBottom');
    const mockCallback = jest.fn();
    chat.onScroll(mockCallback);

    // Simulate scroll event - user scrolls up
    container.scrollTop = 100;
    container.dispatchEvent(new Event('scroll'));

    expect(mockCallback).toHaveBeenCalled();
    // Not near bottom -> show fab
    expect(fab.classList.contains('show')).toBe(true);

    // Simulate scroll to bottom
    container.scrollTop = 500;
    container.dispatchEvent(new Event('scroll'));
    // Near bottom -> hide fab
    expect(fab.classList.contains('show')).toBe(false);
  });

  test('should scroll to bottom on FAB click', () => {
      new ChatComponent('chatContainer', 'chatContent', 'scrollToBottom');
      fab.click();
      expect(container.scrollTo).toHaveBeenCalledWith({
          top: 1000,
          behavior: 'smooth',
      });
  });

  test('should set loading and error states', () => {
    const chat = new ChatComponent('chatContainer', 'chatContent', 'scrollToBottom');

    chat.setLoading();
    expect(content.innerHTML).toContain('Loading chat...');

    chat.setError('retryFunc');
    expect(content.innerHTML).toContain('Failed to load chat');
    expect(content.innerHTML).toContain('onclick="retryFunc()"');
  });
});
