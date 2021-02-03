import * as fs from "fs";
import * as yaml from "yaml";
import * as lodash from "lodash";
import merge from "ts-deepmerge";
import { any, placeholder } from "lodash/fp";
import { type } from "os";
import { isNumber } from "lodash";


/**
  * Yaml config class definition
  */
export class yamlConfig {

  // TODO: Make service functions and parameters private

  path: string;                       // Path to load config(s) from
  filesData: Map<string, string>;     // Service array to put files data
  filesParsedData: Map<string, any>;  // Service array to put files data after parse
  filesEncoding: BufferEncoding;      // Files encoding to use while reading file
  requiredSettings: string[];         // YAML keys that must present in config files
  config: object;                     // Object to store final config
  configYaml: string;                 // YAML representation of the final config


  /**
   * Object constructor
   * @param path - path to the file or directory to load
   * @param encoding - encoding to use with file(s) beeing loaded
   */
  constructor(path: string, encoding: BufferEncoding = 'utf8') {
    this.log('Initializing')

    this.path = path;                  // Load path from constructor parameters
    this.filesEncoding = encoding;     // Load files encoding from constructor parameters
    // Initialize files data maps with as empty maps by default
    this.filesData = new Map();
    this.filesParsedData = new Map();
    this.requiredSettings = [];        // TODO: Add required settings functionality to specify mandatory configuration items
    this.config = {};                  // Initialize consolidated config object

    this.log('Rendering config')

    this.readConfig()
    this.parseConfig()
    this.mergeConfig()
    this.config = this.substitute()
    this.configYaml = yaml.stringify(this.config)

    this.log('Done')
  }

  /**
    * Logs provided message to stderr
    * @param message - string
    * @returns N/a
    */
   log(message: string) {
    console.error('YAML-CONFIG: ', message)
  }

  /**
    * Checks provided file extention and updated files data map
    * @param sting: path
    */
   readFile (file: string) {

    // If file has YAML extention
    if (file.endsWith('.yml') || file.endsWith('.yaml')) {
      this.log(`Reading ${file}`)
      // Get it's contents and update files data map
      this.filesData.set(file, fs.readFileSync(file, (this.filesEncoding)))
    } else {
      // If file extention is different - skip it
      this.log(`${file} has non YAML extention and will be ignored`)
    }
  }


  /**
   * Reads specified path and loads data from file or directory
   * Updates files data map with files content
   * @param N/a
   * @returns N/a
   */
  readConfig () {

    // If path exists
    if (fs.existsSync(this.path)) {
      this.log(`Loading config from "${this.path}"`)

      // If it is a directory
      if (fs.lstatSync(this.path).isDirectory()) {
        this.log(`Using directory mode to read configs`)
        // Get files list
        const files = fs.readdirSync(this.path)
        this.log(`Files list: ${files}`)

        // Process each file
        files.forEach( (file) => {
          this.log(`Processing file ${file}`)
          // Form full file path
          file = this.path + '/' + file
          // Update files data array
          this.readFile(file)
        })
      } else { // If it's a single file
        this.log(`Using single file mode to read config`)
        // Read it dircetly
        this.readFile(this.path)
      }
    } else {
      // Log path error
      // TODO: Throw exeption to stop main program execution
      this.log (`${this.path} is not a path to an existent file or directory`)
    }

    // Output files data array
    this.log(`Processed files data: ${this.filesData}`)

  }

  /**
   * Parses files from files data array and updates parsed files map with YAML contents
   */
  parseConfig () {
    // For each loaded file
    for (let [fileName, fileContents] of this.filesData) {
      this.log(`Parsing file: ${fileName}`)
      this.filesParsedData.set(fileName, yaml.parse(fileContents))
    }
  }

  /**
   * Makes merged object from parsed config files
   */
  mergeConfig () {
    for (let [fileName, yamlContents] of this.filesParsedData) {
      this.log(`Merging config: ${fileName}`)
      this.config = merge(this.config, yamlContents)
    }
  }

