# Config Object

| Key Name | Type | Default | Description |
| ------- | ---- | ----- | ----------- |
| ```connections``` | ```array``` | ```[]``` | Connection object |
| ```validationParams``` | ```object``` | | Defaults to [Joi validate's](https://joi.dev/api/?v=17.13.3#anyvalidateasyncvalue-options) options |
| &nbsp;&nbsp;&nbsp;&nbsp;```abortEarly``` | ```boolean``` | ```false``` | |
| &nbsp;&nbsp;&nbsp;&nbsp;```convert``` | ```boolean``` | ```false``` | |
| &nbsp;&nbsp;&nbsp;&nbsp;```allowUnknown``` | ```boolean``` | ```true``` | |
| ```default``` | ```object``` | | default values |
| &nbsp;&nbsp;&nbsp;&nbsp;```property``` | ```object``` | | |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;```text``` | ```object``` | | |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;```textType``` | ```string``` | ```text``` | Allowed values: ```text```, ```mediumtext```, or ```longtext``` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;```string``` | ```object``` | | |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;```length``` | ```number``` | ```50``` | |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;```filter``` | ```object``` | | |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;```limit``` | ```number``` | ```25``` | Rows returned in one page |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;```maxLimit``` | ```number``` | ```200``` | Max rows returned in one page |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;```hardLimit``` | ```number``` | ```10000``` | Max rows returned on dataset export |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;```sort``` | ```array``` | | |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;```idField``` | ```object``` | | |
| ```memDb``` | ```object``` | | |
| &nbsp;&nbsp;&nbsp;&nbsp;```createDefConnAtStart``` | ```boolean``` | ```true``` | |
| &nbsp;&nbsp;&nbsp;&nbsp;```persistence``` | ```object``` | | |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;```syncPeriodDur``` | ```string | number``` | ```1s``` | |
