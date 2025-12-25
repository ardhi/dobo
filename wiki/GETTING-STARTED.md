# Getting Started

> If you're new to the [Dobo DBMS](https://ardhi.github.io/dobo), we recommend you to read and follow along with [Bajo Tutorial](https://ardhi.github.io/bajo/tutorial-01-getting-started.html) first, as this document is the continuation of it

**Dobo** is the Bajo sub-framework developed specifically to handle database management. In this tutorial, we'll go over how to install the necessary packages and interact with them.

Here is some basic knowledge about Dobo you need to be familiar with:

- All record-related actions mimic REST API methods: *find* records, *get* a particular record by its ID, *create* a new record, *update* an existing record by ID and payload, and *remove* an existing record by its ID.
- A Dobo model requires a predefined model. Even if you use a NoSQL database, you still need to write a model.
- There are two main groups of methods to be familiar with:
  - ```dobo.model{Action}``` methods manage everything related to model management, such as table creation or deletion.
  - ```dobo.record{Action}``` methods handle record manipulation.
- A record in Bajo always needs to have an ID. The ID can be alphanumeric characters or an integer, and it is defined by the underlying driver used by the model.

For more info about Dobo, please [click here](https://ardhi.github.io/dobo).

### Installation

As you might have guessed, Dobo and its drivers are normal Bajo plugins. Although [many drivers](https://github.com/ardhi/dobo/tutorials/drivers.md) exist, for this tutorial, we'll only use SQLite 3, which is provided by the dobo-knex driver.

Now, please install the required plugins and SQLite drivers first:

```bash
$ npm install dobo dobo-knex sqlite3
```

Don't forget to add ```dobo``` and ```dobo-knex``` to the ```data/config/.plugins``` file.

### Model

Let's pretend we're building an address book with fields like name, age, phone, etc. This entity needs to be modeled with a model and then "connected" to a database:

1. Create ```main/extend/dobo/model/address-book.json``` file.
2. Enter the following model:
   ```json
   {
     "properties": [{
       "name": "firstName",
       "type": "string",
       "maxLength": 20,
       "required": true,
       "index": true
     },
       "lastName::20:true:true",
       "age:smallint",
       "phone::20:true:true",
       "email::50:true"
     ],
     "feature": {
       "createdAt": true,
       "updatedAt": true
     }
   }
   ```
   You should notice here that in properties you can use either the verbose, full-object syntax or the string-based one. Please visit the Dobo documentation to learn more.

3. Create ```main/extend/dobo/fixture/address-book.json``` file. Fixtures allow you to quickly fill your database with predefined records. It's not required, but it helps a lot with prototyping.
   ```json
   [{
     "firstName": "James",
     "lastName": "Bond",
     "phone": "+44-007"
   }, {
     "firstName": "Felix",
     "lastName": "Leiter",
     "age": 50,
     "phone": "+1-0000001"
   }]
   ```
4. By default, all models are connected to a database connection named ```default```. Now let's create this connection by creating ```data/config/dobo.json``` file:

   ```json
   {
     "connections": [{
       "name": "default",
       "type": "knex:sqlite3",
       "connection": {
         "filename": "my-project.sqlite3"
       }
     }]
   }
   ```
5. That's all there is to it. Now you need to build this model like this:
   ```
   $ node index.js -a dobo:modelRebuild MainAddressBook
   ℹ App runs in applet mode
   ╭ Model (1) ──────╮
   │ MainAddressBook  │
   ╰──────────────────╯
   ✔ The above mentioned model(s) will be rebuilt as model. Continue? Yes
   ✔ Model 'MainAddressBook' successfully created
   ℹ Done! Succeded: 1, failed: 0, skipped: 0
   ✔ Fixture on 'MainAddressBook': added 2, rejected: 0
   ```
6. Done!

Note: Although you can use YAML or TOML for models/fixtures, it's recommended to stick with JSON because it's always supported and doesn't require an extra plugin.

Dobo models are by default always named with ```{Alias}{ModelName}```, which is a pascal-cased plugin alias and base name from your model file. For field names, Dobo use camel-cased names as a convention. You can change this behavior to match your needs, but it is suggested that you're keeping these conventions at least for this tutorial.

### Applets

Dobo provides you with a number of applets that will help you manipulate models and records directly. This means you don't have to touch your tables and databases directly through SQL statements or NoSQL procedures ever again. Everything can be managed through one common syntax provided by Dobo, regardless of your backend type.

First, let's try to list records:

```bash
$ node index.js -a dobo:recordFind MainAddressBook
ℹ App runs in applet mode
✔ Please enter your query (if any):
✔ Done
┌────┬───────────┬──────────┬─────┬────────────┬───────┬──────────────────────────┬──────────────────────────┐
│ id │ firstName │ lastName │ age │ phone      │ email │ createdAt                │ updatedAt                │
├────┼───────────┼──────────┼─────┼────────────┼───────┼──────────────────────────┼──────────────────────────┤
│ 2  │ Felix     │ Leiter   │ 50  │ +1-0000001 │       │ 2025-09-18T13:47:29.296Z │ 2025-09-18T13:47:29.296Z │
├────┼───────────┼──────────┼─────┼────────────┼───────┼──────────────────────────┼──────────────────────────┤
│ 1  │ James     │ Bond     │     │ +44-007    │       │ 2025-09-18T13:47:29.280Z │ 2025-09-18T13:47:29.280Z │
└────┴───────────┴──────────┴─────┴────────────┴───────┴──────────────────────────┴──────────────────────────┘
```

Now, add a new record:

```bash
$ node index.js -a dobo:recordCreate MainAddressBook
ℹ App runs in applet mode
✔ Enter JSON payload: { "firstName": "Miss", "lastName": "Moneypenny" }
╭ MainAddressBook ────────────╮
│ {                           │
│   "firstName": "Miss",      │
│   "lastName": "Moneypenny"  │
│ }                           │
╰─────────────────────────────╯
✖ Error: Validation Error
✔ Enter JSON payload: { "firstName": "Miss", "lastName": "Moneypenny", "phone": "+44-111" }
╭ MainAddressBook ─────────────╮
│ {                            │
│   "firstName": "Miss",       │
│   "lastName": "Moneypenny",  │
│   "phone": "+44-111"         │
│ }                            │
╰──────────────────────────────╯
✔ Done
┌───────────┬──────────────────────────┐
│ id        │ 3                        │
├───────────┼──────────────────────────┤
│ firstName │ Miss                     │
├───────────┼──────────────────────────┤
│ lastName  │ Moneypenny               │
├───────────┼──────────────────────────┤
│ age       │                          │
├───────────┼──────────────────────────┤
│ phone     │ +44-111                  │
├───────────┼──────────────────────────┤
│ email     │                          │
├───────────┼──────────────────────────┤
│ createdAt │ 2025-09-18T14:38:11.933Z │
├───────────┼──────────────────────────┤
│ updatedAt │ 2025-09-18T14:38:11.933Z │
└───────────┴──────────────────────────┘
```

As you can see, Dobo is smart enough to reject any payload that isn't right. In this case, we forgot to include the phone number since according to the model, this field is defined as required.

You can now try all of Dobo's other applets. [This page](https://github.com/ardhi/dobo/tutorials/applets) provides its complete list.

