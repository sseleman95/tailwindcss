import dedent from 'dedent'
import { describe, expect, test } from 'vitest'
import { extractStaticImportMap, findStaticPlugins } from './extract-static-plugins'

const js = dedent

describe('findStaticPlugins', () => {
  test('parses all export styles', () => {
    expect(
      findStaticPlugins(js`
        import plugin1 from './plugin1'
        import * as plugin2 from './plugin2'

        export default {
          plugins: [plugin1, plugin2, 'plugin3', require('./plugin4')]
        }
    `),
    ).toEqual(['./plugin1', './plugin2', 'plugin3', './plugin4'])

    expect(
      findStaticPlugins(js`
        import plugin1 from './plugin1'
        import * as plugin2 from './plugin2'

        export default {
          plugins: [plugin1, plugin2, 'plugin3', require('./plugin4')]
        } as any
    `),
    ).toEqual(['./plugin1', './plugin2', 'plugin3', './plugin4'])

    expect(
      findStaticPlugins(js`
        import plugin1 from './plugin1'
        import * as plugin2 from './plugin2'

        export default {
          plugins: [plugin1, plugin2, 'plugin3', require('./plugin4')]
        } satisfies any
    `),
    ).toEqual(['./plugin1', './plugin2', 'plugin3', './plugin4'])

    expect(
      findStaticPlugins(js`
        const plugin1 = require('./plugin1')

        module.exports =  {
          plugins: [plugin1, 'plugin2', require('./plugin3')]
        } as any
    `),
    ).toEqual(['./plugin1', 'plugin2', './plugin3'])

    expect(
      findStaticPlugins(js`
        const plugin1 = require('./plugin1')

        module.exports =  {
          plugins: [plugin1, 'plugin2', require('./plugin3')]
        } satisfies any
    `),
    ).toEqual(['./plugin1', 'plugin2', './plugin3'])

    expect(
      findStaticPlugins(js`
        const plugin1 = require('./plugin1')

        module.exports =  {
          plugins: [plugin1, 'plugin2', require('./plugin3')]
        }
    `),
    ).toEqual(['./plugin1', 'plugin2', './plugin3'])
  })

  test('bails out on inline plugins', () => {
    expect(
      findStaticPlugins(js`
      import plugin1 from './plugin1'

      export default {
        plugins: [plugin1, () => {} ]
      }
    `),
    ).toEqual(null)

    expect(
      findStaticPlugins(js`
      let plugin1 = () => {}

      export default {
        plugins: [plugin1]
      }
    `),
    ).toEqual(null)
  })

  test('bails out on non `require` calls', () => {
    expect(
      findStaticPlugins(js`
      export default {
        plugins: [frequire('./plugin1')]
      }
    `),
    ).toEqual(null)
  })

  test('bails out on named imports for plugins', () => {
    expect(
      findStaticPlugins(js`
      import {plugin1} from './plugin1'

      export default {
        plugins: [plugin1]
      }
    `),
    ).toEqual(null)
  })

  test('bails for plugins with options', () => {
    expect(
      findStaticPlugins(js`
        import plugin1 from './plugin1'

        export default {
          plugins: [plugin1({foo:'bar'})]
        }
      `),
    ).toEqual(null)

    expect(
      findStaticPlugins(js`
        export default {
          plugins: [require('@tailwindcss/typography')({foo:'bar'})]
        }
    `),
    ).toEqual(null)
  })

  test('returns no plugins if none are exported', () => {
    expect(
      findStaticPlugins(js`
      export default {
        plugins: []
      }
    `),
    ).toEqual([])

    expect(
      findStaticPlugins(js`
      export default {}
    `),
    ).toEqual([])
  })
})

describe('extractStaticImportMap', () => {
  test('extracts different kind of imports from an ESM file', () => {
    let extracted = extractStaticImportMap(js`
      import plugin1 from './plugin1'
      import * as plugin2 from './plugin2'
      import plugin6, { plugin3, plugin4, default as plugin5 } from './plugin3'
      import plugin8, * as plugin7 from './plugin7'
    `)

    expect(extracted).toEqual({
      plugin1: { module: './plugin1', export: null },
      plugin2: { module: './plugin2', export: '*' },
      plugin3: { module: './plugin3', export: 'plugin3' },
      plugin4: { module: './plugin3', export: 'plugin4' },
      plugin5: { module: './plugin3', export: 'default' },
      plugin6: { module: './plugin3', export: null },
      plugin7: { module: './plugin7', export: '*' },
      plugin8: { module: './plugin7', export: null },
    })
  })

  test('extracts different kind of imports from an CJS file', () => {
    let extracted = extractStaticImportMap(js`
      const plugin1 = require('./plugin1')
      let plugin2 = require('./plugin2')
      var plugin3 = require('./plugin3')

      const {plugin4, foo: plugin5, ...plugin6} = require('./plugin4')
      let {plugin7, foo: plugin8, ...plugin9} = require('./plugin5')
      var {plugin10, foo: plugin11, ...plugin12} = require('./plugin6')
    `)

    expect(extracted).toEqual({
      plugin1: { module: './plugin1', export: null },
      plugin2: { module: './plugin2', export: null },
      plugin3: { module: './plugin3', export: null },
      plugin4: { module: './plugin4', export: 'plugin4' },
      plugin5: { module: './plugin4', export: 'foo' },
      plugin6: { module: './plugin4', export: '*' },
      plugin7: { module: './plugin5', export: 'plugin7' },
      plugin8: { module: './plugin5', export: 'foo' },
      plugin9: { module: './plugin5', export: '*' },
      plugin10: { module: './plugin6', export: 'plugin10' },
      plugin11: { module: './plugin6', export: 'foo' },
      plugin12: { module: './plugin6', export: '*' },
    })
  })
})