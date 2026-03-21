import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// jsdom doesn't ship Touch / TouchEvent — polyfill them for tests.
// ---------------------------------------------------------------------------
if (typeof Touch === 'undefined') {
  // @ts-expect-error — polyfill for jsdom
  global.Touch = class Touch {
    identifier: number;
    target: EventTarget;
    clientX: number;
    clientY: number;
    constructor(init: { identifier: number; target: EventTarget; clientX?: number; clientY?: number }) {
      this.identifier = init.identifier;
      this.target = init.target;
      this.clientX = init.clientX ?? 0;
      this.clientY = init.clientY ?? 0;
    }
  };
}

if (typeof TouchEvent === 'undefined') {
  // @ts-expect-error — polyfill for jsdom
  global.TouchEvent = class TouchEvent extends Event {
    touches: Touch[];
    constructor(type: string, init: EventInit & { touches?: Touch[] } = {}) {
      super(type, init);
      this.touches = init.touches ?? [];
    }
  };
}
