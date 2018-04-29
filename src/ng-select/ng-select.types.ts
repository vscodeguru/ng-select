export interface SelectGuruOption {
    [name: string]: any;
    index?: number;
    htmlId?: string;
    selected?: boolean;
    disabled?: boolean;
    marked?: boolean;
    label?: string;
    value?: string | Object;
    parent?: SelectGuruOption;
    hasChildren?: boolean;
}

export enum KeyCode {
    Tab = 9,
    Enter = 13,
    Esc = 27,
    Space = 32,
    ArrowUp = 38,
    ArrowDown = 40,
    Backspace = 8
}

export interface SelectGuruConfig {
    notFoundText?: string;
    typeToSearchText?: string;
    addTagText?: string;
    loadingText?: string;
    clearAllText?: string;
}
