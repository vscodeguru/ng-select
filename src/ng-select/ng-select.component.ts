import {
    Component,
    OnDestroy,
    OnChanges,
    AfterViewInit,
    forwardRef,
    ChangeDetectorRef,
    Input,
    Output,
    EventEmitter,
    ContentChild,
    TemplateRef,
    ViewEncapsulation,
    HostListener,
    HostBinding,
    ViewChild,
    ElementRef,
    ChangeDetectionStrategy,
    Inject,
    SimpleChanges,
    ContentChildren,
    QueryList,
    InjectionToken,
    NgZone,
    Attribute
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { takeUntil, startWith, tap, debounceTime, map, filter } from 'rxjs/operators';
import { merge } from 'rxjs/observable/merge';
import { Subject } from 'rxjs/Subject';

import {
    NgOptionTemplateDirective,
    NgLabelTemplateDirective,
    NgHeaderTemplateDirective,
    NgFooterTemplateDirective,
    NgOptgroupTemplateDirective,
    NgNotFoundTemplateDirective,
    NgTypeToSearchTemplateDirective,
    NgLoadingTextTemplateDirective,
    NgMultiLabelTemplateDirective
} from './ng-templates.directive';

import { ConsoleService } from './console.service';
import { isDefined, isFunction, isPromise, isObject } from './value-utils';
import { ItemsList } from './items-list';
import { SelectGuruOption, KeyCode, SelectGuruConfig } from './ng-select.types';
import { newId } from './id';
import { NgDropdownPanelComponent } from './ng-dropdown-panel.component';
import { NgOptionComponent } from './ng-option.component';
import { WindowService } from './window.service';

export const SELECT_GURU_DEFAULT_CONFIG = new InjectionToken<SelectGuruConfig>('ng-select-default-options');
export type DropdownPosition = 'bottom' | 'top' | 'auto';
export type AddTagFn = ((term: string) => any | Promise<any>);
export type CompareWithFn = (a: any, b: any) => boolean;

@Component({
    selector: 'ng-select',
    templateUrl: './ng-select.component.html',
    styleUrls: ['./ng-select.component.scss'],
    providers: [{
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => SelectGuruComponent),
        multi: true
    }],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        'role': 'listbox',
        'class': 'ng-select',
        '[class.ng-select-single]': '!multiple',
    }
})
export class SelectGuruComponent implements OnDestroy, OnChanges, AfterViewInit, ControlValueAccessor {

    // inputs
    @Input() items: any[] = [];
    @Input() bindLabel: string;
    @Input() bindValue: string;
    @Input() clearable = true;
    @Input() markFirst = true;
    @Input() placeholder: string;
    @Input() notFoundText: string;
    @Input() typeToSearchText: string;
    @Input() addTagText: string;
    @Input() loadingText: string;
    @Input() clearAllText: string;
    @Input() dropdownPosition: DropdownPosition = 'auto';
    @Input() appendTo: string;
    @Input() loading = false;
    @Input() closeOnSelect = true;
    @Input() hideSelected = false;
    @Input() selectOnTab = false;
    @Input() maxSelectedItems: number;
    @Input() groupBy: string;
    @Input() bufferAmount = 4;
    @Input() virtualScroll = false;
    @Input() selectableGroup = false;
    @Input() searchFn = null;
    @Input() clearSearchOnAdd = true;
    @Input() @HostBinding('class.ng-select-typeahead') typeahead: Subject<string>;
    @Input() @HostBinding('class.ng-select-multiple') multiple = false;
    @Input() @HostBinding('class.ng-select-taggable') addTag: boolean | AddTagFn = false;
    @Input() @HostBinding('class.ng-select-searchable') searchable = true;

    @Input()
    get compareWith() { return this._compareWith; }
    set compareWith(fn: CompareWithFn) {
        if (!isFunction(fn)) {
            throw Error('`compareWith` must be a function.');
        }
        this._compareWith = fn;
    }

    // output events
    @Output('blur') blurEvent = new EventEmitter();
    @Output('focus') focusEvent = new EventEmitter();
    @Output('change') changeEvent = new EventEmitter();
    @Output('open') openEvent = new EventEmitter();
    @Output('close') closeEvent = new EventEmitter();
    @Output('search') searchEvent = new EventEmitter();
    @Output('clear') clearEvent = new EventEmitter();
    @Output('add') addEvent = new EventEmitter();
    @Output('remove') removeEvent = new EventEmitter();
    @Output('scrollToEnd') scrollToEnd = new EventEmitter<{ start: number; end: number }>();

