//
// Example: read config files from dir and output substitutions result
//

import * as yamlConfig from '../src'

const config = new yamlConfig.yamlConfig("example")

console.log("Example config:")
console.log(config.config)

console.log("YAML representation of the example config:")
console.log(config.configYaml)
