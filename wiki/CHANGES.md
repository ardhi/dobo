# Changes

## 2026-05-29

- [2.26.1] Bug fix in ```model.createRecord()```
- [2.26.1] Bug fix in ```model.updateRecord()```
- [2.26.1] Bug fix in ```model.upsertRecord()```
- [2.26.1] Bug fix in ```model.removeRecord()```
- [2.26.4] Bug fix in ```model.listAttachment()```

## 2026-05-26

- [2.26.0] Add loading multiple model schema as in one ```model.js``` file
- [2.26.0] Remove caching feature of model schema
- [2.26.0] Change driver hook name with this syntax: ```dobo.driver:<action>```
- [2.26.1] Bug fix in ```memory.js```
- [2.26.2] Bug fix in ```driver.js```

## 2026-05-22

- [2.25.0] Add ```array``` & ```object``` validator handling
- [2.25.0] Change ```interSite``` definition to ```xSite```
- [2.25.0] Add ```model.getNonVirtualProperties()```
- [2.25.0] Bug fix in ```model.loadFixtures()```
- [2.25.0] Handle ```array``` validation schema

## 2026-05-16

- [2.24.0] Change ```dobo:immutable``` feature, field no longer hidden
- [2.24.0] Add ```dobo:[before|after]Driver<Action>``` hook
- [2.24.0] Add ```dobo.<modelName>:[before|after]Driver<Action>``` hook
- [2.24.0] Change ```model._simpleLookup()```
- [2.24.0] Remove ```dobo:[before|after]Build[Query|Search]``` hook
- [2.24.0] Change ```model.loadFixtures()```
- [2.24.0] Bugfix in ```model.sanitizeBody()```
- [2.24.0] Add ```dobo:afterTransaction``` hook
- [2.24.0] Add ```dobo.<modelName>:afterTransaction``` hook

## 2026-05-11

- [2.23.0] Add ```beforeBulkCreate``` model hook on ```dobo:unique``` feature
- [2.23.0] Add ```beforeBulkCreate``` model hook on ```dobo:updatedAt``` feature
- [2.23.0] Add ```beforeBulkCreate``` model hook on ```dobo:unique``` feature
- [2.23.0] Add ```connection.initDriver()```
- [2.23.0] Move ```model.file``` in model definition to ```model.options.file```
- [2.23.0] Move ```model.attachment``` in model definition to ```model.options.attachment```
- [2.23.0] Add ```model.buildStart()``` and ```model.buildEnd()``` in model definition
- [2.23.0] Add ```null``` driver
- [2.23.0] Add ```model.syncIdField()```
- [2.23.0] Rename method to ```model.bulkCreateRecord``` instead ```bulkCreateRecords```. The later name now serve only as alias
- [2.23.0] Remove ```getSingleRef()``` and ```getMultiRefs()```, use ```getRefs()``` instead
- [2.23.0] Add reference support for ```array``` column type
- [2.23.0] Bug fix in ```model.findAllRecord()```, now use correctly hook names
- [2.23.0] Bug fix in ```model.sanitizeBody()```
- [2.23.0] Bug fix in ```model.sanitizeRecord()```

## 2026-05-03

- [2.22.1] Bug fix in ```dobo:image``` feature

## 2026-05-02

- [2.22.0] Add auto thumbnail creation when image attachment is uploaded
- [2.22.0] Add feature to get the thumbnail instead of attachment file in attachment route
- [2.22.0] Add ```dobo:image``` feature
- [2.22.0] Bug fix in ```model.createRecord()```
- [2.22.0] Bug fix in ```model.updateRecord()```
- [2.22.0] Bug fix in ```model.upsertRecord()```
- [2.22.0] Bug fix in ```model.removeRecord()```
- [2.22.0] Remove attachment now also remove corresponding thumbnails

## 2026-04-28

- [2.21.1] Bug fix in ```collect-models.js```
- [2.21.1] Bug fix in ```driver._updateRecord()```
- [2.21.1] Bug fix in ```util.getMultiRef()```
- [2.21.1] Bug fix in setting references
- [2.21.1] Bug fix in ```model.sanitizeRecord()```

## 2026-04-25

- [2.21.0] Change ```options.formatValue``` to ```options.fmt```
- [2.21.0] Remove ```options.retainOriginalValue``` since it is not needed anymore
- [2.21.0] Remove ```formatValue``` altogether
- [2.21.0] Remove ```record._orig```, in exchange switch the formatted value to ```record._fmt```
- [2.21.0] Add ```property.virtual``` to set property is a virtual/calculated property
- [2.21.0] Add necessary safe guards for virtual property
- [2.21.0] Add ```model.getProperties()```
- [2.21.0] Add ```model.getIndexes()```
- [2.21.0] Add ```model.getVirtualPropertties()```
- [2.21.0] Activate transaction on ```loadFixtures()```

## 2026-04-23

- [2.20.1] Bug fix in ```collect-models.js```, now with deep merge in advance

## 2026-04-21

