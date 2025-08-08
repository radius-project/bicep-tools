import { beforeEach, describe, expect, it } from '@jest/globals'
import {
  addObjectProperties,
  addObjectProperty,
  addResourceTypeForApiVersion,
  addSchemaType,
} from 'src/converter'
import { ResourceProvider, Schema } from 'src/manifest'
import {
  ObjectType,
  ObjectTypePropertyFlags,
  ResourceFlags,
  ResourceType,
  ScopeType,
  StringLiteralType,
  TypeBaseKind,
  TypeFactory,
  UnionType,
} from 'bicep-types'

describe('addResourceTypeForApiVersion', () => {
  let factory: TypeFactory

  beforeEach(() => {
    factory = new TypeFactory()
  })

  it('should add a resource type', () => {
    const manifest: ResourceProvider = {
      namespace: 'Applications.Test',
      types: {
        testResources: {
          apiVersions: {
            '2021-01-01': {
              schema: {
                type: 'object',
                properties: {
                  a: {
                    type: 'string',
                  },
                  b: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
    }

    const resourceType = manifest.types['testResources']
    const apiVersion = resourceType.apiVersions['2021-01-01']

    const result = addResourceTypeForApiVersion(
      manifest,
      'testResources',
      resourceType,
      '2021-01-01',
      apiVersion,
      factory
    )
    expect(result).toBeDefined()

    const addedResourceType = factory.types[result.index] as ResourceType
    expect(addedResourceType).toBeDefined()

    expect(addedResourceType.name).toBe(
      'Applications.Test/testResources@2021-01-01'
    )
    expect(addedResourceType.type).toBe(TypeBaseKind.ResourceType)
    expect(addedResourceType.flags).toBe(ResourceFlags.None)
    expect(Object.keys(addedResourceType.functions ?? {})).toHaveLength(0)
    expect(addedResourceType.scopeType).toBe(ScopeType.Unknown)
    expect(addedResourceType.readOnlyScopes).toBeUndefined()

    expect(addedResourceType.body).toBeDefined()
    const addedBodyType = factory.types[
      addedResourceType.body.index
    ] as ObjectType
    expect(addedBodyType).toBeDefined()

    // The body type is predefined (other than .properties)
    const expectedProperties = [
      'name',
      'location',
      'properties',
      'apiVersion',
      'type',
      'id',
    ]
    expect(Object.keys(addedBodyType.properties).sort()).toEqual(
      expectedProperties.sort()
    )

    const addedPropertiesProperty = addedBodyType.properties['properties']
    expect(addedPropertiesProperty).toBeDefined()

    const addedPropertiesType = factory.types[
      addedPropertiesProperty.type.index
    ] as ObjectType
    expect(addedPropertiesType.properties).toBeDefined()

    expect(addedPropertiesType.properties).toHaveProperty('a')
    expect(addedPropertiesType.properties).toHaveProperty('b')
  })

  it('should add a resource type with additionalProperties', () => {
    const manifest: ResourceProvider = {
      namespace: 'Applications.Test',
      types: {
        testResources: {
          apiVersions: {
            '2021-01-01': {
              schema: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                  },
                  connections: {
                    type: 'object',
                    additionalProperties: {
                      type: 'object',
                      properties: {
                        endpoint: {
                          type: 'string',
                        },
                        status: {
                          type: 'enum',
                          enum: ['active', 'inactive'],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }

    const resourceType = manifest.types['testResources']
    const apiVersion = resourceType.apiVersions['2021-01-01']

    const result = addResourceTypeForApiVersion(
      manifest,
      'testResources',
      resourceType,
      '2021-01-01',
      apiVersion,
      factory
    )
    expect(result).toBeDefined()

    const addedResourceType = factory.types[result.index] as ResourceType
    expect(addedResourceType.name).toBe(
      'Applications.Test/testResources@2021-01-01'
    )

    const addedBodyType = factory.types[
      addedResourceType.body.index
    ] as ObjectType
    const addedPropertiesProperty = addedBodyType.properties['properties']
    const addedPropertiesType = factory.types[
      addedPropertiesProperty.type.index
    ] as ObjectType

    // Verify connections property exists
    expect(addedPropertiesType.properties).toHaveProperty('connections')

    const connectionsProperty = addedPropertiesType.properties['connections']
    const connectionsType = factory.types[
      connectionsProperty.type.index
    ] as ObjectType

    // Verify connections has additionalProperties
    expect(connectionsType.additionalProperties).toBeDefined()

    // Verify additionalProperties structure
    const additionalPropsType = factory.types[
      connectionsType.additionalProperties?.index || 0
    ] as ObjectType
    expect(additionalPropsType.type).toBe(TypeBaseKind.ObjectType)
    expect(additionalPropsType.properties).toHaveProperty('endpoint')
    expect(additionalPropsType.properties).toHaveProperty('status')

    // Verify status is an enum (UnionType)
    const statusProperty = additionalPropsType.properties['status']
    const statusType = factory.types[statusProperty.type.index] as UnionType
    expect(statusType.type).toBe(TypeBaseKind.UnionType)
    expect(statusType.elements).toHaveLength(2)
  })
})

describe('addSchemaType', () => {
  let factory: TypeFactory

  beforeEach(() => {
    factory = new TypeFactory()
  })

  it('should add a string type', () => {
    const schema: Schema = {
      type: 'string',
    }

    const result = addSchemaType(schema, 'test', factory)
    const added = factory.types[result.index]
    expect(added).toBeDefined()
    expect(added.type).toBe(TypeBaseKind.StringType)
  })

  it('should add an object type', () => {
    const schema: Schema = {
      type: 'object',
      properties: {
        a: {
          type: 'string',
        },
        b: {
          type: 'string',
        },
      },
    }

    const result = addSchemaType(schema, 'test', factory)

    const added = factory.types[result.index] as ObjectType
    expect(added.type).toBe(TypeBaseKind.ObjectType)
    expect(added.properties).toBeDefined()
    expect(Object.entries(added.properties)).toHaveLength(2)
    expect(added.properties).toHaveProperty('a')
    expect(added.properties).toHaveProperty('b')
  })

  it('should add an integer type', () => {
    const schema: Schema = {
      type: 'integer',
    }

    const result = addSchemaType(schema, 'test', factory)
    const added = factory.types[result.index]
    expect(added).toBeDefined()
    expect(added.type).toBe(TypeBaseKind.IntegerType)
  })

  it('should add a boolean type', () => {
    const schema: Schema = {
      type: 'boolean',
    }

    const result = addSchemaType(schema, 'test', factory)
    const added = factory.types[result.index]
    expect(added).toBeDefined()
    expect(added.type).toBe(TypeBaseKind.BooleanType)
  })

  it('should add an enum type', () => {
    const schema: Schema = {
      type: 'enum',
      enum: ['value1', 'value2', 'value3'],
    }

    const result = addSchemaType(schema, 'testEnum', factory)
    const added = factory.types[result.index] as UnionType

    expect(added.type).toBe(TypeBaseKind.UnionType)
    expect(added.elements).toHaveLength(3)

    // Verify each enum value is a string literal
    added.elements.forEach((element, index) => {
      const stringLiteral = factory.types[element.index] as StringLiteralType
      expect(stringLiteral.type).toBe(TypeBaseKind.StringLiteralType)
      expect(stringLiteral.value).toBe(schema.enum?.[index])
    })
  })

  it('should create a union type for a string type with enum property', () => {
    const schema: Schema = {
      type: 'string',
      enum: ['apple', 'banana', 'cherry'],
    }

    const result = addSchemaType(schema, 'fruit', factory)
    const added = factory.types[result.index] as UnionType

    expect(added.type).toBe(TypeBaseKind.UnionType)
    expect(added.elements).toHaveLength(3)

    // Verify each element is a StringLiteralType with the correct value
    added.elements.forEach((element, idx) => {
      const stringLiteral = factory.types[element.index] as StringLiteralType
      expect(stringLiteral.type).toBe(TypeBaseKind.StringLiteralType)
      expect(stringLiteral.value).toBe(schema.enum?.[idx])
    })
  })

  it('should add an object type with additionalProperties', () => {
    const schema: Schema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
      },
      additionalProperties: {
        type: 'object',
        properties: {
          endpoint: {
            type: 'string',
          },
          status: {
            type: 'string',
          },
        },
      },
    }

    const result = addSchemaType(schema, 'testWithAdditionalProps', factory)
    const added = factory.types[result.index] as ObjectType

    expect(added.type).toBe(TypeBaseKind.ObjectType)
    expect(added.properties).toBeDefined()
    expect(added.properties).toHaveProperty('name')
    expect(added.additionalProperties).toBeDefined()

    // Verify additionalProperties type
    const additionalPropsType = factory.types[
      added.additionalProperties?.index || 0
    ] as ObjectType
    expect(additionalPropsType.type).toBe(TypeBaseKind.ObjectType)
    expect(additionalPropsType.properties).toHaveProperty('endpoint')
    expect(additionalPropsType.properties).toHaveProperty('status')
  })

  it('should add an object type with only additionalProperties (no fixed properties)', () => {
    const schema: Schema = {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    }

    const result = addSchemaType(schema, 'testWithOnlyAdditionalProps', factory)
    const added = factory.types[result.index] as ObjectType

    expect(added.type).toBe(TypeBaseKind.ObjectType)
    expect(added.properties).toEqual({})
    expect(added.additionalProperties).toBeDefined()

    // Verify additionalProperties is StringType
    const additionalPropsType =
      factory.types[added.additionalProperties?.index || 0]
    expect(additionalPropsType.type).toBe(TypeBaseKind.StringType)
  })

  it('should add an object type with only properties (no additionalProperties)', () => {
    const schema: Schema = {
      type: 'object',
      properties: {
        fixedProp: {
          type: 'string',
        },
      },
    }

    const result = addSchemaType(schema, 'testWithOnlyProperties', factory)
    const added = factory.types[result.index] as ObjectType

    expect(added.type).toBe(TypeBaseKind.ObjectType)
    expect(added.properties).toBeDefined()
    expect(added.properties).toHaveProperty('fixedProp')
    expect(added.additionalProperties).toBeUndefined()
  })

  it('should throw error for enum without values', () => {
    const schema: Schema = {
      type: 'enum',
      enum: [],
    }

    expect(() => addSchemaType(schema, 'testEnum', factory)).toThrow(
      "Enum type 'testEnum' must have at least one value in 'enum' property"
    )
  })

  it('should add an array type with string items', () => {
    const schema: Schema = {
      type: 'array',
      items: {
        type: 'string',
      },
    }

    const result = addSchemaType(schema, 'testArray', factory)
    const added = factory.types[result.index]
    expect(added).toBeDefined()
    expect(added.type).toBe(TypeBaseKind.ArrayType)
  })

  it('should add an array type with object items', () => {
    const schema: Schema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
          value: {
            type: 'integer',
          },
        },
      },
    }

    const result = addSchemaType(schema, 'testObjectArray', factory)
    const added = factory.types[result.index]
    expect(added).toBeDefined()
    expect(added.type).toBe(TypeBaseKind.ArrayType)
  })

  it('should add nested array types', () => {
    const schema: Schema = {
      type: 'array',
      items: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
    }

    const result = addSchemaType(schema, 'nestedArray', factory)
    const added = factory.types[result.index]
    expect(added).toBeDefined()
    expect(added.type).toBe(TypeBaseKind.ArrayType)
  })

  it('should throw error for array without items', () => {
    const schema: Schema = {
      type: 'array',
    }

    expect(() => addSchemaType(schema, 'testArray', factory)).toThrow(
      "Array type 'testArray' must have an 'items' property"
    )
  })
  it('should throw error for enum without enum property', () => {
    const schema: Schema = {
      type: 'enum',
      // Missing enum property
    }

    expect(() => addSchemaType(schema, 'testEnum', factory)).toThrow(
      "Enum type 'testEnum' must have at least one value in 'enum' property"
    )
  })

  it('should throw error for additionalProperties: true (Boolean form)', () => {
    const schema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
      },
      additionalProperties: true, // Boolean form is not supported
    } as unknown as Schema

    expect(() =>
      addSchemaType(schema, 'testWithBooleanAdditionalProps', factory)
    ).toThrow('Unsupported schema type: undefined')
  })

  it('should throw error for additionalProperties with type: any', () => {
    const schema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
      },
      additionalProperties: {
        type: 'any', // "any" type is not supported
        description: 'A map of key-value pairs',
      },
    } as unknown as Schema

    expect(() =>
      addSchemaType(schema, 'testWithAnyAdditionalProps', factory)
    ).toThrow('Unsupported schema type: any')
  })
})

describe('addObjectProperties', () => {
  let factory: TypeFactory

  beforeEach(() => {
    factory = new TypeFactory()
  })

  it('should add each property', () => {
    const schema: Schema = {
      type: 'object',
      properties: {
        a: {
          type: 'string',
        },
        b: {
          type: 'string',
        },
      },
    }

    const result = addObjectProperties(schema, factory)
    expect(Object.entries(result)).toHaveLength(2)
    expect(result).toHaveProperty('a')
    expect(result).toHaveProperty('b')
  })

  it('should handle additionalProperties in object properties', () => {
    const schema: Schema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
        connections: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
              },
            },
          },
        },
      },
    }

    const result = addObjectProperties(schema, factory)
    expect(Object.entries(result)).toHaveLength(2)
    expect(result).toHaveProperty('name')
    expect(result).toHaveProperty('connections')

    // Verify that connections property was created correctly
    const connectionsProperty = result['connections']
    const connectionsType = factory.types[
      connectionsProperty.type.index
    ] as ObjectType
    expect(connectionsType.type).toBe(TypeBaseKind.ObjectType)
    expect(connectionsType.additionalProperties).toBeDefined()
  })
})

