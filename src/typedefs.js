import { enumIndices } from './enumIndices.js'
import { enumDataTypes } from './enumDataTypes.js'


/**
 * @typedef { object } $gQueryFormatStandard
 * @property { boolean } [ uid ]
 * @property { number } [ $start ]
 */


/**
 * @typedef { object } $gQueryFormatAllowCount
 * @property { number } [ $count ]
 * @property { never } [ $end ]
 */

/**
 * @typedef { object } $gQueryFormatAllowEnd
 * @property { never } [ $count ]
 * @property { number } [ $end ]
 */

/**
 * @typedef { object } $gNodeStandard
 * @property { string } [ uid ]
 */


/** User Start */
/**
 * @typedef { object } $gUserProperties
 * @property { string } [ firstName ]
 * @property { string } [ email ]
 * @property { number } [ age ]
 * @property { gUser } [ child ]
 * @property { gUser } [ parent ]
 * @property { gSession[] } [ sessions ]
 * @typedef { $gUserProperties & $gNodeStandard } gUser
 */

/**
 * @typedef { object } $gUserQueryFormatStandard
 * @property { (user: gUser) => boolean } [ $filter ]
 * @property { 'firstName' | 'email' | 'age' } [ $asc ]
 * @property { 'firstName' | 'email' | 'age' } [ $dsc ]
 * @property { boolean } [ firstName ]
 * @property { boolean } [ email ]
 * @property { boolean } [ age ]
 * @property { $gUserQueryFormat } [ child ]
 * @property { $gUserQueryFormat } [ parent ]
 * @property { $gSessionQueryFormat } [ sessions ]
 */

/**
 * @typedef { $gUserQueryFormatStandard & $gQueryFormatStandard & $gQueryFormatAllowCount } $gUserQueryFormatAllowCount
 * @typedef { $gUserQueryFormatStandard & $gQueryFormatStandard & $gQueryFormatAllowEnd } $gUserQueryFormatAllowEnd
 * @typedef { $gUserQueryFormatAllowCount | $gUserQueryFormatAllowEnd } $gUserQueryFormat
 */


/**
 * @typedef { object } $gUserQueryStandard
 * @property { 'User' } node
 * @property { $gUserQueryFormat } format
 */

/**
 * @typedef { Object } $gUserQueryAllowExactProperties
 * @property { [ 'email', string ] } [ exact ]
 * @property { never } [ uid ]
 * @typedef { $gUserQueryAllowExactProperties & $gUserQueryStandard } $gUserQueryAllowExact
 *
 * @typedef { Object } $gUserQueryAllowUidProperties
 * @property { never } [ exact ]
 * @property { string } [ uid ]
 * @typedef { $gUserQueryAllowUidProperties & $gUserQueryStandard } $gUserQueryAllowUid
 * 
 * @typedef { $gUserQueryAllowExact | $gUserQueryAllowUid } $gUserQuery
 */
/** User End */


/** Session Start */
/**
 * @typedef { object } $gSessionProperties
 * @property { string } [ ipAddress ]
 * @property { gUser } [ user ]
 * @typedef { $gSessionProperties & $gNodeStandard } gSession
 */

/**
 * @typedef { object } $gSessionQueryFormatStandard
 * @property { (session: gSession) => boolean } [ $filter ]
 * @property { 'ipAddress' } [ $asc ]
 * @property { 'ipAddress' } [ $dsc ]
 * @property { boolean } [ ipAddress ]
 * @property { $gUserQueryFormat } [ user ]
 */

/**
 * @typedef { $gSessionQueryFormatStandard & $gQueryFormatStandard & $gQueryFormatAllowCount } $gSessionQueryFormatAllowCount
 * @typedef { $gSessionQueryFormatStandard & $gQueryFormatStandard & $gQueryFormatAllowEnd } $gSessionQueryFormatAllowEnd
 * @typedef { $gSessionQueryFormatAllowCount | $gSessionQueryFormatAllowEnd } $gSessionQueryFormat
 */

/**
 * @typedef { object } $gSessionQuery
 * @property { 'Session' } [ node ]
 * @property { never } [ exact ]
 * @property { string } [ uid ]
 * @property { $gSessionQueryFormat } format
 */
/** Session End */


/**
 * @typedef { 'User' | 'Session' } $gNodes
 * @typedef { $gUserQuery | $gSessionQuery } $gQuery
 */


/**
 * @typedef { object } $gAddDataMetaFormatOptions
 * @property { number } [ start ]
 * @property { number } [ end ]
 * @property { number } [ count ]
 * @property { $gSortMeta } [ sortMeta ]
 */

/**
 * @typedef { object } $gAddDataMeta
 * @property { any } rNode - Response for this node
 * @property { $gAddDataMetaFormatOptions } formatOptions
 */

/**
 * @typedef { object } $gSortMeta
 * @property { '$asc' | '$dsc' } edge
 * @property { string } edgeValue
 */

/**
 * @typedef { object } $gQueryResponse
 * @property { any } object
 * @property { any[] } array
 */


/** SCHEMA */
/**
 * @typedef { object } $gSchemaEdgeValue
 * @property { enumDataTypes } dataType
 * @property { enumIndices[] } [ indices ]
 * 
 * @typedef { { [ k: string ]: $gSchemaEdgeValue } } $gSchemaNode
 * @typedef { { [ k: string ]: $gSchemaNode } } $gSchema
 */

export {}
