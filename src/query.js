import * as td from './typedefs.js'
import { enumReservedEdges  } from './enumReservedEdges.js'


/**
 * Return response of a single query.
 * IF `query.uid` OR `query.uid` is set => response will be an object.
 * IF `query.node` is set => response will be an array.
 * IF an edge does not have any data => the edge in the response is undefined.
 * @param { Map<string, any> } stub 
 * @param { td.$gQuery } query 
 * @returns { any[] | {} }
 */
export function gQuery (stub, query) {
  return getResponse(stub, query) // return response of a single query
}


/**
 * Run an array of queries.
 * If no results found for a query => the key is undefined.
 * IF `query.uid` OR `query.uid` is set => response will be an object.
 * IF `query.node` is set => response will be an array.
 * IF an edge does not have any data => the edge in the response is undefined.
 * @param { Map<string, any> } stub 
 * @param { { key: string, query: td.$gQuery }[] } queries 
 * @returns { {} }
 */
export function gQueries (stub, queries) {
  /** @type { any } */
  const response = {}

  for (const { key, query } of queries) { // loop each requested query
    const r = getResponse(stub, query) // run requested query
    if (r) response[key] = r // if a response is provided from db => add it to the response object
  }

  return response
}


/**
 * Return response of a single query.
 * @param { Map<string, any> } stub 
 * @param { td.$gQuery } query 
 * @returns { any | any[] }
 */
function getResponse (stub, query) {
  /** @type { td.$gQueryResponse } */
  const response = { object: null, array: [] }

  if (query.uid) addNodeToResponseByUid(stub, response, query, query.uid) // IF query by uid requested => add node to response by uid
  else if (query.exact) { // IF query using exact index requested
    const uid = stub.get(`$index___exact___${ query.node }___${ query.exact[0] }___${ query.exact[1] }`) // get uid of node via exact index
    if (uid) addNodeToResponseByUid(stub, response, query, uid) // IF uid found => add node to response by uid
  } else if (query.node) { // IF query by node requested
    let nodes
    let isUsingSortIndexNodes = false
    const edge = query.format.$asc || query.format.$dsc

    if (edge) nodes = stub.get(`$index___sort___${ query.node }___${ edge }`) // IF sorting by an edge requested => see if edge is a sort index

    if (nodes) isUsingSortIndexNodes = true // IF edge is a sort index => tip flag to true
    else nodes = stub.get('$nodes')[query.node] // IF edge is not a sort index => get unsorted node uids from $nodes in database

    runFnThenFormatArray(isUsingSortIndexNodes, nodes, (uid) => addNodeToResponseByUid(stub, response, query, uid), () => response.array) // call addNodeToResponseByUid() and then format response.array
  }

  return (query.uid || query.exact) ? response.object : response.array // IF query.uid OR query.exact requested => return database object ELSE return array of items
}


/**
 * Add a node to the response based on the provided uid
 * @param { Map<string, any> } stub 
 * @param { td.$gQueryResponse } response 
 * @param { td.$gQuery } query 
 * @param { string } uid 
 * @returns { td.$gAddDataMeta }
 */
function addNodeToResponseByUid (stub, response, query, uid) {
  const addMetaData = addEdgesToResponse(stub, uid, query.format) // validate / add the edges in query.format to response

  if (addMetaData.rNode) { // IF edges added to response successfully
    if (query.exact || query.uid) response.object = addMetaData.rNode // IF query.uid OR query.exact requested => set response object
    else if (query.node) response.array.push(addMetaData.rNode) // ELSE IF query.node requested => add to response array
  }

  return addMetaData
}


/**
 * For each edge in the section of the query format, validate / add edge value to response
 * @param { Map<string, any> } stub 
 * @param { string } uid 
 * @param { any } queryFormatSection 
 * @returns { td.$gAddDataMeta }
 */