- [2.19.1] Bug fix in ```collect-models.js```, now values are sanitized with ```parseObject()```
- [2.19.1] Bug fix in ```options.dataOnly``` on all model methods
- [2.19.1] Add ```options.noMagic```
- [2.20.0] Revert back to NOT using hooks for caching

## 2026-04-19

- [2.19.0] Add ```queryAny()``` for query using model's scanables fields
- [2.19.0] Bug fix in ```reviveRegexInJson()```
- [2.19.0] Bug fix in query sanitizing especially for regex existance
- [2.19.0] Remove ```replaceIdInQuerySearch()``` in ```_util.js``` as it isn't needed anymore

## 2026-04-18

- [2.18.2] Bug fix in ```config``` object
- [2.18.2] Bug fix in ```getDefaultValues```
- [2.18.2] Bug fix in ```sanitizeProp()``` in ```collect-models.js```
- [2.18.2] Bug fix in ```sanitizeRecord()``` for prop with ```format``` set to ```false```

## 2026-04-17

- [2.18.1] Bug fix in ```model.createAttachment()```
- [2.18.1] Bug fix in ```model.sanitizeBody()```
- [2.18.1] Bug fix in ```model.sanitizeRecord()```

## 2026-04-16

- [2.18.0] Add parameter options to ```sanitizeObject()```
- [2.18.0] Rewrite ```dobo:dt``` feature to support customization
- [2.18.0] Bug fix in ```model.createRecord()```
- [2.18.0] Changes in ```model.sanitizeBody()``` to throw error with payload details
- [2.18.0] Changes in ```model.sanitizeRecord()``` to support ```options.retainOriginalValue```
- [2.18.0] Bug fix in ```model.updateRecord()```
- [2.18.0] Bug fix in ```model.upsertRecord()```

## 2026-04-13

- [2.17.0] Add ```{ strict }``` as parameter to ```sanitizeObject()```

## 2026-04-11

- [2.16.0] Add ```format``` as new model's property key
- [2.16.0] Rewrite ```getDefaultValues()``` to base on ```req.getSetting()```
- [2.16.0] All inter site admins are now exempts from ```immutable``` row
- [2.16.0] Bug fix in ```collect-models.js```
- [2.16.0] Bug fix in ```getRefs()``` and ```getRefs()```
- [2.16.0] Add feature to return formatted row(s) with ```options.formatValue```
- [2.16.0] If row is formatted, add feature to save original row in ```_orig``` with ```options.retainOriginalValue```

## 2026-04-07

- [2.15.0] Add ```parseNql()```
- [2.15.0] Add ```parseQuery()```
- [2.15.0] Add ```replaceRegexInJson()```
- [2.15.0] Add ```reviveRegexInJson()```
- [2.15.0] Change all ```opts.fieldName``` to ```opts.field``` in features
- [2.15.0] Add ```ref.searchField``` in model reference
- [2.15.0] Add ```ref.labelField``` in model reference
- [2.15.0] Add ```ref.valueField``` in model reference
- [2.15.0] change ```ref.propName``` to ```ref.field``` in model reference

## 2026-04-02

- [2.14.1] Bug fix in ```hardCap```
- [2.14.1] ```warnings``` now can be turned off through ```config``` or site settings

## 2026-04-01

- [2.14.0] Add ```between``` as custom query, since it doesn't exists in NQL

## 2026-03-30

- [2.12.0] Add ```.bootorder``` level 10
- [2.12.0] Bug fix in ```model._simpleLookup()```
- [2.12.0] Add model name in validation error's payload
- [2.13.0] Add ```hardCap``` support

## 2026-03-26

- [2.11.4] Exceptions thrown in ```getRefs()``` && ```getRefs()``` will be catched and are ignored

## 2026-03-25

- [2.11.2] Bug fix in result sets cache
- [2.11.3] Bug fix in cache handling if ```bajoCache``` isn't loaded

## 2026-03-17

- [2.11.1] Bug fix on ```model.validate()```: if ```partial``` is true, set ```fields``` from ```body``` keys

## 2026-03-16

- [2.11.0] Attachment can now listed by its type (```image```, ```video```, etc)
- [2.11.0] Add ```_last``` to autodetect last item in list in ```@id.js```

## 2026-03-12

- [2.10.1] Bug fix in ```model._simpleLookup()``` should return ```null``` if query results empty value

## 2026-03-11

- [2.10.0] Add ```immutable``` and ```feature``` to the list of allowed property keys
- [2.10.0] Set ```property.feature``` to the name of feature name if property is build using ```feature```
- [2.10.0] Add ```model._simpleLookup()```
- [2.10.0] Refactor ```model.loadFixtures()```
- [2.10.0] Add ```property.immutable``` for property that can't be updated

## 2026-03-09

- [2.9.3] Bug fix in ```model.findAllRecord```

## 2026-03-07

- [2.9.2] Bug fix in ```model.loadFixtures()```
- [2.9.2] Bug fix in ```collect-connections.js```

## 2026-03-06

- [2.9.1] Bug fix in ```model.sanitizeBody()```

