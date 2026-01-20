/**
 * @jest-environment jsdom
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { LatencyIndicator } from '../../../public/js/components/LatencyIndicator.js';

describe('LatencyIndicator', () => {
  let indicator;
  let element;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '<div id="latencyIndicator"></div>';
    element = document.getElementById('latencyIndicator');
    indicator = new LatencyIndicator('latencyIndicator');
  });

  test('should initialize with element reference', () => {
    expect(indicator.element).toBe(element);
    expect(indicator.latency).toBeNull();
  });

  test('should update latency value', () => {
    indicator.update(50);
    expect(indicator.latency).toBe(50);
  });

  test('should show disconnected state when latency is null', () => {
    indicator.update(null);
    
    expect(element.className).toContain('disconnected');
    expect(element.querySelector('.latency-text').textContent).toBe('--');
    expect(element.title).toBe('Disconnected');
  });

  test('should show good quality for latency under 100ms', () => {
    indicator.update(50);
    
    expect(element.className).toContain('good');
    expect(element.querySelector('.latency-text').textContent).toBe('50ms');
    expect(element.title).toContain('good');
  });

  test('should show fair quality for latency between 100ms and 300ms', () => {
    indicator.update(150);
    
    expect(element.className).toContain('fair');
    expect(element.querySelector('.latency-text').textContent).toBe('150ms');
    expect(element.title).toContain('fair');
  });

  test('should show poor quality for latency over 300ms', () => {
    indicator.update(500);
    
    expect(element.className).toContain('poor');
    expect(element.querySelector('.latency-text').textContent).toBe('500ms');
    expect(element.title).toContain('poor');
  });

  test('should handle edge cases for quality thresholds', () => {
    // Exactly at 100ms - should be fair
    indicator.update(100);
    expect(element.className).toContain('fair');

    // Exactly at 300ms - should be poor
    indicator.update(300);
    expect(element.className).toContain('poor');

    // Just under 100ms - should be good
    indicator.update(99);
    expect(element.className).toContain('good');
  });

  test('should handle missing element gracefully', () => {
    const indicatorWithNoElement = new LatencyIndicator('nonexistent');
    
    // Should not throw when updating with no element
    expect(() => {
      indicatorWithNoElement.update(100);
    }).not.toThrow();
  });
});
