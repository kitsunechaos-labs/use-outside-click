# use-outside-click

<div align="center">

[![npm version](https://img.shields.io/npm/v/@kitsunechaos/use-outside-click.svg?style=flat-square&color=brightgreen)](https://www.npmjs.com/package/@kitsunechaos/use-outside-click)
[![npm downloads](https://img.shields.io/npm/dm/@kitsunechaos/use-outside-click.svg?style=flat-square)](https://www.npmjs.com/package/@kitsunechaos/use-outside-click)
[![TypeScript](https://img.shields.io/badge/TypeScript-native-blue?style=flat-square)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen?style=flat-square)](#)
[![SSR Safe](https://img.shields.io/badge/SSR-safe-brightgreen?style=flat-square)](#ssr--nextjs)

**The modern React hook for detecting clicks outside an element.**  
Tiny · TypeScript-native · SSR-safe · Zero dependencies · Touch + Mouse

</div>

---

# @kitsunechaos/use-outside-click

Tiny framework-agnostic utility for detecting interactions outside an element.

✨ TypeScript-first
⚡ Lightweight
📦 Zero dependencies
🧠 Works with React, Next.js
## Why `use-outside-click`?

Every React developer who builds a **dropdown, modal, popover, tooltip, context menu, or sidebar** needs this util. Yet the existing solutions are:

| Package | Problem |
|---|---|
| `react-outside-click-handler` | Class-based wrapper, ~6 kb, 4 years old |
| `react-onclickoutside` | HOC pattern, unmaintained |
| Stack Overflow snippets | No TypeScript, no SSR guard, no cleanup |

`use-outside-click` is the **hook-first, TypeScript-native, zero-dependency** solution you've been looking for — shipping in **~300 bytes gzipped**.

---

## Features

- **Drop-in simple** — one hook call, any element
- **TypeScript native** — full types, no `@types/` package needed
- **Multiple refs** — watch several elements at once
- **SSR safe** — works with Next.js, Remix, Astro out of the box
- **Touch + mouse** — mobile-first by default
- **Capture phase** — works even with `stopPropagation`
- **Zero dependencies** — React peer dep only
- **Inline handler stable** — no infinite re-subscription loops
- **`enabled` toggle** — zero overhead when disabled
- **Auto cleanup** — removes listeners on unmount

---

## Installation

```bash
npm install @kitsunechaos/use-outside-click
# or
yarn add @kitsunechaos/use-outside-click
# or
pnpm add @kitsunechaos/use-outside-click
```

**Peer dependencies:** React ≥ 16.8 (hooks era)

---

## Quick Start

```tsx
import { useRef, useState } from 'react';
import { useOutsideClick } from '@kitsunechaos/use-outside-click';

function Dropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useOutsideClick(ref, () => setOpen(false));

  return (
    <div ref={ref}>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && <ul><li>Option 1</li><li>Option 2</li></ul>}
    </div>
  );
}
```

That's it. **One import, one hook call.**

---

## Examples

### Modal

```tsx
import { useRef, useState } from 'react';
import { useOutsideClick } from '@kitsunechaos/use-outside-click';

function Modal({ onClose }: { onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);
  useOutsideClick(modalRef, onClose);

  return (
    <div className="overlay">
      <div ref={modalRef} className="modal">
        <h2>Hello from Modal</h2>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
```

---

### Tooltip

```tsx
function Tooltip() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useOutsideClick(ref, () => setVisible(false));

  return (
    <span ref={ref}>
      <button onClick={() => setVisible(true)}>Info</button>
      {visible && <div className="tooltip">More info here!</div>}
    </span>
  );
}
```

---

### Multiple Refs (e.g. Popover + Trigger Button)

Useful when your trigger button and popover are separate DOM nodes and you want clicks on _either_ to be considered "inside".

```tsx
function Popover() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Pass an array — clicks inside EITHER ref are ignored
  useOutsideClick([triggerRef, popoverRef], () => setOpen(false));

  return (
    <>
      <button ref={triggerRef} onClick={() => setOpen((v) => !v)}>
        Toggle Popover
      </button>
      {open && (
        <div ref={popoverRef} className="popover">
          Popover content here
        </div>
      )}
    </>
  );
}
```

---

### Conditionally Enabled

Disable the listener without unmounting the component (zero event listener overhead):

```tsx
useOutsideClick(ref, handleClose, { enabled: isOpen });
```

---

### Custom Events

By default the hook listens to `mousedown` **and** `touchstart`.  
Override with any `DocumentEventMap` key:

```tsx
// Only fire on mousedown (not touch)
useOutsideClick(ref, handleClose, { events: ['mousedown'] });

// Fire on pointerdown instead
useOutsideClick(ref, handleClose, { events: ['pointerdown'] });
```

---

## API

```ts
useOutsideClick(
  target: Ref | Ref[],
  handler: (event: MouseEvent | TouchEvent) => void,
  options?: UseOutsideClickOptions
): void
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `target` | `RefObject<Element>` \| `RefObject<Element>[]` | ✅ | The element(s) to watch. Pass an array to watch multiple. |
| `handler` | `(event) => void` | ✅ | Callback fired when an outside click/touch is detected. |
| `options` | `UseOutsideClickOptions` | — | Optional configuration (see below). |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `true` | Disable the listener entirely. No event listener is attached when `false`. |
| `events` | `(keyof DocumentEventMap)[]` | `['mousedown', 'touchstart']` | DOM events to subscribe to. |

---

## SSR / Next.js

`use-outside-click` is **SSR-safe out of the box** — it guards every `document` access behind a `typeof document !== 'undefined'` check.  
No special config needed for Next.js, Remix, Astro, or any other SSR framework.

```tsx
// app/components/Dropdown.tsx  ← Next.js App Router
'use client'; // only this directive needed
import { useOutsideClick } from '@kitsunechaos/use-outside-click';
```

---

## How It Works

1. Listens on `document` (not the element) using the **capture phase** — this catches events even when `e.stopPropagation()` is called inside the target.
2. Checks whether `event.target` is contained within any of your refs using [`Node.contains()`](https://developer.mozilla.org/en-US/docs/Web/API/Node/contains).
3. The `handler` is tracked with a ref — so inline functions (common in React) never cause the effect to re-subscribe.
4. All listeners are automatically removed on unmount.

---

## Bundle Size

| Format | Size |
|---|---|
| Minified | ~500 B |
| **Gzipped** | **~300 B** |
| Brotli | ~270 B |

Zero runtime dependencies. React is a peer dep.

---

## TypeScript

Full TypeScript support is built-in. No separate `@types/` package required.

```ts
import type { UseOutsideClickOptions, OutsideClickTarget } from '@kitsunechaos/use-outside-click';
```

---

## Browser Support

All modern browsers + IE 11 (with polyfills for `TouchEvent` if needed).  
Uses `addEventListener` with `{ capture, passive }` options.

---

## Contributing

Contributions are welcome! Please open an [issue](https://github.com/use-outside-click/use-outside-click/issues) or [pull request](https://github.com/use-outside-click/use-outside-click/pulls).

```bash
# Clone and install
git clone https://github.com/use-outside-click/use-outside-click.git
cd use-outside-click
npm install

# Run tests
npm test

# Build
npm run build
```

---

## License

[MIT](LICENSE) © use-outside-click contributors

---

<div align="center">

**If this saved you time, please star the repository and share it — it helps others find it!**

</div>
