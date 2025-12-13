# Query Language

Since *dobo* use [Ghost QL](https://github.com/TryGhost/NQL) for its query language, you have the option to pick one of these syntaxes:

- [NQL](https://github.com/TryGhost/NQL/tree/main/packages/nql)
- [Mongo QL](https://www.mongodb.com/docs/manual/tutorial/query-documents/)

Any NQL statements will be converted to MongoDB-like QL object first, this then passed down to the database's native QL provided by its driver.

Examples from [NQL test suite](https://github.com/TryGhost/NQL/blob/main/packages/nql-lang/test/parser.test.js):

## Equals

count:5
```javascript
{ count: 5 }
```

slug:getting-started
```javascript
{ slug: 'getting-started' }
```

author:'Joe Bloggs'
```javascript
{ author: 'Joe Bloggs' }
```

## Not Equals
count:-5
```javascript
{ count: { $ne: 5 } }
```

author:-'Joe Bloggs'
```javascript
{ author: { $ne: 'Joe Bloggs' } }
```

## Less/Greater Than or Equals

count:>5
```javascript
{ count: { $gt: 5 } }
```
tag:<getting-started
```javascript
{ tag: { $lt: 'getting-started' } }
```
count:>=5
```javascript
{ count: { $gte: 5 } }
```
author:<=\'Joe Bloggs\'
```javascript
{ author: { $lte: 'Joe Bloggs' } }
```

## IN or NOT IN, single or multiple value

count:[5]
```javascript
{ count: { $in: [5] } }
```

tag:-[getting-started]
```javascript
{ tag: { $nin: ['getting-started'] } }
```

author:-['Joe Bloggs', 'John O\\'Nolan', 'Hello World']
```javascript
{ author: { $nin: ['Joe Bloggs', 'John O\'Nolan', 'Hello World'] } }
```

## CONTAINS, STARTSWITH and ENDSWITH with and without NOT

email:~'gmail.com'
```javascript
{ email: { $regex: /gmail\.com/i } }
```

email:-~'gmail.com'
```javascript
{ email: { $not: /gmail\.com/i } }
```

email:~^'gmail.com'
```javascript
{ email: { $regex: /^gmail\.com/i } }
```

email:-~^'gmail.com'
```javascript
{ email: { $not: /^gmail\.com/i } }
```

email:~$'gmail.com'
```javascript
{ email: { $regex: /gmail\.com$/i } }
```

email:-~$'gmail.com'
```javascript
{ email: { $not: /gmail\.com$/i } }
```

## NULL and Boolean Value

image:null
```javascript
{ image: null }
```

featured:false
```javascript
{ featured: false } }
```

featured:-true
```javascript
{ featured: { $ne: true } }
```

## Logical Operators

page:false+status:published
```javascript
{ $and: [{ page: false }, { status: 'published' }] }
```

page:true,featured:true
```javascript
{ $or: [{ page: true }, { featured: true }] }
```

## Groups/ungroups

(page:false,(status:published+featured:true))
```javascript
{
  $or: [
    { page: false },
    {
      $and: [
          {status: 'published'},
          {featured: true}
      ]
    }
  ]
}
```