  /**
   * Preform substitution for given string based on the object contents
   * Placeholder format: ${path.to.object.property}
   * @param mainObject - object to get placeholder values from
   * @param stringToProcess - string with placeholder to be processed
   * @returns {result: string | number | object, status: boolean}
   */
  substituteString (mainObject: any = this.config, stringToProcess: string) {

    let successFlag = false                    // Flag to indicate if substitution is successful
    let isNumberFlag = false                   // Flag to indicate that number was substituted
    const placeholderRegexp = /\${([\w.-]+)}/g // Regex to find placeholder like ${object.path}

    // Find placeholder in the string
    let placeholder = placeholderRegexp.exec(stringToProcess) // Find placeholder in the string beeing processed
    // Initialize global vars for future processing
    let elementToSubstitute = null
    let substitutedString:any = null

    // If placeholder found - extract it's value
    if (placeholder && (stringToProcess === placeholder[0])) {
      elementToSubstitute = placeholder[1]
    }

    // Check that placeholder value (property path) exists in the config object
    if (elementToSubstitute && lodash.has(mainObject, elementToSubstitute)) {
      // Get it's value from the config
      substitutedString = lodash.get(mainObject, elementToSubstitute)
      // If target element is an object - raise success flag
      if (typeof(substitutedString) === "object") {
        successFlag = true
      }
    }

    // If object is not processed yet => it's a string
    if (!successFlag) {
      // Perform substitution: replace placeholder with object.path from mainObject
      substitutedString = stringToProcess.replace(placeholderRegexp,
        // Inline function to get value to replace
        function(searchMatch, placeholder) {
          // Check if path from placeholder exists in mainObject
          if (!successFlag) {
            successFlag = lodash.has(mainObject, placeholder)
          }
          // Return found object value or initial string (unchanged placeholder)
          const result = lodash.get(mainObject,placeholder) || searchMatch
          // If result can be converted to number - raise flag
          if (typeof(result) === 'number') {
            isNumberFlag = true
          }
          return result
        }
      )

      // If string still has placeholders (updated value also may contain placeholder)
      if (substitutedString.match(placeholderRegexp) && successFlag) {
        // Initialize status for lower recursion levels
        let recursedSubstitutedString = Object({
          status: false
        })

        // Preform substitution again for this string
        recursedSubstitutedString = this.substituteString(mainObject, substitutedString)
        // Update result and status with inner substitution's
        substitutedString = recursedSubstitutedString.result
      }

      // If result can be converted to number - do it
      if (!isNaN(Number(substitutedString)) && isNumberFlag) {
        substitutedString = Number(substitutedString)
      }
    }

    // Return substitution result and status
    return Object({
      status: successFlag,
      result: substitutedString
    })

  }

  /**
   * Process substitions in config object(s)
   * @param mainObject      - Object containing values that should be used for substitution. Equal to config object in most cases
   * @param objectToProcess - Object to replace substitutions in
   */
  substitute (mainObject: any = this.config, objectToProcess: any = this.config) {

    this.log(`Processing substitions for ${objectToProcess} with ${mainObject} as values source`)

    // Process substitutions: String
    if (typeof(objectToProcess) === 'string') {
      this.log("String substitution mode used")
      // Preform string substitution
      const substitutedString = this.substituteString(mainObject, objectToProcess)
      // Update property if substitution happened successfully
      if (substitutedString.status) {
        objectToProcess = substitutedString.result
      }
    // Process substitutions: array
    } else if (Array.isArray(objectToProcess)) {
      this.log("Array substitution mode used")
      // Get array length
      let arrayLength = objectToProcess.length
      // Perform substitutions for each array element
      for (let i = 0; i < arrayLength; i++) {

        // Get substitution result for an array element
        let substitutionResult = this.substitute(mainObject, objectToProcess[i])

        // If value to substitute is also an array - insert it's values into the current one
        if (Array.isArray(substitutionResult)) {
          // Calculate final array length: current array length + insert array length - 1 (because element with subsitution will be deleted)
          arrayLength += substitutionResult.length-1

          let j = 0 // Inner loop counter
          // For each insert array element - insert it instead of the full string substition
          substitutionResult.forEach(item => {
            objectToProcess.splice(i+j, 0, item)
            j++
          })
          // Remove resolved substitution element from array
          objectToProcess.splice(i+substitutionResult.length,1)

        // If values is a string - just replace an element with the result
        } else {
          objectToProcess[i] = substitutionResult
        }
      }

    // Process substitions: object
    } else if (typeof(objectToProcess) === 'object') {
      // Perform substitution for each object key
      for (let key in objectToProcess) {
        objectToProcess[key] = this.substitute(mainObject, objectToProcess[key])
      }
    }

    return objectToProcess

  }

}
