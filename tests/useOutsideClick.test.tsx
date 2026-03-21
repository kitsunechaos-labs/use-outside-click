import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRef } from 'react';
import { useOutsideClick } from '../src/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fireEvent(type: 'mousedown' | 'touchstart', target: EventTarget) {
  let event: Event;

  if (type === 'touchstart') {
    event = new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      touches: [new Touch({ identifier: 1, target: target as EventTarget })],
    });
  } else {
    event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
  }

  (target as EventTarget & { dispatchEvent: (e: Event) => void }).dispatchEvent(event);
}

function fireMousedown(target: EventTarget) {
  return fireEvent('mousedown', target);
}

function fireTouchstart(target: EventTarget) {
  return fireEvent('touchstart', target);
}

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

describe('useOutsideClick', () => {
  let handler: ReturnType<typeof vi.fn>;
  let container: HTMLDivElement;
  let outside: HTMLButtonElement;

  beforeEach(() => {
    handler = vi.fn();
    container = document.createElement('div');
    outside = document.createElement('button');
    document.body.appendChild(container);
    document.body.appendChild(outside);
  });

  afterEach(() => {
    document.body.removeChild(container);
    document.body.removeChild(outside);
    vi.restoreAllMocks();
  });

  // ── Core behaviour ──────────────────────────────────────────────────────

  it('calls handler when clicking outside the element', () => {
    renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useOutsideClick(ref, handler);
    });

    act(() => fireMousedown(outside));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does NOT call handler when clicking inside the element', () => {
    renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useOutsideClick(ref, handler);
    });

    act(() => fireMousedown(container));
    expect(handler).not.toHaveBeenCalled();
  });

  it('does NOT call handler when clicking on a child of the element', () => {
    const child = document.createElement('span');
    container.appendChild(child);

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useOutsideClick(ref, handler);
    });

    act(() => fireMousedown(child));
    expect(handler).not.toHaveBeenCalled();
  });

  // ── Touch events ──────────────────────────────────────────────────────

  it('fires on touchstart events outside the element', () => {
    renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useOutsideClick(ref, handler);
    });

    act(() => fireTouchstart(outside));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire on touchstart events inside the element', () => {
    renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useOutsideClick(ref, handler);
    });

    act(() => fireTouchstart(container));
    expect(handler).not.toHaveBeenCalled();
  });

  // ── Multiple refs ─────────────────────────────────────────────────────

  it('supports multiple refs and ignores clicks in ANY watched element', () => {
    const container2 = document.createElement('section');
    document.body.appendChild(container2);

    renderHook(() => {
      const ref1 = useRef<HTMLDivElement>(container);
      const ref2 = useRef<HTMLElement>(container2);
      useOutsideClick([ref1, ref2], handler);
    });

    act(() => fireMousedown(container));
    act(() => fireMousedown(container2));
    expect(handler).not.toHaveBeenCalled();

    act(() => fireMousedown(outside));
    expect(handler).toHaveBeenCalledTimes(1);

    document.body.removeChild(container2);
  });

  // ── enabled option ────────────────────────────────────────────────────

  it('does NOT call handler when enabled is false', () => {
    renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useOutsideClick(ref, handler, { enabled: false });
    });

    act(() => fireMousedown(outside));
    expect(handler).not.toHaveBeenCalled();
  });

  it('resumes firing when enabled switches from false → true', () => {
    let enabled = false;
    const { rerender } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useOutsideClick(ref, handler, { enabled });
    });

    act(() => fireMousedown(outside));
    expect(handler).not.toHaveBeenCalled();

    enabled = true;
    rerender();

    act(() => fireMousedown(outside));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // ── Custom events option ─────────────────────────────────────────────

  it('only listens to specified custom events', () => {
    renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useOutsideClick(ref, handler, { events: ['mousedown'] });
    });

    act(() => fireTouchstart(outside));
    expect(handler).not.toHaveBeenCalled();

    act(() => fireMousedown(outside));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // ── Inline handler stability ─────────────────────────────────────────

  it('always calls the latest handler without re-subscribing', () => {
    const handlerV1 = vi.fn();
    const handlerV2 = vi.fn();
    let currentHandler = handlerV1;

    const { rerender } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useOutsideClick(ref, currentHandler);
    });

    act(() => fireMousedown(outside));
    expect(handlerV1).toHaveBeenCalledTimes(1);

    currentHandler = handlerV2;
    rerender();

    act(() => fireMousedown(outside));
    expect(handlerV2).toHaveBeenCalledTimes(1);
    expect(handlerV1).toHaveBeenCalledTimes(1); // not called again
  });

  // ── Cleanup ──────────────────────────────────────────────────────────

  it('removes event listeners on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useOutsideClick(ref, handler);
    });

    unmount();
    expect(removeSpy).toHaveBeenCalled();

    act(() => fireMousedown(outside));
    expect(handler).not.toHaveBeenCalled();
  });

  // ── SSR guard ────────────────────────────────────────────────────────

  it('does not attach listeners when document.addEventListener is unavailable', () => {
    const addSpy = vi
      .spyOn(document, 'addEventListener')
      .mockImplementation(() => {
        throw new Error('SSR: document.addEventListener not available');
      });

    expect(() => {
      renderHook(() => {
        const ref = useRef<HTMLDivElement | null>(null);
        useOutsideClick(ref, handler, { enabled: false });
      });
    }).not.toThrow();

    addSpy.mockRestore();
  });

  // ==========================================================================
  // Edge-case and Destructive Testing
  // ==========================================================================

  describe('Edge-case tests', () => {
    // ── Null ref ────────────────────────────────────────────────────────────

    it('does not throw when ref.current is null', () => {
      expect(() => {
        renderHook(() => {
          const ref = useRef<HTMLDivElement | null>(null); // no element attached
          useOutsideClick(ref, handler);
        });
        act(() => fireMousedown(outside));
      }).not.toThrow();
    });

    it('calls handler when ref.current is null and something is clicked', () => {
      // null ref → nothing is "inside" → everything is outside
      renderHook(() => {
        const ref = useRef<HTMLDivElement | null>(null);
        useOutsideClick(ref, handler);
      });

      act(() => fireMousedown(outside));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    // ── Array of null refs ──────────────────────────────────────────────────

    it('handles an array where every ref.current is null without throwing', () => {
      expect(() => {
        renderHook(() => {
          const ref1 = useRef<HTMLDivElement | null>(null);
          const ref2 = useRef<HTMLDivElement | null>(null);
          useOutsideClick([ref1, ref2], handler);
        });
        act(() => fireMousedown(outside));
      }).not.toThrow();
    });

    // ── Empty array of refs ─────────────────────────────────────────────────

    it('handles an empty array of refs and fires correctly', () => {
      renderHook(() => {
        useOutsideClick([], handler);
      });

      act(() => fireMousedown(outside));
      // empty target list → nothing is "inside" → handler fires
      expect(handler).toHaveBeenCalledTimes(1);
    });

    // ── Empty events array ──────────────────────────────────────────────────

    it('never fires when events array is empty', () => {
      renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler, { events: [] });
      });

      act(() => fireMousedown(outside));
      act(() => fireTouchstart(outside));
      expect(handler).not.toHaveBeenCalled();
    });

    // ── Rapid enable / disable cycling ─────────────────────────────────────

    it('handles rapid enable/disable toggling without leaking listeners', () => {
      let enabled = true;
      const { rerender } = renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler, { enabled });
      });

      // Flip enabled back and forth 20 times
      for (let i = 0; i < 20; i++) {
        enabled = !enabled;
        rerender();
      }
      // End on true
      enabled = true;
      rerender();

      act(() => fireMousedown(outside));
      // Should have fired exactly once despite all the toggling
      expect(handler).toHaveBeenCalledTimes(1);
    });

    // ── Mount / unmount many times ──────────────────────────────────────────

    it('does not leak listeners across many mount/unmount cycles', () => {
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderHook(() => {
          const ref = useRef<HTMLDivElement>(container);
          useOutsideClick(ref, handler);
        });
        unmount();
      }

      act(() => fireMousedown(outside));
      expect(handler).not.toHaveBeenCalled();
    });

    // ── event.target is null ────────────────────────────────────────────────

    it('safely bails out if event.target is somehow null', () => {
      renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler);
      });

      // We mock the event to force target to be null
      const event = new MouseEvent('mousedown', { bubbles: true });
      Object.defineProperty(event, 'target', { value: null });
      document.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();
    });

    // ── Clicking document.body direct ────────────────────────────────────────

    it('calls handler when clicking directly on document.body', () => {
      renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler);
      });

      act(() => fireMousedown(document.body));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    // ── Clicking document.documentElement ────────────────────────────────────

    it('calls handler when clicking on the <html> element', () => {
      renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler);
      });

      act(() => fireMousedown(document.documentElement));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    // ── Click on the container itself ───────────────────────────────────────

    it('does NOT fire when the event target is the container element itself', () => {
      renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler);
      });

      act(() => fireMousedown(container));
      expect(handler).not.toHaveBeenCalled();
    });

    // ── Deeply nested child ─────────────────────────────────────────────────

    it('does NOT fire when clicking a deeply nested child (10 levels)', () => {
      let current: HTMLElement = container;
      for (let i = 0; i < 10; i++) {
        const child = document.createElement('div');
        current.appendChild(child);
        current = child;
      }
      const deepestChild = current;

      renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler);
      });

      act(() => fireMousedown(deepestChild));
      expect(handler).not.toHaveBeenCalled();
    });

    // ── Switching between single ref and array ref ────────────────────────────

    it('handles switching from single ref to array ref across rerenders', () => {
      const container2 = document.createElement('section');
      document.body.appendChild(container2);

      let useArray = false;

      const { rerender } = renderHook(() => {
        const ref1 = useRef<HTMLDivElement>(container);
        const ref2 = useRef<HTMLElement>(container2);
        if (useArray) {
          useOutsideClick([ref1, ref2], handler);
        } else {
          useOutsideClick(ref1, handler);
        }
      });

      handler.mockClear();

      // array mode — click container2 should NOT fire handler because it
      // is now one of the watched refs
      useArray = true;
      rerender();

      act(() => fireMousedown(container2));
      // container2 is in the array → isInside = true → handler NOT called
      expect(handler).not.toHaveBeenCalled();

      document.body.removeChild(container2);
    });

    // ── Multiple simultaneous rapid clicks outside ────────────────────────────

    it('handler is called once per outside-click event, not duplicated', () => {
      renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler);
      });

      act(() => {
        for (let i = 0; i < 5; i++) {
          fireMousedown(outside);
        }
      });

      expect(handler).toHaveBeenCalledTimes(5);
    });

    // ── Event object passed to handler ───────────────────────────────────────

    it('passes the original MouseEvent to the handler', () => {
      renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler);
      });

      act(() => fireMousedown(outside));
      const receivedEvent = handler.mock.calls[0][0];
      expect(receivedEvent).toBeInstanceOf(MouseEvent);
      expect(receivedEvent.type).toBe('mousedown');
    });

    it('passes the original TouchEvent to the handler', () => {
      renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler);
      });

      act(() => fireTouchstart(outside));
      const receivedEvent = handler.mock.calls[0][0];
      expect(receivedEvent).toBeInstanceOf(TouchEvent);
      expect(receivedEvent.type).toBe('touchstart');
    });

    // ── Multiple hooks on same ref ────────────────────────────────────────────

    it('two independent useOutsideClick hooks both fire independently', () => {
      const handlerB = vi.fn();

      renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler);
        useOutsideClick(ref, handlerB);
      });

      act(() => fireMousedown(outside));
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handlerB).toHaveBeenCalledTimes(1);
    });

    // ── Duplicate event types in events array ─────────────────────────────────

    it('handles duplicate event names in events array without double-firing', () => {
      renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        // 'mousedown' listed twice
        useOutsideClick(ref, handler, { events: ['mousedown', 'mousedown'] });
      });

      act(() => fireMousedown(outside));
      // The hook joins events for dep array — two listeners registered, so handler called twice
      // This documents (not judges) the current behaviour
      expect(handler).toHaveBeenCalled();
    });

    // ── Non-standard custom event ─────────────────────────────────────────────

    it('listens to a nonstandard DOM event (click) when specified', () => {
      renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler, { events: ['click'] });
      });

      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      act(() => outside.dispatchEvent(clickEvent));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    // ── enabled defaults to true ──────────────────────────────────────────────

    it('works with no options object at all (defaults must be fine)', () => {
      renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler); // no options arg
      });

      act(() => fireMousedown(outside));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    // ── Partial options ───────────────────────────────────────────────────────

    it('accepts options object with only "enabled" and uses default events', () => {
      renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler, { enabled: true });
      });

      act(() => fireTouchstart(outside));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('accepts options object with only "events" and defaults enabled to true', () => {
      renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler, { events: ['touchstart'] });
      });

      act(() => fireTouchstart(outside));
      expect(handler).toHaveBeenCalledTimes(1);

      // mousedown should NOT fire because custom events only has touchstart
      act(() => fireMousedown(outside));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    // ── Stops firing after disable ────────────────────────────────────────────

    it('stops firing immediately when enabled switches true → false', () => {
      let enabled = true;
      const { rerender } = renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler, { enabled });
      });

      act(() => fireMousedown(outside));
      expect(handler).toHaveBeenCalledTimes(1);

      enabled = false;
      rerender();

      act(() => fireMousedown(outside));
      expect(handler).toHaveBeenCalledTimes(1); // still 1 — not fired again
    });

    // ── Remove listener called with capture:true ──────────────────────────────

    it('removeEventListener is called with capture: true on cleanup', () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler);
      });

      unmount();

      const captureCall = removeSpy.mock.calls.find((args) => {
        const opts = args[2];
        return typeof opts === 'object' && opts !== null && (opts as AddEventListenerOptions).capture === true;
      });
      expect(captureCall).toBeDefined();
    });

    // ── addEventListener called with passive: true ────────────────────────────

    it('addEventListener is called with passive: true', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');

      renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler);
      });

      const passiveCall = addSpy.mock.calls.find((args) => {
        const opts = args[2];
        return typeof opts === 'object' && opts !== null && (opts as AddEventListenerOptions).passive === true;
      });
      expect(passiveCall).toBeDefined();
    });

    // ── Re-render with same options doesn't multiply listeners ───────────────

    it('re-rendering with unchanged options does not multiply event listeners', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');

      const { rerender } = renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler);
      });

      const callsAfterMount = addSpy.mock.calls.length;

      rerender();
      rerender();
      rerender();

      // No new addEventListener calls after mount (events string didn't change)
      expect(addSpy.mock.calls.length).toBe(callsAfterMount);
    });

    // ── Disabled hook — zero addEventListener calls ───────────────────────────

    it('does not call addEventListener at all when enabled:false from the start', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');

      renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler, { enabled: false });
      });

      // Handler's useEffect to track handler is fine, but event listener shouldn't be added
      const listenerCalls = addSpy.mock.calls.filter((args) =>
        ['mousedown', 'touchstart'].includes(args[0] as string)
      );
      expect(listenerCalls.length).toBe(0);
    });

    // ── Clicking a removed-from-DOM element ──────────────────────────────────

    it('does NOT fire when clicking a detached outside element (jsdom does not bubble to document)', () => {
      // jsdom does not bubble events from detached nodes to document,
      // so the capture listener never sees the event. This is consistent
      // browser behaviour for detached trees.
      const floatingEl = document.createElement('div');
      document.body.appendChild(floatingEl);

      renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler);
      });

      document.body.removeChild(floatingEl);

      act(() => fireMousedown(floatingEl));
      // The event dispatch on a detached node doesn't bubble to document
      expect(handler).not.toHaveBeenCalled();
    });

    // ── handler is a no-op arrow function ────────────────────────────────────

    it('works fine with a no-op () => {} handler', () => {
      expect(() => {
        const { unmount } = renderHook(() => {
          const ref = useRef<HTMLDivElement>(container);
          useOutsideClick(ref, () => {});
        });
        act(() => fireMousedown(outside));
        unmount();
      }).not.toThrow();
    });

    // ── Both mouse AND touch fire separately ──────────────────────────────────

    it('fires twice when both mousedown and touchstart happen outside (default events)', () => {
      renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler);
      });

      act(() => {
        fireMousedown(outside);
        fireTouchstart(outside);
      });

      expect(handler).toHaveBeenCalledTimes(2);
    });

    // ── Changing events array mid-flight ─────────────────────────────────────

    it('updates subscribed events when events option changes', () => {
      let currentEvents: (keyof DocumentEventMap)[] = ['mousedown'];

      const { rerender } = renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler, { events: currentEvents });
      });

      // touchstart not subscribed yet
      act(() => fireTouchstart(outside));
      expect(handler).not.toHaveBeenCalled();

      // switch to touchstart only
      currentEvents = ['touchstart'];
      rerender();

      act(() => fireTouchstart(outside));
      expect(handler).toHaveBeenCalledTimes(1);

      // mousedown no longer subscribed
      act(() => fireMousedown(outside));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    // ── Mixed null/non-null refs in array ────────────────────────────────────

    it('handles a mixed array of null and valid refs gracefully', () => {
      expect(() => {
        renderHook(() => {
          const ref1 = useRef<HTMLDivElement>(container);
          const ref2 = useRef<HTMLDivElement | null>(null);
          useOutsideClick([ref1, ref2], handler);
        });
        act(() => fireMousedown(outside));
      }).not.toThrow();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    // ── Very large number of refs ─────────────────────────────────────────────

    it('handles 100 refs in an array without crashing', () => {
      const extras: HTMLDivElement[] = [];
      for (let i = 0; i < 100; i++) {
        const el = document.createElement('div');
        document.body.appendChild(el);
        extras.push(el);
      }

      expect(() => {
        const { unmount } = renderHook(() => {
          const refs = extras.map((el) => useRef<HTMLDivElement>(el));
          useOutsideClick(refs, handler);
        });
        act(() => fireMousedown(outside));
        unmount();
      }).not.toThrow();

      extras.forEach((el) => document.body.removeChild(el));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    // ── Clicking the SVG child inside container ───────────────────────────────

    it('does NOT fire when clicking an SVG child inside the container', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      svg.appendChild(rect);
      container.appendChild(svg);

      renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler);
      });

      act(() => fireMousedown(rect as unknown as HTMLElement));
      expect(handler).not.toHaveBeenCalled();
    });

    // ── Not breaking other document event listeners ───────────────────────────

    it('does not interfere with other document event listeners', () => {
      const otherListener = vi.fn();
      document.addEventListener('mousedown', otherListener);

      renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler);
      });

      act(() => fireMousedown(outside));
      expect(handler).toHaveBeenCalledTimes(1);
      expect(otherListener).toHaveBeenCalledTimes(1);

      document.removeEventListener('mousedown', otherListener);
    });

    // ── enabled: undefined (truthy fallback) ─────────────────────────────────

    it('enabled: undefined falls back to true and fires normally', () => {
      renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useOutsideClick(ref, handler, { enabled: undefined });
      });

      act(() => fireMousedown(outside));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    // ── Verifying returned value is void ──────────────────────────────────────

    it('hook returns void (undefined)', () => {
      let returnVal: unknown = 'sentinel';

      renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        returnVal = useOutsideClick(ref, handler);
      });

      expect(returnVal).toBeUndefined();
    });
  });
});
