import { DANGEROUS_KEYS, deepSanitize, isDangerousKey } from '../security.util'

describe('security.util', () => {
  describe('isDangerousKey', () => {
    it('should identify __proto__ as dangerous', () => {
      expect(isDangerousKey('__proto__')).toBe(true)
    })

    it('should identify constructor as dangerous', () => {
      expect(isDangerousKey('constructor')).toBe(true)
    })

    it('should identify prototype as dangerous', () => {
      expect(isDangerousKey('prototype')).toBe(true)
    })

    it('should identify safe keys as not dangerous', () => {
      expect(isDangerousKey('name')).toBe(false)
      expect(isDangerousKey('user')).toBe(false)
      expect(isDangerousKey('data')).toBe(false)
    })
  })

  describe('deepSanitize', () => {
    it('should return primitives unchanged', () => {
      expect(deepSanitize(42)).toBe(42)
      expect(deepSanitize('hello')).toBe('hello')
      expect(deepSanitize(true)).toBe(true)
      expect(deepSanitize(null)).toBe(null)
      expect(deepSanitize(undefined)).toBe(undefined)
    })

    it('should remove __proto__ from objects', () => {
      const malicious = {
        user: 'john',
        __proto__: { isAdmin: true },
      }
      const result = deepSanitize(malicious)
      expect(result).toEqual({ user: 'john' })
      expect(result.__proto__).not.toHaveProperty('isAdmin')
    })

    it('should remove constructor from objects', () => {
      const malicious = {
        user: 'john',
        constructor: { prototype: { polluted: true } },
      }
      const result = deepSanitize(malicious)
      expect(result).toEqual({ user: 'john' })
      expect(result.constructor).not.toEqual({ prototype: { polluted: true } })
    })

    it('should remove prototype from objects', () => {
      const malicious = {
        user: 'john',
        prototype: { isAdmin: true },
      }
      const result = deepSanitize(malicious)
      expect(result).toEqual({ user: 'john' })
    })

    it('should recursively sanitize nested objects (level 2)', () => {
      const malicious = {
        user: 'john',
        profile: {
          name: 'John Doe',
          __proto__: { isAdmin: true },
        },
      }
      const result = deepSanitize(malicious)
      expect(result).toEqual({
        user: 'john',
        profile: { name: 'John Doe' },
      })
    })

    it('should recursively sanitize deeply nested objects (level 3+)', () => {
      const malicious = {
        user: 'john',
        level1: {
          data: 'safe',
          level2: {
            value: 42,
            level3: {
              text: 'hello',
              __proto__: { polluted: true },
            },
            constructor: { bad: 'data' },
          },
        },
      }
      const result = deepSanitize(malicious)
      expect(result).toEqual({
        user: 'john',
        level1: {
          data: 'safe',
          level2: {
            value: 42,
            level3: { text: 'hello' },
          },
        },
      })
    })

    it('should sanitize arrays of objects', () => {
      const malicious = [
        { user: 'john', __proto__: { isAdmin: true } },
        { user: 'jane', constructor: { bad: true } },
      ]
      const result = deepSanitize(malicious)
      expect(result).toEqual([{ user: 'john' }, { user: 'jane' }])
    })

    it('should sanitize nested arrays', () => {
      const malicious = {
        users: [
          {
            name: 'john',
            roles: ['admin', 'user'],
            __proto__: { isAdmin: true },
          },
        ],
      }
      const result = deepSanitize(malicious)
      expect(result).toEqual({
        users: [
          {
            name: 'john',
            roles: ['admin', 'user'],
          },
        ],
      })
    })

    it('should handle circular references without infinite loop', () => {
      const circular = { name: 'test' }
      circular.self = circular

      const result = deepSanitize(circular)
      expect(result.name).toBe('test')
      expect(result.self).toBeUndefined()
    })

    it('should preserve Date objects', () => {
      const date = new Date('2025-01-01')
      const obj = { created: date }
      const result = deepSanitize(obj)
      expect(result.created).toBe(date)
    })

    it('should handle complex real-world attack payload', () => {
      const malicious = {
        username: 'attacker',
        profile: {
          bio: 'normal bio',
          settings: {
            theme: 'dark',
            __proto__: {
              isAdmin: true,
              hasAccess: true,
            },
          },
        },
        constructor: {
          prototype: {
            polluted: 'yes',
          },
        },
        metadata: {
          tags: ['user', 'guest'],
          extra: {
            deep: {
              nested: {
                __proto__: { dangerous: true },
              },
            },
          },
        },
      }

      const result = deepSanitize(malicious)

      expect(result).toEqual({
        username: 'attacker',
        profile: {
          bio: 'normal bio',
          settings: {
            theme: 'dark',
          },
        },
        metadata: {
          tags: ['user', 'guest'],
          extra: {
            deep: {
              nested: {},
            },
          },
        },
      })
    })

    it('should handle all dangerous keys at multiple levels', () => {
      const malicious = {
        __proto__: { level0: true },
        data: {
          __proto__: { level1: true },
          nested: {
            constructor: { level2: true },
            deep: {
              prototype: { level3: true },
              value: 'safe',
            },
          },
        },
      }

      const result = deepSanitize(malicious)

      expect(result).toEqual({
        data: {
          nested: {
            deep: {
              value: 'safe',
            },
          },
        },
      })
    })
  })

  describe('DANGEROUS_KEYS constant', () => {
    it('should contain all known dangerous keys', () => {
      expect(DANGEROUS_KEYS.has('__proto__')).toBe(true)
      expect(DANGEROUS_KEYS.has('constructor')).toBe(true)
      expect(DANGEROUS_KEYS.has('prototype')).toBe(true)
    })

    it('should have exactly 3 dangerous keys', () => {
      expect(DANGEROUS_KEYS.size).toBe(3)
    })
  })
})
