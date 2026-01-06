# Changes

This list does not include all the tiny changes, bug handling, etc, only the changes in the main features.

## Version 1.7.1

- Added the `import` block to the `json_ld` top level block, to allow adding a `@import` statement with one or more URI-s at the top of the generated context file.
- When generating a context file with an aliased term (see the `known_as` property) an extra information is added to the generated HTML file.
- Added the capability to handle HTML templates containing HTML fragments only. The result can be imported into a specification instead of keeping it as a separate file.
- Introduced the `upper_union` and `range_union` boolean flags for classes and, respectively, properties. If set to `true`, the superclass, respectively range settings with several class references mean the _disjunction_ of the classes, as opposed to the (default) _conjunction_. This formally affects the turtle and json-ld versions of the vocabulary (which use the `owl:unionOf` construct); the HTML description uses now the ⊓ and ⊔ characters to denote these. This allows to say: "instances of this class are of type either this, this, or this".
- Introduced the `one_of` keys for classes and datatypes. The values list the possible individuals for a class, and the possible string values for a datatype derived from `xsd:string`. Furthermore, the `pattern` key for a datatype can hold a regular expression restricting the acceptable string value.
- Some minor optimization (e.g., removal of unnecessary prefix definition from the generated html/turtle/jsonld).
- Re-edited the README.md file to make it somewhat more readable.

## Version 1.7.0

- The package does not generate RDFa any more. The usage of RDFa in the HTML represented a significant burden on the code itself, and also made the generated HTML messy. All this for no real benefit: RDFa is very rarely used these days. Instead, the JSON-LD and Turtle versions of the vocabulary are linked from the HTML header as alternate representations.

- All the generated files (HTML, Turtle, JSON-LD) are formatted by, partially, taking into account a possible [`.editorconfig`](https://spec.editorconfig.org) file regarding indentation size and some more, minor control statements.

- Added the `container` key for properties, with a possible value of `set` or `list`. These values appear, for the specific property, in the generated JSON-LD `@context` file. In the `list` case it will also affect the range of the property (which is set to `rdf:List`).

- Added the `json_ld` top level block with the `alias` block, defining keys to alias some JSON-LD keywords in the generated context file.

## Version 1.6.0

- A systematic re-write of the internals, triggered by the introduction of external terms. Previously, all cross-references (e.g., range, superclass, etc.) were done using the identifier of the terms. That led to lots of ugly code differentiating between terms defined in the vocab and curies appearing as, say, ranges. This situation was made worse by external terms.

    This version uses RDFTerm interfaces (and its extensions for classed, properties, etc) overall. As it should from a modeling purposes: the array of ranges refer to an array of RDF Classes, superproperties to Properties, etc. This made the code cleaner and many of the ugly code disappeared.

- A minor change for the JSON-LD Context generation. It does happen that the name used in the context file should be different than what the official label is. Eg., `keyAgreement` vs. `keyAgreementMethod`. This is ugly but sometimes necessary for backward compatibility reasons. A new key in yml, `knownAs`, may be used to set this alternative name. It is used exclusively in the context generation.

## Version 1.5.0 - 1.5.6

- Adding the "external" term feature. Terms that are not formally defined in the vocabulary, but added explicitly to make cross references more understandable and appear in the context file. Typical case are `schema.org` terms that are used all over the place.
- The code has been made fully compatible with [deno](https://deno.land). With the presence of a `deno.json` file for handling imports, the same code can be used with node.js/npm and deno interchangeably.
- The JSON-LD `@context` generation aspect has been significantly improved and debugged, to make it really usable by smaller projects.

## Version 1.4.8

- Adding the possibility of explicitly setting a resource type via the (new) `type` property.

## Version 1.4.7

- Adding information on `@context` files

## Version 1.4.6

- Label is now optional

## Version 1.4.5

- Error in the namespace for `Property` (see https://github.com/w3c/yml2vocab/issues/16)

## Version 1.4.4

- Adding the possibility to define datatypes

## Version 1.4.3

- Bug handling...

## Version 1.4.2

- Minor improvement on the generated JSON vs language handling (thanks to @pchampin).

## Version 1.4.1

- The default value set for `status` was set to `reserved`, rather than `stable`.

## Version 1.4.0

- Instead of the (binary) `deprecated` flag this version uses the `status` value in the yml file whose value can be `stable`, `reserved`, and `deprecated`. The terms are marked up as such in the final vocabulary, and the HTML output separates these three classes into separate to-level sections.

    This feature is backward compatible with `deprecated`; older vocabularies that use that flag would still work, but the value of `status` has a higher priority.
- Introduction of a `defined_by` term: a URL referring to the formal definition of the term in another document.


## Version 1.3.2

- Added more cross-references to the HTML output, to make the end result more useful:
  - the class definitions include a further set of information about the properties (in the same vocabulary) that refer to that class either through the range or the domain statements
  - the references to classes and properties (e.g., in range or subproperty statements) are now hyperlinks. That is also true if external vocabularies are used with a prefix
- Handled a bug whereby the generated turtle always referred to the same top level vocabulary instead of using the one set in the vocabulary description itself.


## Version 1.3.1

- Minor code improvements: separating the schema into its own files, better error handling through `Promise.allSettled`, and also retrofitting some changes required by the `deno` version (which is more strict than the standard `tsc`)

## Version 1.3.0

### Major changes

- The content of the `comment` field is now considered as an HTML fragment. For most of the vocabularies it does not have any consequence now, because those descriptions/comments are a single paragraph anyway. However, if line feeds or other tricks are used to force some formatting, those should be redone in bona fide HTML.
    The RDF version of the ontologies use the `rdf:HTML` data type and therefore keep those structures in the official RDF definition, too.


## Version 1.2.0

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
