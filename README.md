# AsyncAPI 2.x to Postman Collection v2.1.0 Converter

## Installation

```
npm i asyncapi-to-postman
```

## Usage as a Node.js module

```js
const a2p = require('asyncapi-to-postman')

const asyncapiYAML = `asyncapi: 2.1.0
info:
  title: Basic YAML
  version: 1.0.0
  description: A basic YAML AsyncAPI file

servers:
  dev:
    url: ws://localhost:3000
    protocol: ws

channels:
  test:
    publish:
      message:
        payload:
          type: object
          additionalProperties: false
          properties:
            testProp:
              type: string`

const options = {
  parser: {...}, // AsyncAPI parser options.
  serverName: 'dev', // Name of the AsyncAPI server to target.
}

const collection = await a2p.convert(asyncapiYAML, options)

// Or using promises syntax:

a2p
  .convert(asyncapiYAML, options)
  .then(collection => {
    // Do your stuff with the collection
  })
  .catch(console.error)
```

For more information about the AsyncAPI parser options, see its [API documentation](https://github.com/asyncapi/parser-js/blob/master/API.md#module_@asyncapi/parser..parse).

The returned `collection` is an instance of the [Postman SDK Collection object](https://www.postmanlabs.com/postman-collection/Collection.html).

## Limitations

### Postman Collection Auth

Only the first security scheme of the first provided server is included in the resulting collection. This is a limitation of the [Postman Collection specification](https://schema.postman.com/collection/json/v2.1.0/draft-07/docs/index.html).

## Mapping

|Postman|AsyncAPI|
|---|---|
|Collection Name|info.title|
|Collection Version|info.version|
|Collection Description|info.description|
|Collection Variables|servers.variables + channels.parameters|
|Collection Auth|servers[0].security[0]|
|Item Name|`Publish to ` + channel name|
|Item Id|channel.publish.operationId &vert;&vert; `publish-to-` + channel name|
|Request URL|server.url + channel name|
|Request Method| _(based in server.protocol)_|
|Request Body| _(based in channel.publish.message.payload)_|
|Request Headers| _(based in channel.publish.message.headers)_|
|Request Description| channel.publish.description |
