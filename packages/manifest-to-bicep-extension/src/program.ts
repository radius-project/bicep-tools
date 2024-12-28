import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'node:fs'
import { convert } from './converter'
import { parseManifest } from './manifest'

async function generate(manifest: string, output: string) {
  const data = fs.readFileSync(manifest, 'utf8')
  const parsed = parseManifest(data)
  const converted = convert(parsed)

  fs.rmSync(`${output}/types.json`, { force: true })
  fs.rmSync(`${output}/index.json`, { force: true })
  fs.rmSync(`${output}/index.md`, { force: true })

  console.log(`Writing types to ${output}/types.json`)
  fs.writeFileSync(`${output}/types.json`, converted.typesContent, {
    encoding: 'utf8',
  })

  console.log(`Writing index to ${output}/index.json`)
  fs.writeFileSync(`${output}/index.json`, converted.indexContent, {
    encoding: 'utf8',
  })

  console.log(`Writing documentation to ${output}/index.md`)
  fs.writeFileSync(`${output}/index.md`, converted.documentationContent, {
    encoding: 'utf8',
  })
}

export async function run() {
  return await yargs(hideBin(process.argv))
    .usage('Usage: $0 <command> [options]')
    .showHelpOnFail(true)
    .demandCommand(1, 'Command name is required')
    .command(
      'generate <manifest> <output> [options]',
      'Generate Bicep extension from Radius Resource Provider manifest.',
      (yargs) => {
        return yargs
          .positional('manifest', {
            demandOption: true,
            type: 'string',
          })
          .positional('output', {
            demandOption: true,
            type: 'string',
          })
      },
      async (yargs) => {
        try {
          await generate(yargs.manifest, yargs.output)
        } catch (err) {
          console.error(err)
        }
      }
    )
    .parseAsync()
}
