const { resolve } = require('path')
const { readFile } = require('fs/promises')
const { parse } = require('@asyncapi/parser')
const { Collection } = require('postman-collection')
const { option: fakerOptions, resolve: fake } = require('json-schema-faker')

const a2c = module.exports

fakerOptions({
  requiredOnly: false,
  optionalsProbability: 1.0, // always add optional fields
  maxLength: 256,
  minItems: 1, // for arrays
  maxItems: 20, // limit on maximum number of items faked for (type: arrray)
  avoidExampleItemsLength: true, // option to avoid validating type array schema example's minItems and maxItems props.
  useExamplesValue: true,
  useDefaultValue: true,
})

a2c.convert = async (asyncapiString, options = {}) => {
  const doc = await parse(asyncapiString, options.parser)
  const serverNames = doc.serverNames() || []
  const channelNames = doc.channelNames() || []

  const collection = new Collection({
    info: {
      name: doc.info().title(),
      version: doc.info().version(),
      description: doc.info().description(),
    },
    item: await buildCollectionItems(doc, serverNames[0]),
    variable: await buildVariablesList(doc, serverNames, channelNames),
  })
  
  return collection
}

a2c.convertFile = async (filePath, options = {}) => {
  const fileContent = await readFile(filePath, { encoding: 'utf-8' })
  return a2c.convert(fileContent, options.parser)
}

async function buildCollectionItems (doc, serverName) {
  const items = []

  const promises = doc.channelNames().map(async channelName => {
    const channel = doc.channel(channelName)
    if (channel.hasPublish()) {
      const publishOperation = channel.publish()
      const message = publishOperation.message()
      const server = doc.server(serverName)
      const serverUrl = server ? buildUrl(server.url(), channelName) : resolve('/', channelName)

      const headers = message.headers() && message.headers().json() && message.headers().json().properties ? await fake(message.headers().json()) : undefined
      const body = await fake(message.payload().json())

      items.push({
        name: `Publish to ${channelName}`,
        id: publishOperation.id() || `publish-to-${channelName}`,
        request: {
          url: serverUrl,
          method: guessMethod(server, serverName),
          body: { mode: 'raw', raw: body },
          ...publishOperation.hasDescription() && {
            description: buildMarkdownDescriptionObject(publishOperation.description()),
          },
          ...headers && { header: Object.keys(headers).map(
            key => ({
              key,
              value: headers[key],
              ...message.header(key).hasDescription() && buildMarkdownDescriptionObject(message.header(key).description()),
            })
          ) },
        },
      })
    }
  })

  await Promise.all(promises)

  return items
}

function guessMethod (server, serverName) {
  if (!server) throw new Error('Unable to guess the request method because no server has been specified.')
  
  if (['ws', 'wss'].includes(server.protocol())) return 'WEBSOCKET'
  throw new Error(`Unable to guess the request method for server "${serverName}".`)
}

function buildMarkdownDescriptionObject (content) {
  return {
    content,
    type: 'text/markdown',
  }
}

function buildUrl (base, path) {
  return `${base}/${path}`
}

async function buildVariablesList (doc, serverNames, channelNames) {
  const variables = []
  await Promise.all(serverNames.map(async serverName => {
    const vars = doc.server(serverName).variables()
    await Promise.all(
      Object.keys(vars).map(async key => {
        if (variables.find(v => v.key === key)) return
        const variable = vars[key]

        variables.push({
          key,
          id: key,
          name: key,
          value: await fake({
            type: 'string',
            ...variable.hasAllowedValues() && { enum: variable.allowedValues() },
            ...variable.hasDefaultValue() && { default: variable.defaultValue() },
          }),
          ...variable.hasDescription() && {
            description: buildMarkdownDescriptionObject(variable.description()),
          },
        })
      })
    )
  }))

  await Promise.all(channelNames.map(async channelName => {
    const channel = doc.channel(channelName)
    const parameters = channel.hasParameters() ? channel.parameters() : {}
    await Promise.all(
      Object.keys(parameters).map(async key => {
        if (variables.find(v => v.key === key)) return
        const param = parameters[key]

        variables.push({
          key,
          id: key,
          name: key,
          value: await fake(param.schema() ? param.schema().json() : { type: 'string' }),
          ...param.hasDescription() && {
            description: buildMarkdownDescriptionObject(param.description()),
          },
        })
      })
    )
  }))

  return variables
}
