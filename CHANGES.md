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