    // custom templates
    @ContentChild(NgOptionTemplateDirective, { read: TemplateRef }) optionTemplate: TemplateRef<any>;
    @ContentChild(NgOptgroupTemplateDirective, { read: TemplateRef }) optgroupTemplate: TemplateRef<any>;
    @ContentChild(NgLabelTemplateDirective, { read: TemplateRef }) labelTemplate: TemplateRef<any>;
    @ContentChild(NgMultiLabelTemplateDirective, { read: TemplateRef }) multiLabelTemplate: TemplateRef<any>;
    @ContentChild(NgHeaderTemplateDirective, { read: TemplateRef }) headerTemplate: TemplateRef<any>;
    @ContentChild(NgFooterTemplateDirective, { read: TemplateRef }) footerTemplate: TemplateRef<any>;
    @ContentChild(NgNotFoundTemplateDirective, { read: TemplateRef }) notFoundTemplate: TemplateRef<any>;
    @ContentChild(NgTypeToSearchTemplateDirective, { read: TemplateRef }) typeToSearchTemplate: TemplateRef<any>;
    @ContentChild(NgLoadingTextTemplateDirective, { read: TemplateRef }) loadingTextTemplate: TemplateRef<any>;

    @ViewChild(forwardRef(() => NgDropdownPanelComponent)) dropdownPanel: NgDropdownPanelComponent;
    @ContentChildren(NgOptionComponent, { descendants: true }) ngOptions: QueryList<NgOptionComponent>;
    @ViewChild('filterInput') filterInput: ElementRef;

    @HostBinding('class.ng-select-opened') isOpen = false;
    @HostBinding('class.ng-select-disabled') isDisabled = false;
    @HostBinding('class.ng-select-filtered') get filtered() { return !!this.filterValue && this.searchable };

    itemsList = new ItemsList(this);
    viewPortItems: SelectGuruOption[] = [];
    filterValue: string = null;
    dropdownId = newId();
    selectedItemId = 0;

    private _defaultLabel = 'label';
    private _primitive: boolean;
    private _pressedKeys: string[] = [];
    private _compareWith: CompareWithFn;

    private readonly _destroy$ = new Subject<void>();
    private readonly _keyPress$ = new Subject<string>();
    private _onChange = (_: SelectGuruOption) => { };
    private _onTouched = () => { };

    clearItem = (item: any) => {
        const option = this.selectedItems.find(x => x.value === item);
        this.unselect(option);
    };

    constructor(
        @Inject(SELECT_GURU_DEFAULT_CONFIG) config: SelectGuruConfig,
        @Attribute('class') public classes: string,
        private _cd: ChangeDetectorRef,
        private _console: ConsoleService,
        private _zone: NgZone,
        private _window: WindowService,
        public elementRef: ElementRef
    ) {
        this._mergeGlobalConfig(config);
    }

    get selectedItems(): SelectGuruOption[] {
        return this.itemsList.value;
    }

    get selectedValues() {
        return this.selectedItems.map(x => x.value);
    }

    get hasValue() {
        return this.selectedItems.length > 0;
    }

