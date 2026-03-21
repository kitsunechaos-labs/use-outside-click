import { useEffect, useRef, RefObject } from 'react';

export type OutsideClickTarget =
  | RefObject<Element | null>
  | RefObject<Element | null>[];

export interface UseOutsideClickOptions {
  /**
   * Whether the listener is active.
   * Set to `false` to temporarily disable — zero overhead when off.
   * @default true
   */
  enabled?: boolean;

  /**
   * DOM events to listen to.
   * Defaults to both mouse and touch events for native mobile support.
   * @default ['mousedown', 'touchstart']
   */
  events?: (keyof DocumentEventMap)[];
}

/**
 * useOutsideClick
 *
 * Fires a callback whenever a user clicks (or touches) outside
 * of the target element(s). Handles multiple refs, SSR, and
 * cleanup automatically.
 *
 * @param target  - A single ref or an array of refs to watch.
 * @param handler - Callback invoked when an outside event occurs.
 * @param options - Optional configuration.
 *
 * @example
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null);
 * useOutsideClick(ref, () => setOpen(false));
 * ```
 */
export function useOutsideClick(
  target: OutsideClickTarget,
  handler: (event: MouseEvent | TouchEvent) => void,
  options: UseOutsideClickOptions = {}
): void {
  const { enabled = true, events = ['mousedown', 'touchstart'] } = options;

  // Keep a stable reference to the handler so the effect doesn't
  // re-subscribe every render even if the handler is defined inline.
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  // Keep a stable reference to the target(s) so we can change the watched
  // refs on the fly without re-subscribing event listeners.
  const targetRef = useRef(target);
  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useEffect(() => {
    // SSR guard — document is not available on the server.
    if (typeof document === 'undefined' || !enabled) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      const eventTarget = event.target as Node | null;
      if (!eventTarget) return;

      const currentTarget = targetRef.current;
      const targets = Array.isArray(currentTarget) ? currentTarget : [currentTarget];

      // If the click lands inside ANY of the watched elements, bail out.
      const isInside = targets.some((ref) => ref.current?.contains(eventTarget));
      if (!isInside) {
        handlerRef.current(event);
      }
    };

    // Attach all requested event types.
    events.forEach((eventName) => {
      document.addEventListener(eventName, listener as EventListener, {
        // `capture: true` ensures we catch events before they bubble,
        // keeping behaviour correct with stopPropagation patterns.
        capture: true,
        passive: true,
      });
    });

    return () => {
      events.forEach((eventName) => {
        document.removeEventListener(eventName, listener as EventListener, {
          capture: true,
        });
      });
    };
    // Intentionally excluding `handler` — we track it via handlerRef.
    // Excluding `target` array identity — we read .current inside the listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, events.join(',')]);
}

export default useOutsideClick;
