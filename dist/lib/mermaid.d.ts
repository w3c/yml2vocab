import type { Vocab } from "./common";
/**
 * Generation of an illustrative mermaid diagram. It is not the goal to be 100% exhaustive: general properties may
 * not appear. It concentrates on the vocabulary classes and their relationships via properties from
 * within the vocabulary.
 *
 * @param vocab
 * @param template
 * @returns
 */
export declare function toMermaid(vocab: Vocab, template?: string): string;
