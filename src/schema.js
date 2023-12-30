import * as td from './typedefs.js'
import { enumIndices } from './enumIndices.js'
import { enumDataTypes } from './enumDataTypes.js'


const SCHEMA_KEY = '$schema'


/**
 * Return the database schema
 * @param { Map<string, any> } stub 
 * @returns { td.$gSchema } - Database schema
 */
export function gGetSchema (stub) {
  return (stub.get(SCHEMA_KEY)) || {}
}


/**
 * Set the database schema
 * @param { Map<string, any> } stub 
 * @param { td.$gSchema } schema - Database schema
 */
export function gSetSchema (stub, schema) {
  stub.set(SCHEMA_KEY, schema)
}


/**
 * 
 * @param { Map<string, any> } stub 
 * @param { string } key 
 * @param { td.$gSchemaNode } value 
 */
export function gSetSchemaNode (stub, key, value) {
  const schema = gGetSchema(stub)
  schema[key] = value
  gSetSchema(stub, schema)
}

/**
 * 
 * @param { Map<string, any> } stub 
 * @param { string } node 
 * @param { string } edgeKey 
 * @param { td.$gSchemaEdgeValue } edgeValue 
 */
export function gSetSchemaEdge (stub, node, edgeKey, edgeValue) {
  const schema = gGetSchema(stub)

  if (schema[ node ]) schema[ node ][ edgeKey ] = edgeValue
  else schema[ node ] = { [ edgeKey ]: edgeValue }

  stub.set(SCHEMA_KEY, schema)
}

/**
 * 
 * @param { Map<string, any> } stub 
 * @param { string } node 
 * @param { string } edgeKey 
 * @param { enumDataTypes } dataType 
 */
export function gSchemaSetEdgeDataType (stub, node, edgeKey, dataType) {
  const schema = gGetSchema(stub)

  if (schema[ node ]?.[ edgeKey ]) schema[ node ][ edgeKey ].dataType = dataType
  else if (schema[ node ]) schema[ node ][ edgeKey ] = { dataType }
  else schema[ node ] = { [ edgeKey ]: { dataType } }

  stub.set(SCHEMA_KEY, schema)
}

/**
 * 
 * @param { Map<string, any> } stub 
 * @param { string } node 
 * @param { string } edgeKey 
 * @param { enumIndices } index 
 */
export function gSchemaAddEdgeIndex (stub, node, edgeKey, index) {
  const schema = gGetSchema(stub)
  const indices = schema[node]?.[edgeKey]?.indices

  if (indices) indices.push(index)
  else if (schema[ node ]?.[ edgeKey ]) schema[ node ][ edgeKey ].indices = [ index ]
  else {
    throw {
      id: 'gSchemaAddEdgeIndex__missing-data-type',
      message: 'Unable to add an index to an edge that does not have a dataType b/c every edge needs a dataType',
      _errorData: {schema, node, edgeKey, index }
    }
  }

  stub.set(SCHEMA_KEY, schema)
}


/**
 * 
 * @param { Map<string, any> } stub 
 * @param { string } node 
 * @param { string } edgeKey 
 * @param { enumIndices } index 
 */
export function gSchemaRemoveEdgeIndex (stub, node, edgeKey, index) {
  const schema = gGetSchema(stub)
  const indices = schema[node]?.[edgeKey]?.indices

  if (indices) {
    const temp = indices.filter((/** @type { enumIndices } */ v) => v !== index)

    if (temp.length) schema[node][edgeKey].indices = temp
    else delete schema[node][edgeKey].indices
  }

  stub.set(SCHEMA_KEY, schema)
}
