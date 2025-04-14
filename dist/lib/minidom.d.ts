/**
 * A thin layer on top of the regular DOM Document. Necessary to "hide" the differences between
 * the JSDOM and Deno's DOM WASM implementations; higher layers should not depend on these.
 *
 * @packageDocumentation
 */
/**
 * A thin layer on top of the regular DOM Document. Necessary to "hide" the differences between
 * the JSDOM and Deno's DOM WASM implementations; higher layers should not depend on these.
 *
 * The class also includes some handy shorthands to make the code cleaner…
 *
 * 2024-02-02: as of today, with deno v. >1.4, this layer is not necessary any more,
 * because jsdom finally runs with deno as well. The class has been kept as a separate layer
 * following the wisdom of "ain't broken, don't fix it" :-)
 *
 */
export declare class MiniDOM {
    private readonly _localDocument;
    constructor(html_text: string);
    get document(): Document;
    /**
     * Add a new HTML Element to a parent, and return the new element.
     *
     * @param parent - The parent HTML Element
     * @param element - The new element's name
     * @param content - The new element's (HTML) content
     * @returns the new element
     *
     */
    addChild(parent: Element, element: string, content?: string | undefined): Element;
    /**
     * Add some text to an element, including the obligatory checks that Typescript imposes
     *
     * @param content - text to add
     * @param element HTML Element to add it to
     * @returns
     *
     * @internal
     */
    addText(content: string, element: Element | null): Element | null;
    /**
     * Add some HTMLtext to an element, including the obligatory checks that Typescript imposes
     *
     * @param content - text to add
     * @param element HTML Element to add it to
     * @returns
     *
     * @internal
     */
    addHTMLText(content: string, element: Element | null): Element | null;
    /**
     * Just the mirroring of the official DOM call.
     *
     * @param id
     * @returns
     */
    getElementById(id: string): Element | null;
    /**
      * Just the mirroring of the official DOM call.
      *
      * @param tag
      * @returns
      */
    getElementsByTagName(tag: string): HTMLCollection;
    /**
     * Just the mirroring of the official DOM call.
     *
     * @returns
     */
    innerHTML(): string;
}
