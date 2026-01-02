// Polyfills for testing environment
import { setImmediate, clearImmediate } from 'timers'

// Assign to global for testing-library compatibility
;(global as any).setImmediate = setImmediate
;(global as any).clearImmediate = clearImmediate

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'
