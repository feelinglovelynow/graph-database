import * as td from './typedefs.js'
import { gGetSchema } from './schema.js'
import { enumIndices } from './enumIndices.js'
import { enumDataTypes } from './enumDataTypes.js'


const UID_PREFIX = '_:'
const NODES_KEY = '$nodes'


/**
 * Insert data into graph database
 * @param { Map<string, any> } stub 
 * @param { [ string, td.$gNodes, { [ k: string ]: any } ][] } values - First parameter in the array is a uid, uid should start with _: and then have an identifier which can be used for other edges, for example _:mom - The second parameter is the Node this uid is for. The third parameter in the array is the value you'd love to be inserted, this value is validated against the schema based on the Node option
*/
export function gInsert (stub, values) {
  /**
   * As we find uids in the uids with a UID_PREFIX we will add the UID_PREFIX as the key and it's crypto database uid as the value.
   * @type { Map<any, any> }
   */
  const mapUids = new Map()

  /**
   * Helps us validate if the provided insert matches the schema
   * @type { td.$gSchema }
   */
  const schema = gGetSchema(stub)

  /**
   * @type { { [k: string]: string[] } }
   * Keeps track of all node uids.
   * Example - { User: [ uid1, uid2], Session: [ uid3 ] }
   */
  const $nodes = stub.get(NODES_KEY) || {}

  /**
   * [ uid, node, value ].
   * In this array we keep track of meta data for all the items we want to add to the database.
   * We need to go though all the uids once first to fully populate mapUids.
   * @type { [ string, string, any ][] }
   */
  const uidAdditions = []

  /**
   * [ uid, node, edge ].
   * As we find edges that according to the schema need a sort index insert we will keep track of them here.
   * Once we get them all together, we sort them, and then add to db.
   * @type { [ string,  td.$gNodes, string ][] }
   */
  const sortIndexAdditions = []


  for (const [ insertUid, node, value ] of values) { // loop insert values
    let uid // this will be the uid that is added to the database
    const split = insertUid.split(UID_PREFIX) // IF uid in the insert has a _: prefix split[0] is _: and split[1] is the identifier - example _:mom turns int [ '_:', 'mom' ]

    if (split.length !== 2) uid = insertUid // IF no prefix found => use the insert uid as the desired uid to add to the database
    else { // IF prefix is being used for this uid
      uid = crypto.randomUUID() // set db uid
      mapUids.set(insertUid, uid) // add uid from insert array as the key and uid that'll go into the db as the value
    }

    if (Array.isArray($nodes[node])) $nodes[node].push(uid) // IF schema $nodes for this uid's node is already an array => push onto it
    else $nodes[node] = [ uid ] // IF schema $nodes for this uid's node is not an array => set as array w/ uid as first value

    for (const edge in value) { // loop each edge => validate each edge => IF invalid throw errors => IF valid do index things
      if (!schema[node]) throw { id: 'gInsert__invalid-node', message: 'Please send a node that is in the schema', _errorData: { schema, node, value } }
      if (!schema[node][edge]) throw { id: 'gInsert__invalid-edge', message: 'In the provided value, there is an invalid edge', _errorData: { schema, node, value, edge } }
      if (schema[node][edge].dataType === enumDataTypes.str && typeof value[edge] !== 'string') throw { id: 'gInsert__invalid-edge-dataType', message: 'In the provided value, there is a provided edge that should be a string based on the schema but it is not', _errorData: { schema, node, insertUid, edge, value } }
      if (schema[node][edge].dataType === enumDataTypes.num && typeof value[edge] !== 'number') throw { id: 'gInsert__invalid-edge-dataType', message: 'In the provided value, there is a provided edge that should be a number based on the schema but it is not', _errorData: { schema, node, insertUid, edge, value } }
      if (schema[node][edge].indices?.includes(enumIndices.exact)) stub.set(`$index___exact___${ node }___${ edge }___${ value[edge] }`, uid)
      if (schema[node][edge].indices?.includes(enumIndices.sort)) sortIndexAdditions.push([ uid, node, edge ])
    }

    uidAdditions.push([ uid, node, value ]) // add meta data about each value to uidAdditions array, we need to loop them all first, before adding them to the db, to populate mapUids
  }

  /**
   * See if edge's value starts with _: if it does replace that with it's database uid that was determined in the first loop above
   * @param { { [ k: string ]: any } } key 
   * @param { string | number } value 
   */
  function overwriteUids (key, value) {
    if (typeof key[value] === 'string' && key[value].startsWith(UID_PREFIX)) { // IF edge's value starts with _:
      const uuid = mapUids.get(key[value]) // See if we have a database uid for this insert uid
      if (uuid) key[value] = uuid // IF database uid found => replace it with the insert uid
    }
  }

  for (const [ uid, node, value ] of uidAdditions) { // loop the uids that we'll add to the db from the insert
    for (const edge in value) { // loop their edges
      if (!Array.isArray(value[edge])) overwriteUids(value, edge) // IF edge is not an array, overwrite any _: uids
      else { // IF edge is an array
        for (let i = 0; i < value[edge].length; i++) { // loop the uids
          overwriteUids(value[edge], i) // overwrite any _: uids
        }
      }
    }

    value.$node = node // add $node to the value that will be inserted into the databse
    stub.set(uid, value) // add value to database
  }


  for (const [ uid, node, edge ] of sortIndexAdditions) { // loop sortIndexAdditions
    /**
     * We will store the uid and the value of the edge we'd love to sort by in this array
     * @type { [ string, string ][] }
     */
    const values = []
    const sortKey = `$index___sort___${ node }___${ edge }` // the key name that will store the sorted uids
    const uids = stub.get(sortKey) || [] // the uids that are already sorted or an empty array

    uids.push(uid) // add provided uid to the array

    for (const uuid of uids) { // loop the array of sorted uids + our new uid
      const value = stub.get(uuid)

      if (!value) throw { id: 'gInsert__invalid-sort-value', message: 'This uid does exist and we are trying to sort with it because of the sort index, maybe remove this uid', _errorData: { uid: uuid, edge, node } }
      if (!value[edge]) throw { id: 'gInsert__invalid-sort-edge', message: 'This uid does not have the edge we would like to sort by because of the sort index, maybe remove this uid', _errorData: { uid: uuid, edge, node } }
      else values.push([ uuid, value[edge] ]) // get what is in the database for each uid and store the uid and the edge
    }

    const sortedValues = values.sort((a, b) => Number(a[1] > b[1]) - Number(a[1] < b[1])) // order ascending 
    stub.set(sortKey, sortedValues.map(v => v[0])) // add sorted uids to database
  }

  
  stub.set(NODES_KEY, $nodes) // add $nodes to database
  return [ ...mapUids ] // return provided insert uids and database uids
}
