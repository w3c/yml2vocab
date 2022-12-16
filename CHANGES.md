## Version 1.2

### Major changes

- Added the (optional) generation of a JSON-LD `@context` file
- Added, in the YAML format, the possibility for a `dataset` entry on properties, resulting in the `"@container":"@graph"` statement in the generated context

### Minor changes, bug fixes

- Better use of the Commander package for the CLI
- Some CSV leftover still persisted in the README.md file...
- Adopted some naming conventions from the airbnb style file.

## Version 1.1

- Restructured the HTML output: each term in its own subsection instead of into a table (this gives more space for the content)
- Added the possibility to add one or more examples into the YML file
- The YAML content is checked with a built-in JSON Schema before processing further
