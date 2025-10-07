import { Joi } from '@/core/helpers/validator.helper'

import { requestValidator } from '../request-validator.middleware'

describe('request-validator.middleware - Security Tests', () => {
  describe('Prototype Pollution Protection', () => {
    it('should block __proto__ pollution at root level', () => {
      const schema = {
        body: Joi.object({
          username: Joi.string().required(),
        }).unknown(true),
      }

      const middleware = requestValidator(schema)
      const req = {
        body: {
          username: 'john',
          __proto__: { isAdmin: true },
        },
      }
      const res = {}
      const next = jest.fn()

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.body.username).toBe('john')
      expect(req.body.__proto__).not.toHaveProperty('isAdmin')
      expect({}.isAdmin).toBeUndefined() // Global prototype not polluted
    })

    it('should block nested __proto__ pollution (level 2)', () => {
      const schema = {
        body: Joi.object({
          user: Joi.object({
            name: Joi.string(),
          }),
        }).unknown(true),
      }

      const middleware = requestValidator(schema)
      const req = {
        body: {
          user: {
            name: 'john',
            __proto__: { isAdmin: true },
          },
        },
      }
      const res = {}
      const next = jest.fn()

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.body.user.name).toBe('john')
      expect(req.body.user.__proto__).not.toHaveProperty('isAdmin')
    })

    it('should block deeply nested __proto__ pollution (level 3+)', () => {
      const schema = {
        body: Joi.object({
          data: Joi.object({
            profile: Joi.object({
              settings: Joi.object(),
            }),
          }),
        }).unknown(true),
      }

      const middleware = requestValidator(schema)
      const req = {
        body: {
          data: {
            profile: {
              settings: {
                theme: 'dark',
                __proto__: { polluted: true },
              },
            },
          },
        },
      }
      const res = {}
      const next = jest.fn()

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.body.data.profile.settings.theme).toBe('dark')
      expect(req.body.data.profile.settings.__proto__).not.toHaveProperty(
        'polluted'
      )
      expect({}.polluted).toBeUndefined()
    })

    it('should block constructor pollution at any level', () => {
      const schema = {
        body: Joi.object({
          user: Joi.object({
            name: Joi.string(),
            profile: Joi.object({
              bio: Joi.string(),
            }).unknown(true),
          }).unknown(true),
        }).unknown(true),
      }

      const middleware = requestValidator(schema)
      const req = {
        body: {
          user: {
            name: 'john',
            profile: {
              bio: 'Developer',
              constructor: { prototype: { isAdmin: true } },
            },
          },
        },
      }
      const res = {}
      const next = jest.fn()

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.body.user.name).toBe('john')
      expect(req.body.user.profile.bio).toBe('Developer')
      // Constructor is a built-in property, so we check it wasn't assigned malicious value
      expect(Object.hasOwn(req.body.user.profile, 'constructor')).toBe(false)
      expect({}.constructor.prototype.isAdmin).toBeUndefined() // Global not polluted
    })

    it('should block prototype pollution at any level', () => {
      const schema = {
        body: Joi.object({
          data: Joi.object(),
        }).unknown(true),
      }

      const middleware = requestValidator(schema)
      const req = {
        body: {
          data: {
            value: 42,
            prototype: { polluted: true },
          },
        },
      }
      const res = {}
      const next = jest.fn()

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.body.data.value).toBe(42)
      expect(req.body.data.prototype).toBeUndefined()
    })

    it('should handle complex multi-level attack payload', () => {
      const schema = {
        body: Joi.object({
          user: Joi.object(),
          settings: Joi.object(),
        }).unknown(true),
      }

      const middleware = requestValidator(schema)
      const req = {
        body: {
          user: {
            name: 'attacker',
            profile: {
              bio: 'normal',
              __proto__: { level3: true },
            },
          },
          settings: {
            theme: 'dark',
            advanced: {
              __proto__: { level3: true },
              nested: {
                constructor: { level4: true },
              },
            },
          },
          __proto__: { level1: true },
        },
      }
      const res = {}
      const next = jest.fn()

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.body.user.name).toBe('attacker')
      expect(req.body.user.profile.bio).toBe('normal')
      expect(req.body.settings.theme).toBe('dark')

      // All dangerous keys should be removed
      expect(req.body.__proto__).not.toHaveProperty('level1')
      expect(req.body.user.profile.__proto__).not.toHaveProperty('level3')
      expect(req.body.settings.advanced.__proto__).not.toHaveProperty('level3')
      expect(req.body.settings.advanced.nested.constructor).not.toEqual({
        level4: true,
      })
    })

    it('should sanitize arrays with nested pollution', () => {
      const schema = {
        body: Joi.object({
          users: Joi.array().items(Joi.object()),
        }).unknown(true),
      }

      const middleware = requestValidator(schema)
      const req = {
        body: {
          users: [
            {
              name: 'john',
              __proto__: { isAdmin: true },
            },
            {
              name: 'jane',
              profile: {
                bio: 'test',
                __proto__: { hasAccess: true },
              },
            },
          ],
        },
      }
      const res = {}
      const next = jest.fn()

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.body.users[0].name).toBe('john')
      expect(req.body.users[0].__proto__).not.toHaveProperty('isAdmin')
      expect(req.body.users[1].profile.bio).toBe('test')
      expect(req.body.users[1].profile.__proto__).not.toHaveProperty(
        'hasAccess'
      )
    })

    it('should work with removeUnknown=false option', () => {
      const schema = {
        body: Joi.object({
          username: Joi.string(),
        }).unknown(true),
      }

      const middleware = requestValidator(schema, { removeUnknown: false })
      const req = {
        body: {
          username: 'john',
          extraField: 'allowed',
          nested: {
            __proto__: { polluted: true },
            data: 'safe',
          },
        },
      }
      const res = {}
      const next = jest.fn()

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.body.username).toBe('john')
      expect(req.body.extraField).toBe('allowed')
      expect(req.body.nested.data).toBe('safe')
      expect(req.body.nested.__proto__).not.toHaveProperty('polluted')
    })

    it('should preserve safe nested structures', () => {
      const schema = {
        body: Joi.object({
          user: Joi.object({
            profile: Joi.object({
              address: Joi.object({
                street: Joi.string(),
              }),
            }),
          }),
        }).unknown(true),
      }

      const middleware = requestValidator(schema)
      const req = {
        body: {
          user: {
            name: 'john',
            profile: {
              bio: 'Developer',
              address: {
                street: '123 Main St',
                city: 'NYC',
              },
            },
          },
        },
      }
      const res = {}
      const next = jest.fn()

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.body.user.profile.address.street).toBe('123 Main St')
      expect(req.body.user.profile.address.city).toBe('NYC')
    })

    it('should handle all three dangerous keys in same payload', () => {
      const schema = {
        body: Joi.object().unknown(true),
      }

      const middleware = requestValidator(schema)
      const req = {
        body: {
          __proto__: { attack1: true },
          constructor: { attack2: true },
          prototype: { attack3: true },
          safeData: 'allowed',
        },
      }
      const res = {}
      const next = jest.fn()

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.body.safeData).toBe('allowed')

      // Verify dangerous keys weren't set as own properties
      expect(Object.hasOwn(req.body, '__proto__')).toBe(false)
      expect(Object.hasOwn(req.body, 'constructor')).toBe(false)
      expect(Object.hasOwn(req.body, 'prototype')).toBe(false)

      // Verify global prototype wasn't polluted
      expect({}.attack1).toBeUndefined()
      expect({}.attack2).toBeUndefined()
      expect({}.attack3).toBeUndefined()
    })
  })
})
