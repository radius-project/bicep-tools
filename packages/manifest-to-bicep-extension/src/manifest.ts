export interface ResourceProvider {
  name: string
  types: ResourceType[]
}

export interface ResourceType {
  name: string
  defaultApiVersion?: string
  apiVersions: APIVersion[]
}

export interface APIVersion {
  name: string
  schema: Schema
  capabilities?: string[]
}

export interface Schema {
  type: 'string' | 'object'
  description?: string
  properties?: Schema[]
  required?: string[]
  readOnly?: boolean
}
