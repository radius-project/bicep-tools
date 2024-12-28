import { describe, expect, it } from '@jest/globals'
import { parseManifest, ResourceProvider } from '../src/manifest'
import * as fs from 'node:fs'

describe('parseManifest', () => {
  it('should parse a manifest file with required fields', () => {
    const input = fs.readFileSync(__dirname + '/testdata/valid.yaml', 'utf8')
    const result: ResourceProvider = parseManifest(input)
    expect(result.name).toBe('MyCompany.Resources')
    expect(result.types).toStrictEqual({
      testResources: {
        apiVersions: {
          '2025-01-01-preview': {
            capabilities: ['Recipes'],
            schema: {},
          },
        },
      },
    })
  })
})
