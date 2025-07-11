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
      name: 'Applications.Test',
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
  };

  const result = addSchemaType(schema, 'fruit', factory);
  const added = factory.types[result.index] as UnionType;

  expect(added.type).toBe(TypeBaseKind.UnionType);
  expect(added.elements).toHaveLength(3);

  // Verify each element is a StringLiteralType with the correct value
  added.elements.forEach((element, idx) => {
    const stringLiteral = factory.types[element.index] as StringLiteralType;
    expect(stringLiteral.type).toBe(TypeBaseKind.StringLiteralType);
    expect(stringLiteral.value).toBe(schema.enum?.[idx]);
  });
});

  it('should throw error for enum without values', () => {
    const schema: Schema = {
      type: 'enum',
      enum: [],
    }

    expect(() => addSchemaType(schema, 'testEnum', factory)).toThrow(
      "Enum type 'testEnum' must have at least one value in 'enum' property"
    )
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