## 2026-03-05

- [2.9.0] Add transaction support with ```model.transaction()``` wrapper
- [2.9.0] Add property ```driver.support.transaction``` to indicate a driver is fully support transaction or not
- [2.9.0] Add property ```connection.options.connName```

## 2026-02-25

- [2.8.3] Bug fix in attachment route

## 2026-02-24

- [2.8.2] Bug fix in field type ```textType```
- [2.8.2] Bug fix in ```collect-models.js``` when empty model is returned

## 2026-02-23

- [2.8.1] Bug fix in ```memory._getCursor()```
- [2.8.1] Bug fix in ```model.upsertRecord()```

## 2026-02-22

- [2.8.0] Add ```warnings``` to response object
- [2.8.0] Throw error if ```page``` above the allowed threshold

## 2026-02-20

- [2.7.0] Add ```prop.values``` support
- [2.7.0] Add ```prop.rulesMsg``` support
- [2.7.0] Change ```buildFromDbModel()``` on validation to async function

## 2026-02-17

- [2.6.5] Bug fix in model extender
- [2.6.5] Bug fix in trace logging
- [2.6.6] Bug fix in extender indexes

## 2026-02-05

- [2.6.4] Bug fix in driver options, ```noCheckUnique``` must be perform in ```create```, ```update``` and ```upsert```

## 2026-02-03

- [2.6.3] Bug fix in ```model.sanitizeRecord()```

## 2026-02-02

- [2.6.2] Bug fix in query & search resolver: Do not remove old query/search, should always copied to oldQuery/oldSearch

## 2026-02-01

- [2.6.0] Add ```model.scanables``` for fields that can participate in table scans if necessary
- [2.6.0] Add ```driver.support.search``` for driver's fulltext search support
- [2.6.0] Add model hooks ```before/afterBuildQuery/Search```

## 2026-01-30

- [2.5.0] Add feature to push custom ```options._data```. If provided, this will be used instead of auto generated one.
- [2.5.0] Remove ```silent``` in ```options``` object
- [2.5.1] Driver now support ```this.useUtc``` for database that store values in UTC string
- [2.5.1] Bug fix in ```driver.sanitizeRecord()```

## 2026-01-29

- [2.4.0] Add ```bulkCreateRecord()``` on model & driver
- [2.4.0] Add ```execModelHook()```
- [2.4.0] Bug fix in models collection
- [2.4.0] Add ```DoboAction``` to the ```app.baseClass```
- [2.4.0] ```findAllRecord()``` can't be called as action

## 2026-01-26

- [2.3.1] Bug fix if reference model isn't loaded only yield warning
- [2.3.1] Bug fix in fetching multi references

## 2026-01-24

- [2.3.0] Add ```dynHooks``` to model's options
- [2.3.0] Add ```dobo:unique``` feature
- [2.3.0] Add ```noWait``` handler for model's hook

## 2026-01-21

- [2.2.5] Add ```proto``` to ```connection.options```

## 2026-01-19

- [2.2.4] Bug fix in route ```dobo:/attachment/...```

## 2026-01-18

- [2.2.2] Revert back to ```mingo@6.5.1``` because of bugs in ```skip``` operation
- [2.2.3] Bug fix in driver's ```sanitizeBody()```

## 2026-01-16

- [2.2.1] Bug fix in model references

## 2026-01-11

- [2.2.0] Any driver that support memory DB can now declare itself as in-memory DB and be handled as such
- [2.2.0] ```driver.init()``` is removed, and driver should solely use ```driver.createClient()``` instead
- [2.2.0] Bug fixes

## 2026-01-07

- [2.2.0] Add ```immutable``` feature
- [2.2.0] Lots of bug fixes

## 2025-12-28

- [2.2.0] Add ```calcAggregate()``` & ```calcHistogram()``` for array of data objects
- [2.2.0] Implement ```createAggregate()``` & ```createHistogram()``` to the built-in memory database driver
- [2.2.0] If no ```default``` connection found, all models automatically bound to ```memory``` connection

## 2025-12-22

- [2.2.0] Introduce Action class that enables you to work on models with chainable methods
- [2.2.0] All base class definitions moved now to ```this.baseClass``` instead of ```this.lib```

## 2025-12-16

- [2.2.0] Upgrade mingo to 7.1.0

## 2025-12-14

- [2.2.0] Drop Model class, replace as Model class

## 2025-12-10

- [2.2.0] Rewrite the whole thing into class based modules: Connection, Driver, Feature, Model. Dobo will solely serve as DB Manager in the future

## 2025-12-05
- [2.2.0] Connection now saved in ```this.connections``` as ```Connection``` instance

## 2025-12-03

- [2.1.0] Upgrade joi to 18.0.2
- [2.1.0] Upgrade mingo to 7.0.2
- [2.1.0] Feature now saved in ```this.features``` as ```Feature``` instance
- [2.1.0] Driver now saved in ```this.drivers``` as ```Driver``` instance
- [2.1.0] Add ```this.getDriver()```. Accept short name or NsPath format