    ngOnInit() {
        this._handleKeyPresses();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.multiple) {
            this.itemsList.clearSelected();
        }
        if (changes.items) {
            this._setItems(changes.items.currentValue || []);
        }
    }

    ngAfterViewInit() {
        if (this.items && this.items.length === 0) {
            this._setItemsFromNgOptions();
        }
    }

    ngOnDestroy() {
        this._destroy$.next();
        this._destroy$.complete();
    }

    @HostListener('keydown', ['$event'])
    handleKeyDown($event: KeyboardEvent) {
        if (KeyCode[$event.which]) {
            switch ($event.which) {
                case KeyCode.ArrowDown:
                    this._handleArrowDown($event);
                    break;
                case KeyCode.ArrowUp:
                    this._handleArrowUp($event);
                    break;
                case KeyCode.Space:
                    this._handleSpace($event);
                    break;
                case KeyCode.Enter:
                    this._handleEnter($event);
                    break;
                case KeyCode.Tab:
                    this._handleTab($event);
                    break;
                case KeyCode.Esc:
                    this.close();
                    break;
                case KeyCode.Backspace:
                    this._handleBackspace();
                    break;
            }
        } else if ($event.key && $event.key.length === 1) {
            this._keyPress$.next($event.key.toLocaleLowerCase());
        }
    }

    handleMousedown($event: MouseEvent) {
        $event.stopPropagation();
        $event.preventDefault();

        const target = $event.target as HTMLElement;
        if (target.className === 'ng-clear') {
            this.handleClearClick();
            return;
        }
        if (target.className === 'ng-arrow') {
            this.handleArrowClick();
            return;
        }
        if (this.searchable) {
            this.open();
        } else {
            this.toggle();
        }
    }

    handleArrowClick() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    handleClearClick() {
        if (this.hasValue) {
            this.clearModel();
        }
        this._clearSearch();
        this.focus();
        if (this._isTypeahead) {
            this.typeahead.next(null);
        }
        this.clearEvent.emit();
    }

    clearModel() {
        if (!this.clearable) {
            return;
        }
        this.itemsList.clearSelected();
        this._updateNgModel();
    }

    writeValue(value: any | any[]): void {
        this.itemsList.clearSelected();
        this._handleWriteValue(value);
        this._cd.markForCheck();
    }

    registerOnChange(fn: any): void {
        this._onChange = fn;
    }

    registerOnTouched(fn: any): void {
        this._onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.isDisabled = isDisabled;
        this._cd.markForCheck();
    }

    toggle() {
        if (!this.isOpen) {
            this.open();
        } else {
            this.close();
        }
    }

    open() {
        if (this.isDisabled || this.isOpen || this.itemsList.maxItemsSelected) {
            return;
        }

        if (!this._isTypeahead && !this.addTag && this.itemsList.noItemsToSelect) {
            return;
        }
        this.isOpen = true;
        this.itemsList.markSelectedOrDefault(this.markFirst);
        this.openEvent.emit();
        if (!this.filterValue) {
            this.focus();
        }
        this.detectChanges();
    }

    close() {
        if (!this.isOpen) {
            return;
        }
        this.isOpen = false;
        this._clearSearch();
        this._onTouched();
        this.closeEvent.emit();
        this._cd.markForCheck();
    }

    toggleItem(item: SelectGuruOption) {
        if (!item || item.disabled || this.isDisabled) {
            return;
        }

        if (this.multiple && item.selected) {
            this.unselect(item);
        } else {
            this.select(item);
        }
    }

    select(item: SelectGuruOption) {
        this.itemsList.select(item);

        if (this.clearSearchOnAdd) {
            this._clearSearch();
        }

        this.addEvent.emit(item.value);
        if (this.closeOnSelect || this.itemsList.noItemsToSelect) {
            this.close();
        }

        this._updateNgModel();
    }

    focus() {
        if (!this.filterInput) {
            return;
        }
        this._zone.runOutsideAngular(() => {
            this._window.setTimeout(() => {
                this.filterInput.nativeElement.focus();
            }, 5);
        });
    }

    unselect(item: SelectGuruOption) {
        this.itemsList.unselect(item);
        this._updateNgModel();
        this.removeEvent.emit(item);
    }

    selectTag() {
        let tag;
        if (isFunction(this.addTag)) {
            tag = (<AddTagFn>this.addTag)(this.filterValue);
        } else {
            tag = this._primitive ? this.filterValue : { [this.bindLabel]: this.filterValue };
        }

        if (isPromise(tag)) {
            tag.then(item => this.select(this.itemsList.addItem(item)))
                .catch(() => { });
        } else if (tag) {
            this.select(this.itemsList.addItem(tag));
        }
    }

    showClear() {
        return this.clearable && (this.hasValue || this.filterValue) && !this.isDisabled;
    }

    showAddTag() {
        return this.addTag &&
            this.filterValue &&
            !this.selectedItems.some(x => x.label.toLowerCase() === this.filterValue.toLowerCase()) &&
            !this.loading;
    }

    showNoItemsFound() {
        const empty = this.itemsList.filteredItems.length === 0;
        return ((empty && !this._isTypeahead && !this.loading) ||
            (empty && this._isTypeahead && this.filterValue && !this.loading)) &&
            !this.showAddTag();
    }

    showTypeToSearch() {
        const empty = this.itemsList.filteredItems.length === 0;
        return empty && this._isTypeahead && !this.filterValue && !this.loading;
    }

    filter(term: string) {
        this.filterValue = term;
        this.open();

        if (this._isTypeahead) {
            this.typeahead.next(this.filterValue);
        } else {
            this.itemsList.filter(this.filterValue);
            this.itemsList.markSelectedOrDefault(this.markFirst);
        }
    }

    onInputFocus() {
        (<HTMLElement>this.elementRef.nativeElement).classList.add('ng-select-focused');
        this.focusEvent.emit(null);
    }

    onInputBlur() {
        (<HTMLElement>this.elementRef.nativeElement).classList.remove('ng-select-focused');
        this.blurEvent.emit(null);
        if (!this.isOpen && !this.isDisabled) {
            this._onTouched();
        }
    }

    onItemHover(item: SelectGuruOption) {
        if (item.disabled) {
            return;
        }
        this.itemsList.markItem(item);
    }

    detectChanges() {
        if (!(<any>this._cd).destroyed) {
            this._cd.detectChanges();
        }
    }

    updateDropdownPosition() {
        if (this.dropdownPanel) {
            this.dropdownPanel.updateDropdownPosition();
        }
    }

    private _setItems(items: any[]) {
        const firstItem = items[0];
        this.bindLabel = this.bindLabel || this._defaultLabel;
        this._primitive = !isObject(firstItem);
        this.itemsList.setItems(items);
        if (items.length > 0 && this.hasValue) {
            this.itemsList.mapSelectedItems();
        }

        if (this._isTypeahead) {
            this.itemsList.markSelectedOrDefault(this.markFirst);
        }
    }

    private _setItemsFromNgOptions() {
        const handleNgOptions = (options: QueryList<NgOptionComponent>) => {
            this.items = options.map(option => ({
                $ngOptionValue: option.value,
                label: option.elementRef.nativeElement.innerHTML,
                disabled: option.disabled
            }));
            this.itemsList.setItems(this.items);
            if (this.hasValue) {
                this.itemsList.mapSelectedItems();
            }
            this.detectChanges();
        }

        const handleOptionChange = () => {
            const changedOrDestroyed = merge(this.ngOptions.changes, this._destroy$);
            merge(...this.ngOptions.map(option => option.stateChange$))
                .pipe(takeUntil(changedOrDestroyed))
                .subscribe(option => {
                    const item = this.itemsList.findItem(option.value);
                    item.disabled = option.disabled;
                    this._cd.markForCheck();
                });
        }

        this.ngOptions.changes
            .pipe(startWith(this.ngOptions), takeUntil(this._destroy$))
            .subscribe(options => {
                handleNgOptions(options);
                handleOptionChange();
            });
    }

    private _isValidWriteValue(value: any): boolean {
        if (!isDefined(value) ||
            (this.multiple && value === '') ||
            Array.isArray(value) && value.length === 0
        ) {
            return false;
        }

        const validateBinding = (item: any): boolean => {
            if (isObject(item) && this.bindValue) {
                this._console.warn(`Binding object(${JSON.stringify(item)}) with bindValue is not allowed.`);
                return false;
            }
            return true;
        };

        if (this.multiple) {
            if (!Array.isArray(value)) {
                this._console.warn('Multiple select ngModel should be array.');
                return false;
            }
            return value.every(item => validateBinding(item));
        } else {
            return validateBinding(value);
        }
    }

    private _handleWriteValue(ngModel: any | any[]) {
        if (!this._isValidWriteValue(ngModel)) {
            return
        };

        const select = (val: any) => {
            let item = this.itemsList.findItem(val);
            if (item) {
                this.itemsList.select(item);
            } else {
                const isValObject = isObject(val)
                const isPrimitive = !isValObject && !this.bindValue;
                if ((isValObject || isPrimitive)) {
                    this.itemsList.select(this.itemsList.mapItem(val, null));
                } else if (this.bindValue) {
                    item = {
                        [this.bindLabel]: null,
                        [this.bindValue]: val
                    };
                    this.itemsList.select(this.itemsList.mapItem(item, null));
                }
            }
        };

        if (this.multiple) {
            (<any[]>ngModel).forEach(item => {
                select(item);
            });
        } else {
            select(ngModel);
        }
    }

    _handleKeyPresses() {
        if (this.searchable) {
            return;
        }

        this._keyPress$
            .pipe(takeUntil(this._destroy$),
                tap(letter => this._pressedKeys.push(letter)),
                debounceTime(200),
                filter(() => this._pressedKeys.length > 0),
                map(() => this._pressedKeys.join('')))
            .subscribe(term => {
                const item = this.itemsList.findByLabel(term);
                if (item) {
                    if (this.isOpen) {
                        this.itemsList.markItem(item);
                        this._cd.markForCheck();
                    } else {
                        this.select(item);
                    }
                }
                this._pressedKeys = [];
            });
    }

    private _updateNgModel() {
        const model = [];
        for (const item of this.selectedItems) {
            if (this.bindValue) {
                let resolvedValue = null;
                if (item.hasChildren) {
                    resolvedValue = item.value[this.groupBy];
                } else {
                    resolvedValue = this.itemsList.resolveNested(item.value, this.bindValue);
                }
                model.push(resolvedValue);
            } else {
                model.push(item.value);
            }
        }

        if (this.multiple) {
            this._onChange(model);
            this.changeEvent.emit(this.selectedItems.map(x => x.value));
        } else {
            this._onChange(isDefined(model[0]) ? model[0] : null);
            this.changeEvent.emit(this.selectedItems[0] && this.selectedItems[0].value);
        }

        this._cd.markForCheck();
    }

    private _clearSearch() {
        if (!this.filterValue) {
            return;
        }

        this.filterValue = null;
        this.itemsList.resetItems();
    }

    private _scrollToMarked() {
        if (!this.isOpen || !this.dropdownPanel) {
            return;
        }
        this.dropdownPanel.scrollInto(this.itemsList.markedItem);
    }

    private _scrollToTag() {
        if (!this.isOpen || !this.dropdownPanel) {
            return;
        }
        this.dropdownPanel.scrollIntoTag();
    }

    private _handleTab($event: KeyboardEvent) {
        if (!this.isOpen) {
            return;
        }
        if (this.selectOnTab) {
            if (this.itemsList.markedItem) {
                this.toggleItem(this.itemsList.markedItem);
                $event.preventDefault();
            } else if (this.showAddTag()) {
                this.selectTag();
                $event.preventDefault();
            } else {
                this.close();
            }
        } else {
            this.close();
        }
    }

    private _handleEnter($event: KeyboardEvent) {
        if (this.isOpen) {
            if (this.itemsList.markedItem) {
                this.toggleItem(this.itemsList.markedItem);
            } else if (this.addTag) {
                this.selectTag();
            }
        }
        $event.preventDefault();
        $event.stopPropagation();
    }

    private _handleSpace($event: KeyboardEvent) {
        if (this.isOpen) {
            return;
        }
        this.open();
        $event.preventDefault();
    }

    private _handleArrowDown($event: KeyboardEvent) {
        if (this.nextItemIsTag(+1)) {
            this.itemsList.unmarkItem();
            this._scrollToTag();
        } else {
            this.itemsList.markNextItem();
            this._scrollToMarked();
        }
        this.open();
        $event.preventDefault();
    }

    private _handleArrowUp($event: KeyboardEvent) {
        if (!this.isOpen) {
            return;
        }

        if (this.nextItemIsTag(-1)) {
            this.itemsList.unmarkItem();
            this._scrollToTag();
        } else {
            this.itemsList.markPreviousItem();
            this._scrollToMarked();
        }
        $event.preventDefault();
    }

    private nextItemIsTag(nextStep: number): boolean {
        const nextIndex = this.itemsList.markedIndex + nextStep;
        return this.addTag && this.filterValue
            && this.itemsList.markedItem
            && (nextIndex < 0 || nextIndex === this.itemsList.filteredItems.length)
    }

    private _handleBackspace() {
        if (this.filterValue || !this.clearable || !this.hasValue) {
            return;
        }

        if (this.multiple) {
            this.itemsList.unselectLast();
            this._updateNgModel();
        } else {
            this.clearModel();
        }
    }

    private get _isTypeahead() {
        return this.typeahead && this.typeahead.observers.length > 0;
    }

    private _mergeGlobalConfig(config: SelectGuruConfig) {
        this.notFoundText = this.notFoundText || config.notFoundText;
        this.typeToSearchText = this.typeToSearchText || config.typeToSearchText;
        this.addTagText = this.addTagText || config.addTagText;
        this.loadingText = this.loadingText || config.loadingText;
        this.clearAllText = this.clearAllText || config.clearAllText;
    }
}
