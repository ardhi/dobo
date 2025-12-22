# Changes

## 2025-12-22

- [2.2.0] Introduce Action class that enables you to work on models with chainable methods

## 2025-12-16

- [2.2.0] Upgrade mingo to 7.1.0

## 2025-12-14

- [2.2.0] Drop Schema class, replace as Model class

## 2025-12-10

- [2.2.0] Rewrite the whole thing into class based modules: Connection, Driver, Feature, Schema. Dobo will solely serve as DB Manager in the future

## 2025-12-05
- [2.2.0] Connection now saved in ```this.connections``` as ```Connection``` instance

## 2025-12-03

- [2.1.0] Upgrade joi to 18.0.2
- [2.1.0] Upgrade mingo to 7.0.2
- [2.1.0] Feature now saved in ```this.features``` as ```Feature``` instance
- [2.1.0] Driver now saved in ```this.drivers``` as ```Driver``` instance
- [2.1.0] Add ```this.getDriver()```. Accept short name or NsPath format