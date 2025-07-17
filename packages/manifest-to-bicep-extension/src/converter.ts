import {
  buildIndex,
  ObjectTypeProperty,
  ObjectTypePropertyFlags,
  ResourceFlags,
  ScopeType,
  TypeFactory,
  TypeFile,
  TypeReference,
  writeIndexJson,
  writeIndexMarkdown,
  writeTypesJson,
} from 'bicep-types'
import { APIVersion, ResourceProvider, ResourceType, Schema } from './manifest'

export function convert(manifest: ResourceProvider): {
  typesContent: string
  indexContent: string
  documentationContent: string
} {
  const factory = new TypeFactory()
  for (const [resourceTypeName, resourceType] of Object.entries(
    manifest.types
  )) {
    for (const [apiVersionName, apiVersion] of Object.entries(
      resourceType.apiVersions
    )) {
      addResourceTypeForApiVersion(
        manifest,
        resourceTypeName,
        resourceType,
        apiVersionName,
        apiVersion,
        factory
      )
    }
  }

  const typeFiles: TypeFile[] = []
  typeFiles.push({
    relativePath: 'types.json',
    types: factory.types,
  })

  const indexContent = buildIndex(typeFiles, (log) => console.log(log), {
    name: 'radius' + manifest.name.toLowerCase().replace('.', ''),
    version: '0.0.1',
    isSingleton: false,
  })

  return {
    typesContent: writeTypesJson(factory.types),
    indexContent: writeIndexJson(indexContent),
    documentationContent: writeIndexMarkdown(indexContent),
  }
}

export function addResourceTypeForApiVersion(
  manifest: ResourceProvider,
  resourceTypeName: string,
  _: ResourceType,
  apiVersionName: string,
  apiVersion: APIVersion,
  factory: TypeFactory
): TypeReference {
  const qualifiedName = `${manifest.name}/${resourceTypeName}@${apiVersionName}`

  const propertyType = factory.addObjectType(
    `${resourceTypeName}Properties`,
    addObjectProperties(apiVersion.schema, factory)
  )

  const bodyType = factory.addObjectType(qualifiedName, {
    name: {
      type: factory.addStringType(),
      flags:
        ObjectTypePropertyFlags.Required | ObjectTypePropertyFlags.Identifier,
      description: 'The resource name.',
    },
    location: {
      type: factory.addStringType(),
      flags: ObjectTypePropertyFlags.None,
      description: 'The resource location.',
    },
    properties: {
      type: propertyType,
      flags: ObjectTypePropertyFlags.Required,
      description: 'The resource properties.',
    },

    apiVersion: {
      type: factory.addStringLiteralType(apiVersionName),
      flags:
        ObjectTypePropertyFlags.ReadOnly |
        ObjectTypePropertyFlags.DeployTimeConstant,
      description: 'The API version.',
    },
    type: {
      type: factory.addStringLiteralType(
        `${manifest.name}/${resourceTypeName}`
      ),
      flags:
        ObjectTypePropertyFlags.ReadOnly |
        ObjectTypePropertyFlags.DeployTimeConstant,
      description: 'The resource type.',
    },
    id: {
      type: factory.addStringType(),
      flags: ObjectTypePropertyFlags.ReadOnly,
      description: 'The resource id.',
    },
  })
  return factory.addResourceType(
    qualifiedName,
    ScopeType.Unknown,
    undefined,
    bodyType,
    ResourceFlags.None,
    {}
  )
}

export function addSchemaType(
  schema: Schema,
  name: string,
  factory: TypeFactory
): TypeReference {
  if (schema.type === 'string') {
    // Handle the edge case: string with enum constraint
    if (schema.enum && schema.enum.length > 0) {
      const enumTypeReferences = schema.enum.map((value) =>
        factory.addStringLiteralType(value)
      )
      return factory.addUnionType(enumTypeReferences)
    }
    return factory.addStringType() // Regular string without constraints
  } else if (schema.type === 'enum') {
    // Handle explicit enum type
    if (!schema.enum || schema.enum.length === 0) {
      throw new Error(
        `Enum type '${name}' must have at least one value in 'enum' property`
      )
    }
    const enumTypeReferences = schema.enum.map((value) =>
      factory.addStringLiteralType(value)
    )
    return factory.addUnionType(enumTypeReferences)
  } else if (schema.type === 'object') {
    let additionalPropertiesType: TypeReference | undefined = undefined
    if (schema.additionalProperties) {
      additionalPropertiesType = addSchemaType(
        schema.additionalProperties,
        `${name}AdditionalProperties`,
        factory
      )
    }
    return factory.addObjectType(
      name,
      addObjectProperties(schema, factory),
      additionalPropertiesType
    )
  } else if (schema.type === 'integer') {
    return factory.addIntegerType()
  } else if (schema.type === 'boolean') {
    return factory.addBooleanType()
  } else {
    throw new Error(`Unsupported schema type: ${schema.type}`)
  }
}

export function addObjectProperties(
  parent: Schema,
  factory: TypeFactory
): Record<string, ObjectTypeProperty> {
  const results: Record<string, ObjectTypeProperty> = {}
  for (const [key, value] of Object.entries(parent.properties ?? {})) {
    results[key] = addObjectProperty(parent, key, value, factory)
  }
  return results
}

export function addObjectProperty(
  parent: Schema,
  key: string,
  property: Schema,
  factory: TypeFactory
): ObjectTypeProperty {
  const propertyType = addSchemaType(property, key, factory)

  let flags = ObjectTypePropertyFlags.None
  if (parent.required?.includes(key)) {
    flags |= ObjectTypePropertyFlags.Required
  }
  if (property.readOnly === true) {
    flags |= ObjectTypePropertyFlags.ReadOnly
  }

  return {
    description: property.description,
    type: propertyType,
    flags: flags,
  }
}
