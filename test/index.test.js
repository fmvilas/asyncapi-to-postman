const { option: fakerOptions } = require('json-schema-faker')
const { convert } = require('../src')

fakerOptions({
  random: () => 0.2 // Avoid random values in tests
})

const basicYAML = `asyncapi: 2.1.0
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

const exampleYAML = `asyncapi: 2.1.0
info:
  title: Example YAML
  version: 1.0.0
  description: An example YAML AsyncAPI file

servers:
  dev:
    url: 'ws://localhost:{port}'
    protocol: ws
    variables:
      port:
        enum: ['3000', '5000']
        description: The port where server should be bound.

channels:
  test/{aTestParameter}:
    parameters:
      aTestParameter:
        description: A test parameter.
        schema:
          type: string
    publish:
      message:
        payload:
          type: object
          additionalProperties: false
          properties:
            testProp:
              type: string`

test('converts a basic YAML string', async () => {
  const collection = await convert(basicYAML)
  expect(collection.name).toBe('Basic YAML')
  expect(collection.version.string).toBe('1.0.0')
  expect(collection.description.content).toBe('A basic YAML AsyncAPI file')
  expect(collection.items.toJSON()).toEqual([
    {
      event: [],
      id: 'publish-to-test',
      name: 'Publish to test',
      request: {
        method: 'WEBSOCKET',
        url: {
          host: ['localhost'],
          path: ['test'],
          port: '3000',
          protocol: 'ws',
          query: [],
          variable: []
        },
        body: {
          mode: 'raw',
          raw: {
            testProp: 'Ut velit',
          }
        },
      },
      response: [],
    }])
})

test('converts a sample YAML string', async () => {
  const collection = await convert(exampleYAML)
  expect(collection.name).toBe('Example YAML')
  expect(collection.version.string).toBe('1.0.0')
  expect(collection.description.content).toBe('An example YAML AsyncAPI file')
  expect(collection.items.toJSON()).toEqual([
    {
      event: [],
      id: 'publish-to-test/{aTestParameter}',
      name: 'Publish to test/{aTestParameter}',
      request: {
        method: 'WEBSOCKET',
        url: {
          host: ['localhost'],
          path: ['test', '{aTestParameter}'],
          port: '{port}',
          protocol: 'ws',
          query: [],
          variable: []
        },
        body: {
          mode: 'raw',
          raw: {
            testProp: 'Ut velit',
          }
        },
      },
      response: [],
    }])
  expect(collection.variables.toJSON()).toEqual([{
    description: {
      content: 'The port where server should be bound.',
      type: 'text/markdown',
    },
    id: 'port',
    key: 'port',
    name: 'port',
    type: 'any',
    value: '3000',
  }, {
    description: {
      content: 'A test parameter.',
      type: 'text/markdown',
    },
    id: 'aTestParameter',
    key: 'aTestParameter',
    name: 'aTestParameter',
    type: 'any',
    value: 'Ut velit',
  }])
})