function addEdgesToResponse (stub, uid, queryFormatSection) {
  let isValid = true // IF this is a valid edge, start true and if any issues arise tip to false

  /**
   * IF edge gives an array of items, start is the index we want to see first, inclusive, so if 1 we will start on the 2nd item
   * @type { number | undefined }
   */
  let start

  /** 
   * IF edge gives an array of items, end is the index we want to see last, inclusive, so if 1 we will end on the 2nd item, not allowed in query if count is defined
   * @type { number | undefined }
   */
  let end

  /**
   * IF edge gives an array of items, count is the number of items we want to returned, not allowed in query if end is defined
   * @type { number | undefined }
   */
  let count

  /**
   * Information about how the query has requested this section to be sorted
   * @type { td.$gSortMeta | undefined }
  */
  let sortMeta

  const nodeValue = stub.get(uid) // define value of node by uid

  /**
   * We will add properties to this object based on the query and what we find in the db
   * @type { { [k: string]: any } }
   */
  const rNode = {}

  if (!nodeValue) isValid = false // IF there is no value @ the provided uid => tip isValid flag to false
  else {
    for (const edge in queryFormatSection) { // loop a section of query.format object
      const queryFormatEdgeValue = queryFormatSection[edge] // @ this edge in the query.format object, get the edge's value

      if (edge === 'uid') rNode.uid = uid // IF uid is the desired edge => set rNode.uid
      else if (!Object.values(enumReservedEdges).includes(/** @type { enumReservedEdges } */ (edge))) { // IF desired edge is not a reserved edge
        if (typeof queryFormatEdgeValue === 'boolean' && queryFormatEdgeValue) rNode[edge] = nodeValue[edge] // IF edge has no children => set rNode[edge]
        else { // IF edge has children
          if (typeof nodeValue[edge] === 'string') addToResponse(stub, rNode, edge, nodeValue[edge], queryFormatEdgeValue, false) // IF nodeValue (from db) [edge] is string (is a single uid) => get that uid's value and add it to the response
          else if (Array.isArray(nodeValue[edge])) runFnThenFormatArray(false, nodeValue[edge], (uid) => addToResponse(stub, rNode, edge, uid, queryFormatEdgeValue, true), () => rNode[edge]) // IF nodeValue (from db) [edge] is an array (array of uid's) => get each uid's value and add them as an array to the response
        }
      }

      switch (edge) { // keep track of requested formating options for this edge
        case enumReservedEdges.$count:
          count = queryFormatEdgeValue
          break
        case enumReservedEdges.$start:
          start = queryFormatEdgeValue
          break
        case enumReservedEdges.$end:
          end = queryFormatEdgeValue
          break
        case enumReservedEdges.$asc:
        case enumReservedEdges.$dsc:
          sortMeta = { edge, edgeValue: queryFormatEdgeValue }
          break
      }
    }

    // We run $filter() after defining rNode so that we may pass $filter(rNode)
    // Edges available in rNode === requested edges in query
    // IF a $filter() is requested AND the filter response is falsy => tip isValid flag to false
    if (queryFormatSection.$filter && !queryFormatSection.$filter(rNode)) isValid = false
  }

  return {
    rNode: isValid ? rNode : null,
    formatOptions: { count, start, end, sortMeta }
  }
}


/**
 * Add / validate node's edges to response
 * @param { Map<string, any> } stub 
 * @param { any } rNode 
 * @param { string } edge 
 * @param { string } uid 
 * @param { any } format 
 * @param { boolean } isArray 
 * @returns { td.$gAddDataMeta }
 */
function addToResponse (stub, rNode, edge, uid, format, isArray) {
  const addMetaData = addEdgesToResponse(stub, uid, format) // For each edge in the section of the query format, validate / add edge value to response

  if (addMetaData.rNode) { // IF additions to response were successful
    if (!isArray) rNode[edge] = addMetaData.rNode // IF we are not adding an array to the response => bind value
    else if (rNode[edge]?.length) rNode[edge].push(addMetaData.rNode) // IF array in response already has items => push array
    else rNode[edge] = [addMetaData.rNode] // IF should be an array in response but has no values => init array + value
  }

  return { rNode, formatOptions: addMetaData.formatOptions }
}


/**
 * Loop nodes, call `loopFunction()` on each iteration, format array after looping complete
 * @param { boolean } isUsingSortIndexNodes 
 * @param { string[] } nodes 
 * @param { (uid: string) => td.$gAddDataMeta } loopFunction 
 * @param { () => any[] } getArray 
 * @returns { void }
 */
function runFnThenFormatArray (isUsingSortIndexNodes, nodes, loopFunction, getArray) {
  /**
   * IF edge gives an array of items, start is the index we want to see first, inclusive, so if 1 we will start on the 2nd item
   * @type { number | undefined }
   */
  let start

  /** 
   * IF edge gives an array of items, end is the index we want to see last, inclusive, so if 1 we will end on the 2nd item, not allowed in query if count is defined
   * @type { number | undefined }
   */
  let end

  /**
   * IF edge gives an array of items, count is the number of items we want to returned, not allowed in query if end is defined
   * @type { number | undefined }
   */
  let count

  /**
   * Information about how the query has requested this section to be sorted
   * @type { td.$gSortMeta | undefined }
  */
  let sortMeta

  for (const uid of nodes) { // loop nodes and get their uid's
    const addMetaData = loopFunction(uid) // call desired function on each node

    if (typeof addMetaData.formatOptions.start === 'number') start = addMetaData.formatOptions.start // rather then a typical faly check use typeof for start b/c it could be 0 which is a value we'd wanna keep track of but also is falsy
    if (addMetaData.formatOptions.end) end = addMetaData.formatOptions.end
    if (addMetaData.formatOptions.count) count = addMetaData.formatOptions.count
    if (addMetaData.formatOptions.sortMeta) sortMeta = addMetaData.formatOptions.sortMeta
  }

  if (count || sortMeta || end || typeof start === 'number') { // if formatting array requested from loopFunction
    let array = getArray() // get the array

    if (sortMeta) { // if sorting requested
      if (!isUsingSortIndexNodes) { // IF not using a sorted index array => sort items
        const comparator = sortMeta.edgeValue
        array = getArray().sort((a, b) => Number(a[comparator] > b[comparator]) - Number(a[comparator] < b[comparator])) // order ascending
      }

      if (sortMeta.edge === '$dsc') array.reverse() // order descending
    }


    if (start === 0 && end) array.splice(end + 1) // if start is 0 and an end is defined => remove all items from array after end index
    else if (start && end) { // if start and end are greater than 0
      array.splice(end + 1) // remove all items from array after end index
      array.splice(0, start) // remove all items in array before start index
    } else if (start) { // IF start is greater than 0 but no end
      array.splice(0, start) // remove all items before the starting index
    }


    if (!end && count) array.splice(count) // IF no end but a count is requested => remove all items after the count
  }
}
