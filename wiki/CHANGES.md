# Changes

## 2026-02-17

- [2.6.5] Bug fix on model extender
- [2.6.5] Bug fix on trace logging
- [2.6.6] Bug fix on extender indexes

## 2026-02-05

- [2.6.4] Bug fix on driver options, ```noCheckUnique``` must be perform in ```create```, ```update``` and ```upsert```

## 2026-02-03

- [2.6.3] Bug fix on ```model.sanitizeRecord()```

## 2026-02-02

- [2.6.2] Bug fix on query & search resolver: Do not remove old query/search, should always copied to oldQuery/oldSearch

## 2026-02-01

- [2.6.0] Add ```model.scanables``` for fields that can participate in table scans if necessary
- [2.6.0] Add ```driver.support.search``` for driver's fulltext search support
- [2.6.0] Add model hooks ```before/afterBuildQuery/Search```

## 2026-01-30

- [2.5.0] Add feature to push custom ```options._data```. If provided, this will be used instead of auto generated one.
- [2.5.0] Remove ```silent``` in ```options``` object
- [2.5.1] Driver now support ```this.useUtc``` for database that store values in UTC string
- [2.5.1] Bug fix on ```driver.sanitizeRecord()```

## 2026-01-29

- [2.4.0] Add ```bulkCreateRecords()``` on model & driver
- [2.4.0] Add ```execModelHook()```
- [2.4.0] Bug fix on models collection
- [2.4.0] Add ```DoboAction``` to the ```app.baseClass```
- [2.4.0] ```findAllRecord()``` can't be called as action

## 2026-01-26

- [2.3.1] Bug fix if reference model isn't loaded only yield warning
- [2.3.1] Bug fix on fetching multi references

## 2026-01-24

- [2.3.0] Add ```dynHooks``` to model's options
- [2.3.0] Add ```dobo:unique``` feature
- [2.3.0] Add ```noWait``` handler for model's hook

## 2026-01-21

- [2.2.5] Add ```proto``` to ```connection.options```

## 2026-01-19

- [2.2.4] Bug fix on route ```dobo:/attachment/...```

## 2026-01-18

- [2.2.2] Revert back to ```mingo@6.5.1``` because of bugs in ```skip``` operation
- [2.2.3] Bug fix on driver's ```sanitizeBody()```

## 2026-01-16

- [2.2.1] Bug fix on model references

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