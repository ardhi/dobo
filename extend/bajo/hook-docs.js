/**
 * Available hooks for Dobo's operations. You can use these hooks to customize the behavior of the model's CRUD operations.
 *
 * For any of the hooks below, you can also use the `modelName` in camelCase format to create a model-specific hook. If you
 * choose to use this format, you must omit the first parameter (`model`) so that the hook function handler syntax will become like this:
 *
 * ```js
 * dobo.{modelName}:beforeCreateRecord (body, options)
 * dobo.{modelName}:afterCreateRecord (body, options)
 * dobo.{modelName}:beforeFindRecord (filter, options)
 * dobo.{modelName}:afterFindRecord (filter, result, options)
 * ...
 * ```
 *
 * You can use both formats simultaneously if you want. In that case, they will be executed in this order:
 * ```js
 * dobo:beforeCreateRecord (model, body, options)
 * dobo.{modelName}:beforeCreateRecord (body, options)
 * ...
 * dobo.{modelName}:afterCreateRecord (body, result, options)
 * dobo:afterCreateRecord (model, body, result, options)
 * ```
 *
 * For both formats, there are their counterparts that run deep inside the adapter.
 * Only use these hooks if you know what you are doing.
 *
 * Their syntax is similar to the above, with one exception: you need to put suffix `.adapter` after `dobo`:
 *
 * ```js
 * dobo.adapter:beforeAdapterCreateRecord (model, body, options)
 * dobo.adapter.{modelName}:beforeAdapterCreateRecord (body, options)
 * ```
 * @module Hook
 */
/**
 * Hook that is called before creating a record.
 *
 * @memberof module:Hook
 * @method
 * @async
 * @name dobo:beforeCreateRecord
 * @param {DoboModel} model - The model instance
 * @param {object} body - The body payload to be created
 * @param {DoboModel.TOptions} options - The options object
 */

/**
 * Hook that is called after creating a record.
 *
 * @memberof module:Hook
 * @method
 * @async
 * @name dobo:afterCreateRecord
 * @param {DoboModel} model - The model instance
 * @param {object} body - The body payload to be created
 * @param {DoboModel.TResultRecord} result - The result of the create operation
 * @param {DoboModel.TOptions} options - The options object
 */

/**
 * Hook that is called before finding records.
 *
 * @memberof module:Hook
 * @method
 * @async
 * @name dobo:beforeFindRecord
 * @param {DoboModel} model - The model instance
 * @param {DoboModel.TFilter} filter - The filter criteria to apply when finding records
 * @param {DoboModel.TOptions} options - The options object
 */

/**
 * Hook that is called after finding records.
 *
 * @memberof module:Hook
 * @method
 * @async
 * @name dobo:afterFindRecord
 * @param {DoboModel} model - The model instance
 * @param {DoboModel.TFilter} filter - The filter criteria applied when finding records
 * @param {DoboModel.TResultFindRecord} result - The result of the find operation
 * @param {DoboModel.TOptions} options - The options object
 */

/**
 * Hook that is called before finding one record.
 *
 * @memberof module:Hook
 * @method
 * @async
 * @name dobo:beforeFindOneRecord
 * @param {DoboModel} model - The model instance
 * @param {DoboModel.TFilter} filter - The filter criteria to apply when finding one record
 * @param {DoboModel.TResultFindRecord} result - The result of the find operation
 * @param {DoboModel.TOptions} options - The options object
 */

/**
 * Hook that is called after finding one record.
 *
 * @memberof module:Hook
 * @method
 * @async
 * @name dobo:afterFindOneRecord
 * @param {DoboModel} model - The model instance
 * @param {DoboModel.TFilter} filter - The filter criteria applied when finding one record
 * @param {DoboModel.TResultFindOneRecord} result - The result of the find one operation
 * @param {DoboModel.TOptions} options - The options object
 */

/**
 * Hook that is called before finding all records.
 *
 * @memberof module:Hook
 * @method
 * @async
 * @name dobo:beforeFindAllRecord
 * @param {DoboModel} model - The model instance
 * @param {DoboModel.TFilter} filter - The filter criteria to apply when finding all records
 * @param {DoboModel.TOptions} options - The options object
 */

/**
 * Hook that is called after finding all records.
 *
 * @memberof module:Hook
 * @method
 * @async
 * @name dobo:afterFindAllRecord
 * @param {DoboModel} model - The model instance
 * @param {DoboModel.TFilter} filter - The filter criteria applied when finding all records
 * @param {DoboModel.TResultFindAllRecord} result - The result of the find all operation
 * @param {DoboModel.TOptions} options - The options object
 */

/**
 * Hook that is called before updating a record.
 *
 * @memberof module:Hook
 * @method
 * @async
 * @name dobo:beforeUpdateRecord
 * @param {DoboModel} model - The model instance
 * @param {string|number} id - The ID of the record to be updated
 * @param {object} body - The body payload to be updated
 * @param {DoboModel.TOptions} options - The options object
 */

/**
 * Hook that is called after updating a record.
 *
 * @memberof module:Hook
 * @method
 * @async
 * @name dobo:afterUpdateRecord
 * @param {DoboModel} model - The model instance
 * @param {string|number} id - The ID of the record that was updated
 * @param {object} body - The body payload that was updated
 * @param {DoboModel.TResultUpdateRecord} result - The result of the update operation
 * @param {DoboModel.TOptions} options - The options object
 */

/**
 * Hook that is called before removing a record.
 *
 * @memberof module:Hook
 * @method
 * @async
 * @name dobo:beforeRemoveRecord
 * @param {DoboModel} model - The model instance
 * @param {string|number} id - The ID of the record to be removed
 * @param {DoboModel.TOptions} options - The options object
 */

/**
 * Hook that is called after removing a record.
 *
 * @memberof module:Hook
 * @method
 * @async
 * @name dobo:afterRemoveRecord
 * @param {DoboModel} model - The model instance
 * @param {string|number} id - The ID of the record that was removed
 * @param {DoboModel.TResultRemoveRecord} result - The result of the remove operation
 * @param {DoboModel.TOptions} options - The options object
 */

/**
 * Hook that is called before counting records.
 *
 * @memberof module:Hook
 * @method
 * @async
 * @name dobo:beforeCountRecord
 * @param {DoboModel} model - The model instance
 * @param {DoboModel.TFilter} filter - The filter criteria to apply when counting records
 * @param {DoboModel.TOptions} options - The options object
 */

/**
 * Hook that is called after counting records.
 *
 * @memberof module:Hook
 * @method
 * @async
 * @name dobo:afterCountRecord
 * @param {DoboModel} model - The model instance
 * @param {DoboModel.TFilter} filter - The filter criteria that was applied when counting records
 * @param {DoboModel.TResultCountRecord} result - The result of the count operation
 * @param {DoboModel.TOptions} options - The options object
 */

/**
 * Hook that is called before getting a record by ID.
 *
 * @memberof module:Hook
 * @method
 * @async
 * @name dobo:beforeGetRecord
 * @param {DoboModel} model - The model instance
 * @param {string|number} id - The ID of the record to be retrieved
 * @param {DoboModel.TOptions} options - The options object
 */

/**
 * Hook that is called after getting a record by ID.
 *
 * @memberof module:Hook
 * @method
 * @async
 * @name dobo:afterGetRecord
 * @param {DoboModel} model - The model instance
 * @param {string|number} id - The ID of the record that was retrieved
 * @param {DoboModel.TResultGetRecord} result - The result of the get operation
 * @param {DoboModel.TOptions} options - The options object
 */

export default {}
