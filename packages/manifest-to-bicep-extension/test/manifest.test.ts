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

  it('should parse a manifest with different data types in schema', () => {
    const input = fs.readFileSync(
      __dirname + '/testdata/valid-with-schema-properties.yaml',
      'utf8'
    )
    const result: ResourceProvider = parseManifest(input)

    expect(
      result.types['testResources'].apiVersions['2025-01-01-preview'].schema
        .properties
    ).toHaveProperty('a', expect.objectContaining({ type: 'integer' }))
    expect(
      result.types['testResources'].apiVersions['2025-01-01-preview'].schema
        .properties
    ).toHaveProperty('b', expect.objectContaining({ type: 'boolean' }))
    expect(
      result.types['testResources'].apiVersions['2025-01-01-preview'].schema
        .properties
    ).toHaveProperty('c', expect.objectContaining({ type: 'string' }))
    expect(
      result.types['testResources'].apiVersions['2025-01-01-preview'].schema
        .properties
    ).toHaveProperty('connections', expect.objectContaining({ type: 'object' }))
  })

  it('should parse a manifest with enum types', () => {
    const input = `
name: MyCompany.Resources
types:
  testResources:
    apiVersions:
      '2025-01-01-preview':
        schema:
          type: object
          properties:
            status:
              type: enum
              enum: ['active', 'inactive', 'pending']
              description: "The status of the resource"
            mode:
              type: string
              enum: ['development', 'production']
              description: "Deployment mode"
        capabilities: ['Recipes']
`
    const result: ResourceProvider = parseManifest(input)

    const schema =
      result.types['testResources'].apiVersions['2025-01-01-preview'].schema

    // Test explicit enum type
    expect(schema.properties).toHaveProperty('status')
    expect(schema.properties?.status).toEqual({
      type: 'enum',
      enum: ['active', 'inactive', 'pending'],
      description: 'The status of the resource',
    })

    // Test string with enum constraint
    expect(schema.properties).toHaveProperty('mode')
    expect(schema.properties?.mode).toEqual({
      type: 'string',
      enum: ['development', 'production'],
      description: 'Deployment mode',
    })
  })

  it('should parse a manifest with additionalProperties', () => {
    const input = `
name: MyCompany.Resources
types:
  testResources:
    apiVersions:
      '2025-01-01-preview':
        schema:
          type: object
          properties:
            connections:
              type: object
              additionalProperties:
                type: object
                properties:
                  endpoint:
                    type: string
                    description: "Connection endpoint"
                  status:
                    type: enum
                    enum: ['active', 'inactive']
            metadata:
              type: object
              additionalProperties: any
        capabilities: ['Recipes']
`
    const result: ResourceProvider = parseManifest(input)

    const schema =
      result.types['testResources'].apiVersions['2025-01-01-preview'].schema

    // Test object with structured additionalProperties
    expect(schema.properties).toHaveProperty('connections')
    const connections = schema.properties?.connections
    expect(connections?.type).toBe('object')
    expect(connections?.additionalProperties).toBeDefined()
    expect(typeof connections?.additionalProperties).toBe('object')

    if (typeof connections?.additionalProperties === 'object') {
      expect(connections.additionalProperties.type).toBe('object')
      expect(connections.additionalProperties.properties).toHaveProperty(
        'endpoint'
      )
      expect(connections.additionalProperties.properties).toHaveProperty(
        'status'
      )
    }

    // Test object with "any" additionalProperties
    expect(schema.properties).toHaveProperty('metadata')
    const metadata = schema.properties?.metadata
    expect(metadata?.type).toBe('object')
    expect(metadata?.additionalProperties).toBe('any')
  })

  it('should parse additionalProperties: true but mark as unsupported', () => {
    const input = `
name: MyCompany.Resources
types:
  testResources:
    apiVersions:
      '2025-01-01-preview':
        schema:
          type: object
          properties:
            metadata:
              type: object
              additionalProperties: true
        capabilities: ['Recipes']
`
    const result: ResourceProvider = parseManifest(input)

    const schema =
      result.types['testResources'].apiVersions['2025-01-01-preview'].schema
    const metadata = schema.properties?.metadata
    expect(metadata?.type).toBe('object')
    expect(metadata?.additionalProperties).toBe(true)
  })

  it('should parse additionalProperties with type: any but mark as unsupported', () => {
    const input = `
name: MyCompany.Resources
types:
  testResources:
    apiVersions:
      '2025-01-01-preview':
        schema:
          type: object
          properties:
            mymap:
              type: object
              additionalProperties:
                type: any
                description: "A map of key-value pairs"
        capabilities: ['Recipes']
`
    const result: ResourceProvider = parseManifest(input)

    const schema =
      result.types['testResources'].apiVersions['2025-01-01-preview'].schema
    const mymap = schema.properties?.mymap
    expect(mymap?.type).toBe('object')
    expect(mymap?.additionalProperties).toEqual({
      type: 'any',
      description: 'A map of key-value pairs',
    })
  })
})
