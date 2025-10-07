/**
 * Unit tests for Type Checking Utilities
 * Test file using Jest framework
 */
import {
  isEmpty,
  isNil,
  isObject,
  isPlainObject,
  isPrimitive,
} from '../type-check.util'

describe('Type Checking Utilities', () => {
  describe('isNil', () => {
    test('should return true for null or undefined', () => {
      expect(isNil(null)).toBe(true)
      expect(isNil(undefined)).toBe(true)
    })

    test('should return false for other values', () => {
      expect(isNil(0)).toBe(false)
      expect(isNil('')).toBe(false)
      expect(isNil(false)).toBe(false)
      expect(isNil([])).toBe(false)
      expect(isNil({})).toBe(false)
    })
  })

  describe('isObject', () => {
    test('should return true for objects', () => {
      expect(isObject({})).toBe(true)
      expect(isObject({ a: 1 })).toBe(true)
      expect(isObject(new Object())).toBe(true)
      expect(isObject(Object.create(null))).toBe(true)
    })

    test('should return false for non-objects', () => {
      expect(isObject(null)).toBe(false)
      expect(isObject(undefined)).toBe(false)
      expect(isObject([])).toBe(false)
      expect(isObject('string')).toBe(false)
      expect(isObject(123)).toBe(false)
      expect(isObject(true)).toBe(false)
      expect(isObject(() => {})).toBe(false)
    })
  })

  describe('isPlainObject', () => {
    test('should return true for plain objects', () => {
      expect(isPlainObject({})).toBe(true)
      expect(isPlainObject({ a: 1 })).toBe(true)
      expect(isPlainObject(new Object())).toBe(true)
      expect(isPlainObject(Object.create(null))).toBe(true)
    })

    test('should return false for non-plain objects', () => {
      class CustomClass {}
      expect(isPlainObject(new CustomClass())).toBe(false)
      expect(isPlainObject(new Date())).toBe(false)
      expect(isPlainObject(/regex/)).toBe(false)
      expect(isPlainObject([])).toBe(false)
      expect(isPlainObject(null)).toBe(false)
      expect(isPlainObject('string')).toBe(false)
    })
  })

  describe('isEmpty', () => {
    test('should return true for empty values', () => {
      expect(isEmpty(null)).toBe(true)
      expect(isEmpty(undefined)).toBe(true)
      expect(isEmpty('')).toBe(true)
      expect(isEmpty([])).toBe(true)
      expect(isEmpty({})).toBe(true)
    })

    test('should return false for non-empty values', () => {
      expect(isEmpty('hello')).toBe(false)
      expect(isEmpty([1, 2, 3])).toBe(false)
      expect(isEmpty({ a: 1 })).toBe(false)
      expect(isEmpty(0)).toBe(false)
      expect(isEmpty(false)).toBe(false)
      expect(isEmpty(() => {})).toBe(false)
    })
  })

  describe('isPrimitive', () => {
    test('should return true for primitive values', () => {
      expect(isPrimitive(null)).toBe(true)
      expect(isPrimitive(undefined)).toBe(true)
      expect(isPrimitive(true)).toBe(true)
      expect(isPrimitive(false)).toBe(true)
      expect(isPrimitive(123)).toBe(true)
      expect(isPrimitive('hello')).toBe(true)
      expect(isPrimitive(Symbol('test'))).toBe(true)
      expect(isPrimitive(BigInt(123))).toBe(true)
    })

    test('should return false for non-primitive values', () => {
      expect(isPrimitive({})).toBe(false)
      expect(isPrimitive([])).toBe(false)
      expect(isPrimitive(() => {})).toBe(false)
      expect(isPrimitive(new Date())).toBe(false)
      expect(isPrimitive(/regex/)).toBe(false)
    })
  })

  describe('Edge cases and comprehensive tests', () => {
    test('should handle complex nested structures', () => {
      const complexObj = {
        a: 1,
        b: {
          c: 2,
          d: {
            e: 3,
          },
        },
      }
      expect(isObject(complexObj)).toBe(true)
      expect(isPlainObject(complexObj)).toBe(true)
      expect(isEmpty(complexObj)).toBe(false)
    })

    test('should handle inheritance correctly', () => {
      class Parent {}
      class Child extends Parent {}

      const child = new Child()
      expect(isObject(child)).toBe(true)
      expect(isPlainObject(child)).toBe(false)
    })

    test('should handle special values', () => {
      expect(isNil(void 0)).toBe(true)
      expect(isPrimitive(NaN)).toBe(true)
      expect(isPrimitive(Infinity)).toBe(true)
      expect(isPrimitive(-Infinity)).toBe(true)
    })

    test('should handle Object.create with custom prototype', () => {
      const proto = { x: 1 }
      const obj = Object.create(proto)
      expect(isObject(obj)).toBe(true)
      expect(isPlainObject(obj)).toBe(false) // Has custom prototype
    })
  })
})
