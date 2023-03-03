This part of the repository is used to be able to preview PR requests on active vocabularies developed by the VC WG.

Why? The current setup is such that repositories for the development of specific vocabularies (i.e., [Data Model](https://github.com/w3c/vc-data-model/) and [Data integrity](https://github.com/w3c/vc-data-integrity/)) are use GitHub actions to generate the final, viewable versions of the vocabularies. This means that a PR only shows the effect of a PR on a YML file, and not on the generated files which are only created when the PR is merged. I therefore use this area of the script repository to generate the output manually for the PR when I do it...

- @iherman