describe('addObjectProperty', () => {
  let factory: TypeFactory

  beforeEach(() => {
    factory = new TypeFactory()
  })

  it('should add a property', () => {
    const parent: Schema = {
      type: 'object',
      properties: {
        // Will be unused
      },
    }

    const property: Schema = {
      type: 'string',
      description: 'cool description',
    }

    const result = addObjectProperty(parent, 'a', property, factory)
    expect(result.description).toEqual('cool description')
    expect(result.flags).toEqual(ObjectTypePropertyFlags.None)

    const added = factory.types[result.type.index]
    expect(added).toBeDefined()
  })

  it('should add a readonly property', () => {
    const parent: Schema = {
      type: 'object',
      properties: {
        // Will be unused
      },
    }

    const property: Schema = {
      type: 'string',
      description: 'cool description',
      readOnly: true,
    }

    const result = addObjectProperty(parent, 'a', property, factory)
    expect(result.description).toEqual('cool description')
    expect(result.flags).toEqual(ObjectTypePropertyFlags.ReadOnly)

    const added = factory.types[result.type.index]
    expect(added).toBeDefined()
  })

  it('should add a required property', () => {
    const parent: Schema = {
      type: 'object',
      properties: {
        // Will be unused
      },
      required: ['a'],
    }

    const property: Schema = {
      type: 'string',
      description: 'cool description',
    }

    const result = addObjectProperty(parent, 'a', property, factory)
    expect(result.description).toEqual('cool description')
    expect(result.flags).toEqual(ObjectTypePropertyFlags.Required)

    const added = factory.types[result.type.index]
    expect(added).toBeDefined()
  })
})
