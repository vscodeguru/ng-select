import {
    async, ComponentFixture, discardPeriodicTasks, fakeAsync, TestBed, tick
} from '@angular/core/testing';

import { By } from '@angular/platform-browser';
import {
    DebugElement,
    Component,
    ViewChild,
    Type,
    ErrorHandler,
    NgZone
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SelectGuruModule } from './ng-select.module';
import { SelectGuruComponent } from './ng-select.component';
import { KeyCode, SelectGuruOption } from './ng-select.types';
import { Subject } from 'rxjs/Subject';
import { WindowService } from './window.service';
import { TestsErrorHandler, tickAndDetectChanges, triggerKeyDownEvent, getNgSelectElement, selectOption } from '../testing/helpers';
import { MockNgZone, MockNgWindow, MockConsole } from '../testing/mocks';
import { ConsoleService } from './console.service';

describe('NgSelectComponent', function () {

    describe('Data source', () => {
        it('should set items from primitive numbers array', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="[0, 30, 60, 90, 120, 180, 240]">
                </ng-select>`);

            tickAndDetectChanges(fixture);
            const itemsList = fixture.componentInstance.select.itemsList;
            expect(itemsList.items.length).toBe(7);
            expect(itemsList.items[0]).toEqual(jasmine.objectContaining({
                label: '0',
                value: 0
            }));
        }));

        it('should set ng-option dom elements', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [(ngModel)]="selectedCityId">
                    <ng-option [value]="'a'">A</ng-option>
                    <ng-option [value]="'b'">B</ng-option>
                </ng-select>`);

            tickAndDetectChanges(fixture);
            const itemsList = fixture.componentInstance.select.itemsList;
            expect(itemsList.items.length).toBe(2);
            expect(itemsList.items[0]).toEqual(jasmine.objectContaining({
                label: 'A',
                value: 'a'
            }));
            expect(itemsList.items[1]).toEqual(jasmine.objectContaining({
                label: 'B',
                value: 'b'
            }));
        }));
    });

    describe('Model bindings', () => {
        it('should update ngModel on value change', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                        bindLabel="name"
                        [clearable]="true"
                        [(ngModel)]="selectedCity">
                </ng-select>`);

            selectOption(fixture, KeyCode.ArrowDown, 1);
            tickAndDetectChanges(fixture);
            expect(fixture.componentInstance.selectedCity).toEqual(jasmine.objectContaining(fixture.componentInstance.cities[1]));

            fixture.componentInstance.select.clearModel();
            tickAndDetectChanges(fixture);

            expect(fixture.componentInstance.selectedCity).toEqual(null);
            discardPeriodicTasks();
        }));

        it('should update internal model on ngModel change', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                        bindLabel="name"
                        [clearable]="true"
                        [(ngModel)]="selectedCity">
                </ng-select>`);

            fixture.componentInstance.selectedCity = fixture.componentInstance.cities[0];
            tickAndDetectChanges(fixture);
            expect(fixture.componentInstance.select.selectedItems).toEqual([
                jasmine.objectContaining({
                    value: fixture.componentInstance.cities[0]
                })
            ]);

            fixture.componentInstance.selectedCity = null;
            tickAndDetectChanges(fixture);

            expect(fixture.componentInstance.select.selectedItems).toEqual([]);
            discardPeriodicTasks();
        }));

        it('should update internal model after it was toggled with *ngIf', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select *ngIf="visible"
                        [items]="cities"
                        bindLabel="name"
                        [clearable]="true"
                        [(ngModel)]="selectedCity">
                </ng-select>`);

            // select first city
            fixture.componentInstance.selectedCity = fixture.componentInstance.cities[0];
            tickAndDetectChanges(fixture);

            // toggle to hide/show
            fixture.componentInstance.toggleVisible();
            tickAndDetectChanges(fixture);
            fixture.componentInstance.toggleVisible();
            tickAndDetectChanges(fixture);

            fixture.componentInstance.selectedCity = null;
            tickAndDetectChanges(fixture);

            expect(fixture.componentInstance.select.selectedItems).toEqual([]);
        }));

        it('should set items correctly after ngModel set first when bindValue is used', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                        bindLabel="name"
                        bindValue="id"
                        [clearable]="true"
                        [(ngModel)]="selectedCityId">
                </ng-select>`);

            fixture.componentInstance.cities = [];
            fixture.componentInstance.selectedCityId = 7;
            tickAndDetectChanges(fixture);

            fixture.componentInstance.cities = [{ id: 7, name: 'Pailgis' }];
            tickAndDetectChanges(fixture);

            const select = fixture.componentInstance.select;
            expect(select.selectedItems[0]).toBe(select.itemsList.items[0]);
            expect(select.selectedItems).toEqual([jasmine.objectContaining({
                value: { id: 7, name: 'Pailgis' }
            })]);
        }));

        it('should set items correctly after ngModel set first when bindValue is not used', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                        bindLabel="name"
                        [clearable]="true"
                        [(ngModel)]="selectedCity">
                </ng-select>`);

            fixture.componentInstance.cities = [];
            fixture.componentInstance.selectedCity = { id: 7, name: 'Pailgis' };
            tickAndDetectChanges(fixture);

            fixture.componentInstance.cities = [{ id: 7, name: 'Pailgis' }];
            tickAndDetectChanges(fixture);

            const select = fixture.componentInstance.select;
            expect(select.selectedItems[0]).toBe(select.itemsList.items[0]);
            expect(select.selectedItems).toEqual([jasmine.objectContaining({
                value: { id: 7, name: 'Pailgis' }
            })]);
        }));

        it('should set items correctly after ngModel set first when typeahead and single select is used', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                    bindLabel="name"
                    [typeahead]="filter"
                    placeholder="select value"
                    [(ngModel)]="selectedCity">
                </ng-select>`);

            const select = fixture.componentInstance.select;
            fixture.componentInstance.selectedCity = { id: 1, name: 'Vilnius' };
            tickAndDetectChanges(fixture);
            expect(select.selectedItems).toEqual([
                jasmine.objectContaining({ label: 'Vilnius', value: { id: 1, name: 'Vilnius' } })
            ]);

            fixture.componentInstance.cities = [
                { id: 1, name: 'Vilnius' },
                { id: 2, name: 'Kaunas' },
                { id: 3, name: 'Pabrade' },
            ];
            tickAndDetectChanges(fixture);
            const vilnius = select.itemsList.items[0];
            expect(select.selectedItems[0]).toBe(select.itemsList.items[0]);
            expect(vilnius.selected).toBeTruthy();
        }));

        it('should set items correctly after ngModel set first when typeahead and multi-select is used', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                    bindLabel="name"
                    [multiple]="true"
                    [typeahead]="filter"
                    placeholder="select value"
                    [(ngModel)]="selectedCities">
                </ng-select>`);

            const select = fixture.componentInstance.select;
            fixture.componentInstance.selectedCities = [{ id: 1, name: 'Vilnius' }, { id: 2, name: 'Kaunas' }];
            tickAndDetectChanges(fixture);
            expect(select.selectedItems).toEqual([
                jasmine.objectContaining({ label: 'Vilnius', value: { id: 1, name: 'Vilnius' } }),
                jasmine.objectContaining({ label: 'Kaunas', value: { id: 2, name: 'Kaunas' } })
            ]);

            fixture.componentInstance.cities = [
                { id: 1, name: 'Vilnius' },
                { id: 2, name: 'Kaunas' },
                { id: 3, name: 'Pabrade' },
            ];
            tickAndDetectChanges(fixture);
            const vilnius = select.itemsList.items[0];
            const kaunas = select.itemsList.items[1];
            expect(select.selectedItems[0]).toBe(vilnius);
            expect(vilnius.selected).toBeTruthy();
            expect(select.selectedItems[1]).toBe(kaunas);
            expect(kaunas.selected).toBeTruthy();
        }));

        it('should set items correctly if there is no bindLabel', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select 
                    [items]="cities"
                    [clearable]="true"
                    [(ngModel)]="selectedCity">
                </ng-select>`);

            const cities = [{ id: 7, name: 'Pailgis' }];
            fixture.componentInstance.selectedCity = { id: 7, name: 'Pailgis' };
            tickAndDetectChanges(fixture);
            fixture.componentInstance.cities = [{ id: 1, name: 'Vilnius' }, { id: 2, name: 'Kaunas' }];
            tickAndDetectChanges(fixture);
            expect(fixture.componentInstance.select.selectedItems[0]).toEqual(jasmine.objectContaining({
                value: cities[0]
            }));
        }));

        it('should bind ngModel object even if items are empty', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                        bindLabel="name"
                        [clearable]="true"
                        [(ngModel)]="selectedCity">
                </ng-select>`);

            fixture.componentInstance.cities = [];
            tickAndDetectChanges(fixture);

            fixture.componentInstance.selectedCity = { id: 7, name: 'Pailgis' };
            tickAndDetectChanges(fixture);

            expect(fixture.componentInstance.select.selectedItems).toEqual([jasmine.objectContaining({
                value: { id: 7, name: 'Pailgis' },
                selected: true
            })]);
        }));

        it('should bind ngModel simple value even if items are empty', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="citiesNames"
                        [clearable]="true"
                        [(ngModel)]="selectedCity">
                </ng-select>`);

            fixture.componentInstance.cities = [];
            tickAndDetectChanges(fixture);
            fixture.componentInstance.selectedCity = <any>'Kaunas';
            tickAndDetectChanges(fixture);

            expect(fixture.componentInstance.select.selectedItems).toEqual([jasmine.objectContaining({
                value: 'Kaunas',
                label: 'Kaunas',
                selected: true
            })]);
        }));

        it('should preserve latest selected value when items are changing', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                        bindLabel="name"
                        [clearable]="true"
                        [(ngModel)]="selectedCity">
                </ng-select>`);

            fixture.componentInstance.selectedCity = fixture.componentInstance.cities[0];
            tickAndDetectChanges(fixture);


            fixture.componentInstance.select.select(fixture.componentInstance.select.itemsList.items[1]);
            tickAndDetectChanges(fixture);

            fixture.componentInstance.cities = [...fixture.componentInstance.cities];
            tickAndDetectChanges(fixture);

            expect(fixture.componentInstance.selectedCity).toEqual(fixture.componentInstance.cities[1]);

            fixture.componentInstance.select.clearModel();
            fixture.componentInstance.cities = [...fixture.componentInstance.cities];
            tickAndDetectChanges(fixture);

            expect(fixture.componentInstance.selectedCity).toBeNull();
        }));

        it('should clear previous single select value when setting new model', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                        bindLabel="name"
                        [clearable]="true"
                        [(ngModel)]="selectedCity">
                </ng-select>`);

            fixture.componentInstance.selectedCity = fixture.componentInstance.cities[0];
            tickAndDetectChanges(fixture);

            const lastSelection: any = fixture.componentInstance.select.selectedItems[0];
            expect(lastSelection.selected).toBeTruthy();

            fixture.componentInstance.selectedCity = null;
            tickAndDetectChanges(fixture);
            expect(lastSelection.selected).toBeFalsy();
        }));

        it('should clear previous multiple select value when setting new model', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                        bindLabel="name"
                        [multiple]="true"
                        [clearable]="true"
                        [(ngModel)]="selectedCities">
                </ng-select>`);

            fixture.componentInstance.selectedCities = [fixture.componentInstance.cities[0]];
            tickAndDetectChanges(fixture);
            const select = fixture.componentInstance.select;
            expect(select.selectedItems.length).toBe(1);

            fixture.componentInstance.selectedCities = [fixture.componentInstance.cities[1]];
            tickAndDetectChanges(fixture);
            expect(select.selectedItems.length).toBe(1);

            fixture.componentInstance.selectedCities = [];
            tickAndDetectChanges(fixture);
            expect(select.selectedItems.length).toBe(0);
        }));

        it('should not add selected items to new items list when [items] are changed', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                        bindLabel="name"
                        [multiple]="true"
                        [clearable]="true"
                        [(ngModel)]="selectedCities">
                </ng-select>`);

            fixture.componentInstance.selectedCities = [...fixture.componentInstance.cities.slice(0, 2)];
            tickAndDetectChanges(fixture);

            fixture.componentInstance.cities = [{ id: 1, name: 'New city' }];
            tickAndDetectChanges(fixture);

            const internalItems = fixture.componentInstance.select.itemsList.items;
            expect(internalItems.length).toBe(1);
            expect(internalItems[0].value).toEqual(jasmine.objectContaining({ id: 1, name: 'New city' }));
        }));

        it('bind to custom object properties', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                            bindLabel="name"
                            bindValue="id"
                            [(ngModel)]="selectedCityId">
                </ng-select>`);

            // from component to model
            selectOption(fixture, KeyCode.ArrowDown, 0);
            tickAndDetectChanges(fixture);
            expect(fixture.componentInstance.selectedCityId).toEqual(1);

            // from model to component
            fixture.componentInstance.selectedCityId = 2;
            tickAndDetectChanges(fixture);
            expect(fixture.componentInstance.select.selectedItems).toEqual([jasmine.objectContaining({
                value: fixture.componentInstance.cities[1]
            })]);
        }));

        it('bind to nested label property', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="countries"
                            bindLabel="description.name"
                            [(ngModel)]="selectedCountry">
                </ng-select>`);

            selectOption(fixture, KeyCode.ArrowDown, 1);
            fixture.detectChanges();
            expect(fixture.componentInstance.select.selectedItems).toEqual([jasmine.objectContaining({
                label: 'USA',
                value: fixture.componentInstance.countries[1]
            })]);

            fixture.componentInstance.selectedCountry = fixture.componentInstance.countries[0];
            tickAndDetectChanges(fixture);
            expect(fixture.componentInstance.select.selectedItems).toEqual([jasmine.objectContaining({
                label: 'Lithuania',
                value: fixture.componentInstance.countries[0]
            })]);
        }));

        it('bind to nested value property', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="countries"
                            bindLabel="description.name"
                            bindValue="description.id"
                            [(ngModel)]="selectedCountry">
                </ng-select>`);

            selectOption(fixture, KeyCode.ArrowDown, 1);
            tickAndDetectChanges(fixture);
            expect(fixture.componentInstance.selectedCountry).toEqual('b');

            fixture.componentInstance.selectedCountry = fixture.componentInstance.countries[2].description.id;
            tickAndDetectChanges(fixture);
            expect(fixture.componentInstance.select.selectedItems).toEqual([jasmine.objectContaining({
                label: 'Australia',
                value: fixture.componentInstance.countries[2]
            })]);

            selectOption(fixture, KeyCode.ArrowUp, 1);
            tickAndDetectChanges(fixture);
            expect(fixture.componentInstance.selectedCountry).toEqual('b');
        }));

        it('bind to simple array', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="citiesNames"
                            [(ngModel)]="selectedCity">
                </ng-select>`);

            selectOption(fixture, KeyCode.ArrowDown, 0);
            tickAndDetectChanges(fixture);
            expect(fixture.componentInstance.selectedCity).toBe(<any>'Vilnius');
            fixture.componentInstance.selectedCity = <any>'Kaunas';
            tickAndDetectChanges(fixture);
            expect(fixture.componentInstance.select.selectedItems)
                .toEqual([jasmine.objectContaining({ label: 'Kaunas', value: 'Kaunas' })]);
        }));

        it('bind to object', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                            bindLabel="name"
                            [(ngModel)]="selectedCity">
                </ng-select>`);

            // from component to model
            selectOption(fixture, KeyCode.ArrowDown, 0);
            tickAndDetectChanges(fixture);
            expect(fixture.componentInstance.selectedCity).toEqual(fixture.componentInstance.cities[0]);

            // from model to component
            fixture.componentInstance.selectedCity = fixture.componentInstance.cities[1];
            tickAndDetectChanges(fixture);

            expect(fixture.componentInstance.select.selectedItems).toEqual([jasmine.objectContaining({
                value: fixture.componentInstance.cities[1]
            })]);
            discardPeriodicTasks();
        }));

        it('bind to dom ng-option value object', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [(ngModel)]="selectedCityId">
                    <ng-option [value]="1">A</ng-option>
                    <ng-option [value]="2">B</ng-option>
                </ng-select>`);

            // from component to model
            selectOption(fixture, KeyCode.ArrowDown, 0);
            tickAndDetectChanges(fixture);
            expect(fixture.componentInstance.selectedCityId).toEqual(1);

            // from model to component
            fixture.componentInstance.selectedCityId = 2
            tickAndDetectChanges(fixture);

            expect(fixture.componentInstance.select.selectedItems).toEqual([jasmine.objectContaining({
                value: 2,
                label: 'B'
            })]);
            discardPeriodicTasks();
        }));

        it('should not set internal model when single select ngModel is not valid', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                        bindLabel="name"
                        [clearable]="true"
                        [multiple]="false"
                        [(ngModel)]="selectedCity">
                </ng-select>`);

            const invalidValues = [undefined, null];

            for (let v of invalidValues) {
                fixture.componentInstance.selectedCity = <any>v;
                tickAndDetectChanges(fixture);
                expect(fixture.componentInstance.select.selectedItems.length).toBe(0);
            }
        }));

        it('should not set internal model when multiselect ngModel is not valid', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                        bindLabel="name"
                        [clearable]="true"
                        [multiple]="true"
                        [(ngModel)]="selectedCity">
                </ng-select>`);

            const invalidValues = [{}, '', undefined, 0, 1, 'false', 'true', false];

            for (let v of invalidValues) {
                fixture.componentInstance.selectedCity = <any>v;
                tickAndDetectChanges(fixture);
                expect(fixture.componentInstance.select.selectedItems.length).toBe(0);
            }
        }));

        describe('Pre-selected model', () => {
            describe('single', () => {
                it('should select by bindValue when primitive type', fakeAsync(() => {
                    const fixture = createTestingModule(
                        NgSelectTestCmp,
                        `<ng-select [items]="cities"
                            bindLabel="name"
                            bindValue="id"
                            placeholder="select value"
                            [(ngModel)]="selectedCityId">
                        </ng-select>`);

                    fixture.componentInstance.selectedCityId = 2;
                    tickAndDetectChanges(fixture);
                    const result = [jasmine.objectContaining({
                        value: { id: 2, name: 'Kaunas' },
                        selected: true
                    })];
                    const select = fixture.componentInstance.select;
                    expect(select.selectedItems).toEqual(result);
                }));

                it('should apply host css classes', fakeAsync(() => {
                    const fixture = createTestingModule(
                        NgSelectTestCmp,
                        `<ng-select [items]="cities"
                            bindLabel="name"
                            bindValue="id"
                            placeholder="select value"
                            [(ngModel)]="selectedCityId">
                        </ng-select>`);

                    fixture.componentInstance.selectedCityId = 2;
                    tickAndDetectChanges(fixture);
                    tickAndDetectChanges(fixture);

                    const classes = ['ng-select', 'ng-select-single', 'ng-select-searchable'];
                    const selectEl = fixture.nativeElement.querySelector('ng-select');
                    for (const c of classes) {
                        expect(selectEl.classList.contains(c)).toBeTruthy(`expected to contain "${c}" class`);
                    }
                    let hasValueEl = fixture.nativeElement.querySelector('.ng-has-value');
                    expect(hasValueEl).not.toBeNull();

                    fixture.componentInstance.selectedCityId = null;
                    tickAndDetectChanges(fixture);
                    tickAndDetectChanges(fixture);
                    hasValueEl = fixture.nativeElement.querySelector('.ng-has-value');
                    expect(hasValueEl).toBeNull();
                }));

                it('should select by bindValue ', fakeAsync(() => {
                    const fixture = createTestingModule(
                        NgSelectTestCmp,
                        `<ng-select [items]="cities"
                            bindLabel="name"
                            bindValue="id"
                            placeholder="select value"
                            [(ngModel)]="selectedCityId">
                        </ng-select>`);

                    fixture.componentInstance.cities = [{ id: 0, name: 'Vilnius' }];
                    fixture.componentInstance.selectedCityId = 0;

                    tickAndDetectChanges(fixture);

                    const result = [jasmine.objectContaining({
                        value: { id: 0, name: 'Vilnius' },
                        selected: true
                    })];
                    expect(fixture.componentInstance.select.selectedItems).toEqual(result);
                }));

                it('should select by bindLabel when binding to object', fakeAsync(() => {
                    const fixture = createTestingModule(
                        NgSelectTestCmp,
                        `<ng-select [items]="cities"
                            bindLabel="name"
                            placeholder="select value"
                            [(ngModel)]="selectedCity">
                        </ng-select>`);

                    fixture.componentInstance.selectedCity = { id: 2, name: 'Kaunas' };
                    tickAndDetectChanges(fixture);
                    const result = [jasmine.objectContaining({
                        value: { id: 2, name: 'Kaunas' },
                        selected: true
                    })];
                    expect(fixture.componentInstance.select.selectedItems).toEqual(result);
                }));

                it('should select by object reference', fakeAsync(() => {
                    const fixture = createTestingModule(
                        NgSelectTestCmp,
                        `<ng-select [items]="cities"
                            bindLabel="name"
                            placeholder="select value"
                            [(ngModel)]="selectedCity">
                        </ng-select>`);

                    fixture.componentInstance.selectedCity = fixture.componentInstance.cities[1];
                    tickAndDetectChanges(fixture);
                    const result = [jasmine.objectContaining({
                        value: { id: 2, name: 'Kaunas' },
                        selected: true
                    })];
                    expect(fixture.componentInstance.select.selectedItems).toEqual(result);
                }));

                it('should select by compareWith function', fakeAsync(() => {
                    const fixture = createTestingModule(
                        NgSelectTestCmp,
                        `<ng-select [items]="cities"
                            bindLabel="name"
                            placeholder="select value"
                            [compareWith]="compareWith"
                            [(ngModel)]="selectedCity">
                        </ng-select>`);


                    const city = { name: 'Vilnius', id: 7, district: 'Ozo parkas' };
                    fixture.componentInstance.cities.push(city);
                    fixture.componentInstance.cities = [...fixture.componentInstance.cities];
                    fixture.componentInstance.selectedCity = { name: 'Vilnius', district: 'Ozo parkas' } as any;

                    tickAndDetectChanges(fixture);
                    expect(fixture.componentInstance.select.selectedItems[0].value).toEqual(city);
                }));

                it('should select selected when there is no items', fakeAsync(() => {
                    const fixture = createTestingModule(
                        NgSelectTestCmp,
                        `<ng-select [items]="cities"
                            bindLabel="name"
                            bindValue="id"
                            placeholder="select value"
                            [(ngModel)]="selectedCityId">
                        </ng-select>`);

                    fixture.componentInstance.cities = [];
                    fixture.componentInstance.selectedCityId = 2;
                    tickAndDetectChanges(fixture);
                    const selected = fixture.componentInstance.select.selectedItems[0];
                    expect(selected.label).toEqual('');
                    expect(selected.value).toEqual({ name: null, id: 2 });
                }));
            });

            describe('multiple', () => {
                const result = [
                    jasmine.objectContaining({
                        value: { id: 2, name: 'Kaunas' },
                        selected: true
                    }),
                    jasmine.objectContaining({
                        value: { id: 3, name: 'Pabrade' },
                        selected: true
                    })];

                it('should select by bindValue when primitive type', fakeAsync(() => {
                    const fixture = createTestingModule(
                        NgSelectTestCmp,
                        `<ng-select [items]="cities"
                            bindLabel="name"
                            bindValue="id"
                            multiple="true"
                            placeholder="select value"
                            [(ngModel)]="selectedCityIds">
                        </ng-select>`);

                    fixture.componentInstance.selectedCityIds = [2, 3];
                    tickAndDetectChanges(fixture);

                    expect(fixture.componentInstance.select.selectedItems).toEqual(result)
                }));

                it('should select by bindLabel when binding to object', fakeAsync(() => {
                    const fixture = createTestingModule(
                        NgSelectTestCmp,
                        `<ng-select [items]="cities"
                            bindLabel="name"
                            multiple="true"
                            placeholder="select value"
                            [(ngModel)]="selectedCities">
                        </ng-select>`);

                    fixture.componentInstance.selectedCities = [{ id: 2, name: 'Kaunas' }, { id: 3, name: 'Pabrade' }];
                    tickAndDetectChanges(fixture);
                    expect(fixture.componentInstance.select.selectedItems).toEqual(result);
                }));
            });
        });
    });

    describe('Dropdown panel', () => {
        it('should set and render items in dropdown panel', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                            bindLabel="name"
                            [(ngModel)]="city">
                </ng-select>`);

            const select = fixture.componentInstance.select;
            select.open();

            expect(select.dropdownPanel.items.length).toBe(3);
            let options = fixture.debugElement.nativeElement.querySelectorAll('.ng-option');
            expect(options.length).toBe(3);
            expect(options[0].innerText).toBe('Vilnius');
            expect(options[1].innerText).toBe('Kaunas');
            expect(options[2].innerText).toBe('Pabrade');

            fixture.componentInstance.cities = Array.from(Array(30).keys()).map((_, i) => ({ id: i, name: String.fromCharCode(97 + i) }));
            tickAndDetectChanges(fixture);
            options = fixture.debugElement.nativeElement.querySelectorAll('.ng-option');
            expect(options.length).toBe(30);
            expect(options[0].innerText).toBe('a');
        }));

        it('should set and render items in dropdown panel with virtual scroll', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                            bindLabel="name"
                            [virtualScroll]="true"
                            [(ngModel)]="city">
                </ng-select>`);

            const select = fixture.componentInstance.select;
            select.open();

            expect(fixture.componentInstance.select.dropdownPanel.items.length).toBe(3);
            let options = fixture.debugElement.nativeElement.querySelectorAll('.ng-option');
            expect(options.length).toBe(3);
            expect(options[0].innerText).toBe('Vilnius');
            expect(options[1].innerText).toBe('Kaunas');
            expect(options[2].innerText).toBe('Pabrade');

            fixture.componentInstance.cities = Array.from(Array(30).keys()).map((_, i) => ({ id: i, name: String.fromCharCode(97 + i) }));
            tickAndDetectChanges(fixture);
            options = fixture.debugElement.nativeElement.querySelectorAll('.ng-option');
            expect(options.length).toBe(6);
            expect(options[0].innerText).toBe('a');
        }));

        it('should scroll to item and do not change scroll position when scrolled to visible item', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                            bindLabel="name"
                            [(ngModel)]="city">
                </ng-select>`);
            const cmp = fixture.componentInstance;
            const el: HTMLElement = fixture.debugElement.nativeElement;

            cmp.select.open();
            tickAndDetectChanges(fixture);

            cmp.cities = Array.from(Array(30).keys()).map((_, i) => ({ id: i, name: String.fromCharCode(97 + i) }));
            tickAndDetectChanges(fixture);

            cmp.select.dropdownPanel.scrollInto(cmp.select.itemsList.items[1]);
            tickAndDetectChanges(fixture);

            const panelItems = el.querySelector('.ng-dropdown-panel-items');
            expect(panelItems.scrollTop).toBe(0);
        }));

        it('should scroll to item and change scroll position when scrolled to not visible visible item', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                            bindLabel="name"
                            [(ngModel)]="city">
                </ng-select>`);
            const cmp = fixture.componentInstance;
            const el: HTMLElement = fixture.debugElement.nativeElement;

            cmp.select.open();
            tickAndDetectChanges(fixture);

            cmp.cities = Array.from(Array(30).keys()).map((_, i) => ({ id: i, name: String.fromCharCode(97 + i) }));
            tickAndDetectChanges(fixture);

            cmp.select.dropdownPanel.scrollInto(cmp.select.itemsList.items[15]);
            tickAndDetectChanges(fixture);

            const panelItems = el.querySelector('.ng-dropdown-panel-items');
            expect(panelItems.scrollTop).toBe(54);
        }));

        it('should close on option select by default', async(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                            bindLabel="name"
                            [(ngModel)]="city">
                </ng-select>`);

            selectOption(fixture, KeyCode.ArrowDown, 0);
            fixture.detectChanges();

            fixture.whenStable().then(() => {
                expect(fixture.componentInstance.select.isOpen).toBeFalsy();
            })

        }));

        it('should not close on option select when [closeOnSelect]="false"', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                            bindLabel="name"
                            [closeOnSelect]="false"
                            [(ngModel)]="city">
                </ng-select>`);

            selectOption(fixture, KeyCode.ArrowDown, 0);
            tickAndDetectChanges(fixture);

            expect(fixture.componentInstance.select.isOpen).toBeTruthy();
        }));
    });

    describe('Keyboard events', () => {
        let fixture: ComponentFixture<NgSelectTestCmp>;
        let select: SelectGuruComponent;

        beforeEach(() => {
            fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                        bindLabel="name"
                        [loading]="citiesLoading"
                        [selectOnTab]="selectOnTab"
                        [multiple]="multiple"
                        [(ngModel)]="selectedCity">
                </ng-select>`);
            select = fixture.componentInstance.select;
        });

        describe('space', () => {
            it('should open dropdown', () => {
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
                expect(select.isOpen).toBe(true);
            });

            it('should open empty dropdown if no items', fakeAsync(() => {
                fixture.componentInstance.cities = [];
                tickAndDetectChanges(fixture);
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
                tickAndDetectChanges(fixture);
                const text = fixture.debugElement.query(By.css('.ng-option')).nativeElement.innerHTML;
                expect(text).toContain('No items found');
            }));

            it('should open dropdown with loading message', fakeAsync(() => {
                fixture.componentInstance.cities = [];
                fixture.componentInstance.citiesLoading = true;
                tickAndDetectChanges(fixture);
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
                tickAndDetectChanges(fixture);
                const options = fixture.debugElement.queryAll(By.css('.ng-option'));
                expect(options.length).toBe(1);
                expect(options[0].nativeElement.innerHTML).toContain('Loading...');
            }));

            it('should open dropdown and mark first item', () => {
                const result = { value: fixture.componentInstance.cities[0] };
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
                expect(select.itemsList.markedItem).toEqual(jasmine.objectContaining(result));
            });

            it('should open dropdown and mark first not disabled item', fakeAsync(() => {
                fixture.componentInstance.cities[0].disabled = true;
                fixture.componentInstance.cities = [...fixture.componentInstance.cities];
                tickAndDetectChanges(fixture);
                const result = { value: fixture.componentInstance.cities[1] };
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
                expect(select.itemsList.markedItem).toEqual(jasmine.objectContaining(result));
            }));

            it('should open dropdown without marking first item', () => {
                select.markFirst = false;
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
                expect(select.itemsList.markedItem).toEqual(undefined);
            });
        });

        describe('arrows', () => {
            it('should select next value on arrow down', () => {
                selectOption(fixture, KeyCode.ArrowDown, 1);
                const result = [jasmine.objectContaining({
                    value: fixture.componentInstance.cities[1]
                })];
                expect(select.selectedItems).toEqual(result);
            });

            it('should stop marked loop if all items disabled', fakeAsync(() => {
                fixture.componentInstance.cities[0].disabled = true;
                fixture.componentInstance.cities = [...fixture.componentInstance.cities]
                tickAndDetectChanges(fixture);
                select.filter('vil');
                tickAndDetectChanges(fixture);
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.ArrowDown);
                expect(select.itemsList.markedItem).toBeUndefined();
            }));

            it('should select first value on arrow down when current value is last', fakeAsync(() => {
                fixture.componentInstance.selectedCity = fixture.componentInstance.cities[2];
                tickAndDetectChanges(fixture);
                selectOption(fixture, KeyCode.ArrowDown, 1);
                tickAndDetectChanges(fixture);
                const result = [jasmine.objectContaining({
                    value: fixture.componentInstance.cities[0]
                })];
                expect(select.selectedItems).toEqual(result);
            }));

            it('should skip disabled option and select next one', fakeAsync(() => {
                const city: any = fixture.componentInstance.cities[0];
                city.disabled = true;
                selectOption(fixture, KeyCode.ArrowDown, 1);
                tickAndDetectChanges(fixture);
                const result = [jasmine.objectContaining({
                    value: fixture.componentInstance.cities[1]
                })];
                expect(select.selectedItems).toEqual(result);
            }));

            it('should select previous value on arrow up', fakeAsync(() => {
                fixture.componentInstance.selectedCity = fixture.componentInstance.cities[1];
                tickAndDetectChanges(fixture);
                selectOption(fixture, KeyCode.ArrowUp, 1);
                tickAndDetectChanges(fixture);
                const result = [jasmine.objectContaining({
                    value: fixture.componentInstance.cities[0]
                })];
                expect(select.selectedItems).toEqual(result);
            }));

            it('should select last value on arrow up', () => {
                selectOption(fixture, KeyCode.ArrowUp, 1);
                const result = [jasmine.objectContaining({
                    value: fixture.componentInstance.cities[2]
                })];
                expect(select.selectedItems).toEqual(result);
            });
        });

        describe('esc', () => {
            it('should close opened dropdown', () => {
                select.isOpen = true;
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Esc);
                expect(select.isOpen).toBe(false);
            });
        });

        describe('tab', () => {
            it('should close dropdown when there are no items', fakeAsync(() => {
                select.filter('random stuff');
                tick(200);
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Tab);
                expect(select.isOpen).toBeFalsy()
            }));

            it('should close dropdown when [selectOnTab]="false"', fakeAsync(() => {
                fixture.componentInstance.selectOnTab = false;
                tickAndDetectChanges(fixture);
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Tab);
                expect(select.selectedItems).toEqual([]);
                expect(select.isOpen).toBeFalsy();
            }));

            it('should close dropdown and keep selected value', fakeAsync(() => {
                fixture.componentInstance.selectedCity = fixture.componentInstance.cities[0];
                tickAndDetectChanges(fixture);
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Tab);
                tickAndDetectChanges(fixture);
                const result = [jasmine.objectContaining({
                    value: fixture.componentInstance.cities[0]
                })];
                expect(select.selectedItems).toEqual(result);
                expect(select.isOpen).toBeFalsy()
            }));

            it('should mark first item on filter when tab', fakeAsync(() => {
                tick(200);
                fixture.componentInstance.select.filter('pab');
                tick(200);

                const result = jasmine.objectContaining({
                    value: fixture.componentInstance.cities[2]
                });
                expect(fixture.componentInstance.select.itemsList.markedItem).toEqual(result)
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Tab);
                expect(fixture.componentInstance.select.selectedItems).toEqual([result]);
            }));
        });

        describe('backspace', () => {
            it('should remove selected value', fakeAsync(() => {
                fixture.componentInstance.selectedCity = fixture.componentInstance.cities[0];
                tickAndDetectChanges(fixture);
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Backspace);
                expect(select.selectedItems).toEqual([]);
            }));

            it('should not remove selected value if filter is set', fakeAsync(() => {
                select.filterValue = 'a';
                fixture.componentInstance.selectedCity = fixture.componentInstance.cities[0];
                tickAndDetectChanges(fixture);
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Backspace);
                const result = [jasmine.objectContaining({
                    value: fixture.componentInstance.cities[0]
                })];
                expect(select.selectedItems).toEqual(result);
            }));

            it('should not remove selected value when clearable is false', fakeAsync(() => {
                select.clearable = false;
                fixture.componentInstance.selectedCity = fixture.componentInstance.cities[0];
                tickAndDetectChanges(fixture);
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Backspace);
                const result = [jasmine.objectContaining({
                    value: fixture.componentInstance.cities[0]
                })];
                expect(select.selectedItems).toEqual(result);
            }));

            it('should do nothing when there is no selection', fakeAsync(() => {
                const clear = spyOn(select, 'clearModel');
                tickAndDetectChanges(fixture);
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Backspace);
                expect(clear).not.toHaveBeenCalled();
            }));

            it('should remove last selected value when multiple', fakeAsync(() => {
                fixture.componentInstance.multiple = true;
                fixture.componentInstance.cities = [...fixture.componentInstance.cities];
                tickAndDetectChanges(fixture);
                selectOption(fixture, KeyCode.ArrowDown, 1);
                selectOption(fixture, KeyCode.ArrowDown, 1);
                tickAndDetectChanges(fixture);
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Backspace);
                const result = [jasmine.objectContaining({
                    value: fixture.componentInstance.cities[1]
                })];
                expect(select.selectedItems).toEqual(result);
            }));
        });

        describe('key presses', () => {
            beforeEach(() => {
                select.searchable = false;
                select.ngOnInit();
            });

            it('should select item using key while not opened', fakeAsync(() => {
                triggerKeyDownEvent(getNgSelectElement(fixture), 97, 'v');
                tick(200);

                expect(fixture.componentInstance.selectedCity.name).toBe('Vilnius');
            }));

            it('should mark item using key while opened', fakeAsync(() => {
                const findByLabel = spyOn(select.itemsList, 'findByLabel');
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
                triggerKeyDownEvent(getNgSelectElement(fixture), 97, 'v');
                triggerKeyDownEvent(getNgSelectElement(fixture), 97, 'i');
                triggerKeyDownEvent(getNgSelectElement(fixture), 97, 'l');
                tick(200);

                expect(fixture.componentInstance.selectedCity).toBeUndefined();
                expect(select.itemsList.markedItem.label).toBe('Vilnius')
                expect(findByLabel).toHaveBeenCalledWith('vil')
            }));
        });
    });

    describe('Outside click', () => {
        let fixture: ComponentFixture<NgSelectTestCmp>;
        let select: SelectGuruComponent;
        beforeEach(() => {
            fixture = createTestingModule(
                NgSelectTestCmp,
                `<div id="outside">Outside</div><br />
                <ng-select id="select" [items]="cities"
                    bindLabel="name"
                    multiple="true"
                    [closeOnSelect]="false"
                    appendTo="body"
                    [(ngModel)]="selectedCity">
                </ng-select>`);
            select = fixture.componentInstance.select;
        });

        it('should close dropdown if opened and clicked outside dropdown container', fakeAsync(() => {
            triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
            expect(fixture.componentInstance.select.isOpen).toBeTruthy();
            document.getElementById('outside').click();
            let event = new MouseEvent('mousedown', { bubbles: true });
            document.getElementById('outside').dispatchEvent(event);
            tickAndDetectChanges(fixture);
            expect(fixture.componentInstance.select.isOpen).toBeFalsy();
        }));

        it('should prevent dropdown close if clicked on select', fakeAsync(() => {
            triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
            expect(select.isOpen).toBeTruthy();
            document.getElementById('select').click();
            let event = new MouseEvent('mousedown', { bubbles: true });
            document.getElementById('select').dispatchEvent(event);
            tickAndDetectChanges(fixture);
            expect(select.isOpen).toBeTruthy();
        }));

    });

    describe('Dropdown position', () => {
        it('should auto position dropdown to bottom by default', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"></ng-select>`);

            const select = fixture.componentInstance.select;
            select.open();
            tickAndDetectChanges(fixture);

            const selectClasses = (<HTMLElement>fixture.nativeElement).querySelector('.ng-select').classList;
            const panelClasses = (<HTMLElement>fixture.nativeElement).querySelector('.ng-dropdown-panel').classList;
            expect(select.dropdownPosition).toBe('auto');
            expect(selectClasses.contains('ng-select-bottom')).toBeTruthy();
            expect(panelClasses.contains('ng-select-bottom')).toBeTruthy();
            expect(selectClasses.contains('ng-select-top')).toBeFalsy();
            expect(panelClasses.contains('ng-select-top')).toBeFalsy();
        }));

        it('should auto position dropdown to top if position input is set', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select dropdownPosition="top" [items]="cities"></ng-select>`);

            const select = fixture.componentInstance.select;
            select.open();
            tickAndDetectChanges(fixture);

            const selectClasses = (<HTMLElement>fixture.nativeElement).querySelector('.ng-select').classList;
            const panelClasses = (<HTMLElement>fixture.nativeElement).querySelector('.ng-dropdown-panel').classList;
            expect(select.dropdownPosition).toBe('top');
            expect(selectClasses.contains('ng-select-bottom')).toBeFalsy();
            expect(panelClasses.contains('ng-select-bottom')).toBeFalsy();
            expect(selectClasses.contains('ng-select-top')).toBeTruthy();
            expect(panelClasses.contains('ng-select-top')).toBeTruthy();
        }));

        it('should auto position appended to body dropdown to bottom', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities" appendTo="body"></ng-select>`);

            const select = fixture.componentInstance.select;
            select.open();
            tickAndDetectChanges(fixture);

            const selectClasses = (<HTMLElement>fixture.nativeElement).querySelector('.ng-select').classList;
            const panelClasses = document.querySelector('.ng-dropdown-panel').classList;
            expect(select.dropdownPosition).toBe('auto');
            expect(selectClasses.contains('ng-select-bottom')).toBeTruthy();
            expect(panelClasses.contains('ng-select-bottom')).toBeTruthy();
            expect(selectClasses.contains('ng-select-top')).toBeFalsy();
            expect(panelClasses.contains('ng-select-top')).toBeFalsy();
        }));
    });

    describe('Custom templates', () => {
        it('should display custom header template', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities" [(ngModel)]="selectedCity">
                    <ng-template ng-label-tmp let-item="item">
                        <div class="custom-header">{{item.name}}</div>
                    </ng-template>
                </ng-select>`);

            fixture.componentInstance.selectedCity = fixture.componentInstance.cities[0];
            tickAndDetectChanges(fixture);
            tickAndDetectChanges(fixture);

            const el = fixture.debugElement.query(By.css('.custom-header'));
            expect(el).not.toBeNull();
            expect(el.nativeElement).not.toBeNull();
        }));

        it('should clear item using value', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                            bindLabel="name"
                            [(ngModel)]="city">
                </ng-select>`);

            selectOption(fixture, KeyCode.ArrowDown, 0);
            fixture.detectChanges();
            expect(fixture.componentInstance.select.selectedItems.length).toBe(1);

            fixture.componentInstance.select.clearItem(fixture.componentInstance.cities[0])
            expect(fixture.componentInstance.select.selectedItems.length).toBe(0);
            tick();
        }));

        it('should clear item even if there are no items loaded', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                            bindLabel="name"
                            [(ngModel)]="selectedCity">
                </ng-select>`);

            selectOption(fixture, KeyCode.ArrowDown, 0);
            fixture.detectChanges();
            expect(fixture.componentInstance.select.selectedItems.length).toBe(1);
            const selected = fixture.componentInstance.selectedCity;
            fixture.componentInstance.cities = [];
            fixture.detectChanges();

            fixture.componentInstance.select.clearItem(selected)
            expect(fixture.componentInstance.select.selectedItems.length).toBe(0);
            tick();
        }));

        it('should display custom dropdown option template', async(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities" [(ngModel)]="selectedCity">
                    <ng-template ng-option-tmp let-item="item">
                        <div class="custom-option">{{item.name}}</div>
                    </ng-template>
                </ng-select>`);

            fixture.componentInstance.select.open();
            fixture.detectChanges();

            fixture.whenStable().then(() => {
                const el = fixture.debugElement.query(By.css('.custom-option')).nativeElement;
                expect(el).not.toBeNull();
            });
        }));

        it('should display custom multiple label template', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities" [multiple]="true" [(ngModel)]="selectedCities">
                    <ng-template ng-multi-label-tmp let-items="items">
                        <div class="custom-multi-label">selected {{items.length}}</div>
                    </ng-template>
                </ng-select>`);

            fixture.componentInstance.selectedCities = [fixture.componentInstance.cities[0]];
            tickAndDetectChanges(fixture);
            tickAndDetectChanges(fixture);

            const el = fixture.debugElement.query(By.css('.custom-multi-label')).nativeElement;
            expect(el.innerHTML).toBe('selected 1');
        }));

        it('should display custom footer and header template', async(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities" [(ngModel)]="selectedCity">
                    <ng-template ng-header-tmp>
                        <span class="header-label">header</span>
                    </ng-template>
                    <ng-template ng-footer-tmp>
                        <span class="footer-label">footer</span>
                    </ng-template>
                </ng-select>`);

            fixture.componentInstance.select.open();
            fixture.detectChanges();

            fixture.whenStable().then(() => {
                const header = fixture.debugElement.query(By.css('.header-label')).nativeElement;
                expect(header.innerHTML).toBe('header');

                const footer = fixture.debugElement.query(By.css('.footer-label')).nativeElement;
                expect(footer.innerHTML).toBe('footer');
            });
        }));

        it('should display custom loading and no data found template', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities" 
                            [loading]="citiesLoading"
                            [(ngModel)]="selectedCity">
                    
                    <ng-template ng-notfound-tmp let-searchTerm="searchTerm">
                        <div class="custom-notfound">
                            No data found for "{{searchTerm}}"
                        </div>
                    </ng-template>
                    <ng-template ng-loadingtext-tmp let-searchTerm="searchTerm">
                        <div class="custom-loading">
                            Fetching Data for "{{searchTerm}}"
                        </div>
                    </ng-template>
                </ng-select>`);

            fixture.whenStable().then(() => {
                fixture.componentInstance.cities = [];
                fixture.componentInstance.citiesLoading = true;
                tickAndDetectChanges(fixture);
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
                tickAndDetectChanges(fixture);
                const loadingOption = fixture.debugElement.queryAll(By.css('.custom-loading'));
                expect(loadingOption.length).toBe(1);


                fixture.componentInstance.citiesLoading = false;
                tickAndDetectChanges(fixture);
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
                tickAndDetectChanges(fixture);
                const notFoundOptions = fixture.debugElement.queryAll(By.css('.custom-notfound'));
                expect(notFoundOptions.length).toBe(1);
            });
        }));

        it('should display custom type for search template', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities" 
                            [typeahead]="filter" 
                            [(ngModel)]="selectedCity">
                    <ng-template ng-typetosearch-tmp>
                        <div class="custom-typeforsearch">
                            Start typing...
                        </div>
                    </ng-template>
                   
                </ng-select>`);

            fixture.whenStable().then(() => {
                fixture.componentInstance.cities = [];
                fixture.componentInstance.select.open();
                fixture.componentInstance.filter.subscribe();
                tickAndDetectChanges(fixture);
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
                tickAndDetectChanges(fixture);
                const loadingOption = fixture.debugElement.queryAll(By.css('.custom-typeforsearch'));
                expect(loadingOption.length).toBe(1);
            });
        }));

        it('should create items from ng-option', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [(ngModel)]="selectedCity">
                    <ng-option [value]="true">Yes</ng-option>
                    <ng-option [value]="false">No</ng-option>
                </ng-select>`);

            tickAndDetectChanges(fixture);

            const items = fixture.componentInstance.select.itemsList.items;
            expect(items.length).toBe(2);
            expect(items[0]).toEqual(jasmine.objectContaining({
                label: 'Yes', value: true, disabled: false
            }));
            expect(items[1]).toEqual(jasmine.objectContaining({
                label: 'No', value: false, disabled: false
            }));
        }));

        it('should update ng-option state', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [(ngModel)]="selectedCity">
                    <ng-option [disabled]="disabled" [value]="true">Yes</ng-option>
                    <ng-option [value]="false">No</ng-option>
                </ng-select>`);

            tickAndDetectChanges(fixture);
            const items = fixture.componentInstance.select.itemsList.items;
            expect(items[0].disabled).toBeFalsy();
            fixture.componentInstance.disabled = true;
            tickAndDetectChanges(fixture);
            expect(items[0].disabled).toBeTruthy();
        }));
    });

    describe('Multiple', () => {
        let fixture: ComponentFixture<NgSelectTestCmp>;
        let select: SelectGuruComponent;
        beforeEach(() => {
            fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                    bindLabel="name"
                    placeholder="select value"
                    [(ngModel)]="selectedCities"
                    [multiple]="true">
                </ng-select>`);
        });

        it('should select several items', fakeAsync(() => {
            selectOption(fixture, KeyCode.ArrowDown, 1);
            selectOption(fixture, KeyCode.ArrowDown, 2);
            tickAndDetectChanges(fixture);
            expect((<SelectGuruOption[]>fixture.componentInstance.select.selectedItems).length).toBe(2);
        }));

        it('should toggle selected item', fakeAsync(() => {
            selectOption(fixture, KeyCode.ArrowDown, 0);
            selectOption(fixture, KeyCode.ArrowDown, 2);
            tickAndDetectChanges(fixture);
            expect((<SelectGuruOption[]>fixture.componentInstance.select.selectedItems).length).toBe(2);

            selectOption(fixture, KeyCode.ArrowDown, 1);
            tickAndDetectChanges(fixture);
            expect((<SelectGuruOption[]>fixture.componentInstance.select.selectedItems).length).toBe(1);
            expect(fixture.componentInstance.select.selectedItems[0]).toEqual(jasmine.objectContaining({
                value: { id: 3, name: 'Pabrade' }
            }));
        }));

        it('should not toggle item on enter when dropdown is closed', () => {
            selectOption(fixture, KeyCode.ArrowDown, 0);
            triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Esc);
            expect((<SelectGuruOption[]>fixture.componentInstance.select.selectedItems).length).toBe(1);
            triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Enter);
            expect((<SelectGuruOption[]>fixture.componentInstance.select.selectedItems).length).toBe(1);
        });

        describe('max selected items', () => {
            let arrowIcon: DebugElement = null;
            beforeEach(() => {
                fixture.componentInstance.select.maxSelectedItems = 2;
                arrowIcon = fixture.debugElement.query(By.css('.ng-arrow-wrapper'));
            });

            it('should be able to select only two elements', fakeAsync(() => {
                selectOption(fixture, KeyCode.ArrowDown, 0);
                selectOption(fixture, KeyCode.ArrowDown, 1);
                selectOption(fixture, KeyCode.ArrowDown, 1);
                tickAndDetectChanges(fixture);
                expect((<SelectGuruOption[]>fixture.componentInstance.select.selectedItems).length).toBe(2);
            }));

            it('should not open dropdown when maximum of items is reached', fakeAsync(() => {
                const clickArrow = () => arrowIcon.triggerEventHandler('click', { stopPropagation: () => { } });
                selectOption(fixture, KeyCode.ArrowDown, 0);
                selectOption(fixture, KeyCode.ArrowDown, 1);
                tickAndDetectChanges(fixture);
                clickArrow();
                tickAndDetectChanges(fixture);
                expect(fixture.componentInstance.select.isOpen).toBe(false);
                expect((<SelectGuruOption[]>fixture.componentInstance.select.selectedItems).length).toBe(2);
            }));
        });

        describe('show selected', () => {
            beforeEach(() => {
                select = fixture.componentInstance.select;
                select.hideSelected = true;
                select.closeOnSelect = false;
            });

            it('should close dropdown when all items are selected', fakeAsync(() => {
                selectOption(fixture, KeyCode.ArrowDown, 1);
                selectOption(fixture, KeyCode.ArrowDown, 1);
                selectOption(fixture, KeyCode.ArrowDown, 1);
                expect(select.selectedItems.length).toBe(3);
                expect(select.itemsList.filteredItems.length).toBe(0);
                expect(select.isOpen).toBeFalsy();
            }));

            it('should not open dropdown when all items are selected', fakeAsync(() => {
                fixture.componentInstance.selectedCities = [...fixture.componentInstance.cities];
                tickAndDetectChanges(fixture);
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
                expect(select.selectedItems.length).toBe(3);
                expect(select.itemsList.filteredItems.length).toBe(0);
                expect(select.isOpen).toBeFalsy();
            }));

            it('should open dropdown when all items are selected and tagging is enabled', fakeAsync(() => {
                select.addTag = true;
                fixture.componentInstance.cities = [];
                tickAndDetectChanges(fixture);
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
                expect(select.isOpen).toBeTruthy();
            }));

            it('should remove selected item from items list', fakeAsync(() => {
                fixture.componentInstance.selectedCities = [fixture.componentInstance.cities[0]];
                tickAndDetectChanges(fixture);
                expect(select.selectedItems.length).toBe(1);
                expect(select.itemsList.filteredItems.length).toBe(2);
            }));

            it('should put unselected item back to list', fakeAsync(() => {
                fixture.componentInstance.selectedCities = [fixture.componentInstance.cities[0]];
                tickAndDetectChanges(fixture);
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Backspace);
                expect(fixture.componentInstance.select.selectedItems.length).toBe(0);
                expect(fixture.componentInstance.select.itemsList.filteredItems.length).toBe(3);
            }));

            it('should keep same ordering while unselecting', fakeAsync(() => {
                fixture.componentInstance.selectedCities = [...fixture.componentInstance.cities.reverse()];
                tickAndDetectChanges(fixture);
                select.unselect(select.selectedItems[0])
                select.unselect(select.selectedItems[0])
                select.unselect(select.selectedItems[0])
                expect(select.selectedItems.length).toBe(0);
                expect(select.itemsList.filteredItems.length).toBe(3);
                expect(select.itemsList.filteredItems[0].label).toBe('Vilnius');
                expect(select.itemsList.filteredItems[1].label).toBe('Kaunas');
                expect(select.itemsList.filteredItems[2].label).toBe('Pabrade');
            }));

            it('should reset list while clearing all selected items', fakeAsync(() => {
                fixture.componentInstance.selectedCities = [...fixture.componentInstance.cities];
                tickAndDetectChanges(fixture);
                select.handleClearClick();
                expect(select.selectedItems.length).toBe(0);
                expect(select.itemsList.filteredItems.length).toBe(3);
            }));

            it('should skip selected items while filtering', fakeAsync(() => {
                fixture.componentInstance.selectedCities = [fixture.componentInstance.cities[0]];
                tickAndDetectChanges(fixture);
                select.filter('s');
                tickAndDetectChanges(fixture);
                expect(select.itemsList.filteredItems.length).toBe(1);
                expect(select.itemsList.filteredItems[0].label).toBe('Kaunas');
                select.filter('');
                tickAndDetectChanges(fixture);
                expect(select.itemsList.filteredItems.length).toBe(2);
            }));
        });
    });

    describe('Tagging', () => {
        it('should select default tag', fakeAsync(() => {
            let fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                    bindLabel="name"
                    [addTag]="true"
                    placeholder="select value"
                    [(ngModel)]="selectedCity">
                </ng-select>`);

            tickAndDetectChanges(fixture);
            fixture.componentInstance.select.filter('new tag');
            tickAndDetectChanges(fixture);
            triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Enter);
            expect(fixture.componentInstance.selectedCity.name).toBe('new tag');
        }));

        it('should add tag as string', fakeAsync(() => {
            let fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="citiesNames"
                    [addTag]="true"
                    placeholder="select value"
                    [(ngModel)]="selectedCity">
                </ng-select>`);

            tickAndDetectChanges(fixture);
            fixture.componentInstance.select.filter('Copenhagen');
            tickAndDetectChanges(fixture);
            triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Enter);
            expect(fixture.componentInstance.selectedCity).toBe(<any>'Copenhagen');
        }));

        it('should add tag as string when tab pressed', fakeAsync(() => {
            let fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="citiesNames"
                    [addTag]="true"
                    [selectOnTab]="true"
                    placeholder="select value"
                    [(ngModel)]="selectedCity">
                </ng-select>`);

            tickAndDetectChanges(fixture);
            fixture.componentInstance.select.filter('Copenhagen');
            tickAndDetectChanges(fixture);
            triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Tab);
            expect(fixture.componentInstance.selectedCity).toBe(<any>'Copenhagen');
        }));

        it('should select tag even if there are filtered items that matches search term', fakeAsync(() => {
            let fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                    bindLabel="name"
                    [addTag]="true"
                    placeholder="select value"
                    [(ngModel)]="selectedCity">
                </ng-select>`);

            tickAndDetectChanges(fixture);
            fixture.componentInstance.select.filter('Vil');
            tickAndDetectChanges(fixture);
            triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.ArrowDown);
            triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Enter);
            expect(fixture.componentInstance.selectedCity.name).toBe('Vil');
        }));

        it('should select custom tag', fakeAsync(() => {
            let fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                    bindLabel="name"
                    [addTag]="tagFunc"
                    placeholder="select value"
                    [(ngModel)]="selectedCity">
                </ng-select>`);

            tickAndDetectChanges(fixture);
            fixture.componentInstance.select.filter('custom tag');
            tickAndDetectChanges(fixture);
            triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Enter);
            expect(<any>fixture.componentInstance.selectedCity).toEqual(jasmine.objectContaining({
                id: 'custom tag', name: 'custom tag', custom: true
            }));
        }));

        it('should select custom tag with promise', fakeAsync(() => {
            let fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                    bindLabel="name"
                    [addTag]="tagFuncPromise"
                    placeholder="select value"
                    [(ngModel)]="selectedCity">
                </ng-select>`);

            tickAndDetectChanges(fixture);
            fixture.componentInstance.select.filter('server side tag');
            tickAndDetectChanges(fixture);
            triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Enter);
            tick();
            expect(<any>fixture.componentInstance.selectedCity).toEqual(jasmine.objectContaining({
                id: 5, name: 'server side tag', valid: true
            }));
        }));
    });

    describe('Placeholder', () => {
        let fixture: ComponentFixture<NgSelectTestCmp>;
        beforeEach(() => {
            fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                    bindLabel="name"
                    placeholder="select value"
                    [(ngModel)]="selectedCity">
                </ng-select>`);
        });

        it('should be visible when no value selected', async(() => {
            fixture.detectChanges();
            fixture.whenStable().then(() => {
                const selectEl: HTMLElement = fixture.componentInstance.select.elementRef.nativeElement;
                const placeholder: any = selectEl.querySelector('.ng-placeholder');
                expect(placeholder.innerText).toBe('select value');
                expect(getComputedStyle(placeholder).display).toBe('block');
            });
        }));

        it('should be visible when value was cleared', fakeAsync(() => {
            const select = fixture.componentInstance.select;
            fixture.componentInstance.selectedCity = fixture.componentInstance.cities[0];
            tickAndDetectChanges(fixture);
            tickAndDetectChanges(fixture);
            const selectEl: HTMLElement = select.elementRef.nativeElement;
            const ngControl = selectEl.querySelector('.ng-select-container')
            const placeholder: any = selectEl.querySelector('.ng-placeholder');
            expect(ngControl.classList.contains('ng-has-value')).toBeTruthy();

            select.handleClearClick();
            tickAndDetectChanges(fixture);
            tickAndDetectChanges(fixture);

            expect(ngControl.classList.contains('ng-has-value')).toBeFalsy();
            expect(getComputedStyle(placeholder).display).toBe('block');
        }));

        it('should contain .ng-has-value when value was selected', fakeAsync(() => {
            tickAndDetectChanges(fixture);
            const selectEl: HTMLElement = fixture.componentInstance.select.elementRef.nativeElement;
            const ngControl = selectEl.querySelector('.ng-select-container')
            selectOption(fixture, KeyCode.ArrowDown, 2);
            tickAndDetectChanges(fixture);
            expect(ngControl.classList.contains('ng-has-value')).toBeTruthy();
        }));
    });

    describe('Filter', () => {
        it('should filter using default implementation', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                    bindLabel="name"
                    [(ngModel)]="selectedCity">
                </ng-select>`);

            tick(200);
            fixture.componentInstance.select.filter('vilnius');
            tick(200);

            const result = [jasmine.objectContaining({
                value: { id: 1, name: 'Vilnius' }
            })];
            expect(fixture.componentInstance.select.itemsList.filteredItems).toEqual(result);
        }));

        it('should filter using custom searchFn', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                    bindLabel="name"
                    [searchFn]="searchFn"
                    [(ngModel)]="selectedCity">
                </ng-select>`);

            fixture.componentInstance.searchFn = (term: string, item: any) => {
                return item.name.indexOf(term) > -1 || item.id === 2;
            };
            const select = fixture.componentInstance.select;
            tickAndDetectChanges(fixture);
            select.filter('Vilnius');
            tick(200);

            expect(select.itemsList.filteredItems.length).toEqual(2);
            expect(select.itemsList.filteredItems[0]).toEqual(jasmine.objectContaining({
                value: { id: 1, name: 'Vilnius' }
            }));
            expect(select.itemsList.filteredItems[1]).toEqual(jasmine.objectContaining({
                value: { id: 2, name: 'Kaunas' }
            }));
        }));

        it('should toggle dropdown when searchable false', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                    bindLabel="name"
                    [searchable]="false"
                    [(ngModel)]="selectedCity">
                </ng-select>`);

            const selectInput = fixture.debugElement.query(By.css('.ng-select-container'));
            // open
            selectInput.triggerEventHandler('mousedown', createEvent({ target: {} }));
            tickAndDetectChanges(fixture);
            expect(fixture.componentInstance.select.isOpen).toBe(true);

            // close
            selectInput.triggerEventHandler('mousedown', createEvent({ target: {} }));
            tickAndDetectChanges(fixture);
            expect(fixture.componentInstance.select.isOpen).toBe(false);
        }));

        it('should not filter when searchable false', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                    bindLabel="name"
                    [searchable]="false"
                    [(ngModel)]="selectedCity">
                </ng-select>`);

            const select = fixture.componentInstance.select;
            tickAndDetectChanges(fixture);
            const filterInput = select.elementRef.nativeElement.querySelector('input');
            expect(select.filterValue).toBeNull();
            expect(filterInput).toBeNull();
        }));

        it('should mark first item on filter', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                    bindLabel="name"
                    [(ngModel)]="selectedCity">
                </ng-select>`);

            tick(200);
            fixture.componentInstance.select.filter('pab');
            tick(200);

            const result = jasmine.objectContaining({
                value: fixture.componentInstance.cities[2]
            });
            expect(fixture.componentInstance.select.itemsList.markedItem).toEqual(result)
            triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Enter);
            expect(fixture.componentInstance.select.selectedItems).toEqual([result]);
        }));

        it('should mark first item on filter when selected is not among filtered items', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                    bindLabel="name"
                    [(ngModel)]="selectedCity">
                </ng-select>`);

            fixture.componentInstance.selectedCity = fixture.componentInstance.cities[0];
            fixture.detectChanges();
            fixture.componentInstance.select.filter('pab');
            tick();

            const result = jasmine.objectContaining({
                value: fixture.componentInstance.cities[2]
            });
            expect(fixture.componentInstance.select.itemsList.markedItem).toEqual(result)
            triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Enter);
            expect(fixture.componentInstance.select.selectedItems).toEqual([result]);
        }));

        it('should not mark first item on filter when markFirst disabled', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                    bindLabel="name"
                    [markFirst]="false"
                    [(ngModel)]="selectedCity">
                </ng-select>`);

            tick(200);
            fixture.componentInstance.select.filter('pab');
            tick();
            expect(fixture.componentInstance.select.itemsList.markedItem).toEqual(undefined)
        }));

        it('should clear filterValue on selected item', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                    bindLabel="name"
                    [(ngModel)]="selectedCity"
                    [multiple]="true">
                </ng-select>`);

            tickAndDetectChanges(fixture);

            fixture.componentInstance.select.filterValue = 'Hey! Whats up!?';
            selectOption(fixture, KeyCode.ArrowDown, 1);
            tickAndDetectChanges(fixture);
            expect(fixture.componentInstance.select.filterValue).toBe(null);
        }));

        it('should not reset items when selecting option', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                    bindLabel="name"
                    [(ngModel)]="selectedCity"
                    [multiple]="true">
                </ng-select>`);

            const resetItems = spyOn(fixture.componentInstance.select.itemsList, 'resetItems');
            tickAndDetectChanges(fixture);

            fixture.componentInstance.select.filterValue = null;
            selectOption(fixture, KeyCode.ArrowDown, 1);
            tickAndDetectChanges(fixture);
            expect(resetItems).not.toHaveBeenCalled();
        }));

        it('should filter grouped items', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectGroupingTestCmp,
                `<ng-select [items]="accounts"
                        groupBy="country"
                        bindLabel="name"
                        [(ngModel)]="selectedAccount">
                </ng-select>`);

            tickAndDetectChanges(fixture);
            fixture.componentInstance.select.filter('adam');
            tickAndDetectChanges(fixture);

            const filteredItems = fixture.componentInstance.select.itemsList.filteredItems;
            expect(filteredItems.length).toBe(2);
            expect(filteredItems[0].hasChildren).toBe(true);
            expect(filteredItems[0].label).toBe('United States');
            expect(filteredItems[1].parent).toBe(filteredItems[0]);
            expect(filteredItems[1].label).toBe('Adam');
        }));

        describe('with typeahead', () => {
            let fixture: ComponentFixture<NgSelectTestCmp>
            beforeEach(() => {
                fixture = createTestingModule(
                    NgSelectTestCmp,
                    `<ng-select [items]="cities"
                        [typeahead]="filter"
                        bindLabel="name"
                        [hideSelected]="hideSelected"
                        [(ngModel)]="selectedCity">
                    </ng-select>`);
            });

            it('should not show selected city among options if it does not match search term', fakeAsync(() => {
                fixture.componentInstance.selectedCity = { id: 9, name: 'Copenhagen' };
                tickAndDetectChanges(fixture);

                fixture.componentInstance.filter.subscribe();
                fixture.componentInstance.select.filter('new');
                fixture.componentInstance.cities = [{ id: 4, name: 'New York' }];
                tickAndDetectChanges(fixture);
                expect(fixture.componentInstance.select.itemsList.filteredItems.length).toBe(1);
                expect(fixture.componentInstance.select.itemsList.filteredItems[0]).toEqual(jasmine.objectContaining({
                    value: { id: 4, name: 'New York' }
                }))
            }));

            it('should push term to custom observable', fakeAsync(() => {
                fixture.componentInstance.filter.subscribe(term => {
                    expect(term).toBe('vilnius');
                });
                tick(200);
                fixture.componentInstance.select.filter('vilnius');
                tickAndDetectChanges(fixture);
            }));

            it('should mark first item when typeahead results are loaded', fakeAsync(() => {
                fixture.componentInstance.filter.subscribe();
                fixture.componentInstance.select.filter('buk');
                fixture.componentInstance.cities = [{ id: 4, name: 'Bukiskes' }];
                tickAndDetectChanges(fixture);
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Enter);
                expect(fixture.componentInstance.select.selectedItems).toEqual([jasmine.objectContaining({
                    value: { id: 4, name: 'Bukiskes' }
                })])
            }));

            it('should not mark first item when typeahead results are loaded', fakeAsync(() => {
                fixture.componentInstance.select.markFirst = false;
                fixture.componentInstance.filter.subscribe();
                fixture.componentInstance.select.filter('buk');
                fixture.componentInstance.cities = [{ id: 4, name: 'Bukiskes' }];
                tickAndDetectChanges(fixture);
                triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Enter);
                expect(fixture.componentInstance.select.selectedItems).toEqual([])
            }));

            it('should open dropdown when hideSelected=true and no items to select', fakeAsync(() => {
                fixture.componentInstance.hideSelected = true;
                fixture.componentInstance.cities = [];
                fixture.componentInstance.selectedCity = null;
                tickAndDetectChanges(fixture);
                fixture.componentInstance.filter.subscribe();
                fixture.componentInstance.select.open();
                expect(fixture.componentInstance.select.isOpen).toBeTruthy();
            }));
        });

        describe('clear on add', () => {
            it('should clear search term by default', fakeAsync(() => {
                const fixture = createTestingModule(
                    NgSelectTestCmp,
                    `<ng-select [items]="cities"
                        [typeahead]="filter"
                        bindLabel="name"
                        [hideSelected]="hideSelected"
                        [closeOnSelect]="false"
                        [(ngModel)]="selectedCity">
                    </ng-select>`);

                expect(fixture.componentInstance.select.clearSearchOnAdd).toBeTruthy();

                fixture.componentInstance.filter.subscribe();
                fixture.componentInstance.select.filter('new');
                fixture.componentInstance.cities = [{ id: 4, name: 'New York' }];
                tickAndDetectChanges(fixture);
                expect(fixture.componentInstance.select.itemsList.filteredItems.length).toBe(1);
                expect(fixture.componentInstance.select.filterValue).toBe('new');

                fixture.componentInstance.select.select(fixture.componentInstance.select.viewPortItems[0]);
                expect(fixture.componentInstance.select.filterValue).toBeNull();
            }));

            it('should not clear search term when clearSearchOnAdd is false', fakeAsync(() => {
                const fixture = createTestingModule(
                    NgSelectTestCmp,
                    `<ng-select [items]="cities"
                        [typeahead]="filter"
                        bindLabel="name"
                        [hideSelected]="hideSelected"
                        [clearSearchOnAdd]="false"
                        [closeOnSelect]="false"
                        [(ngModel)]="selectedCity">
                    </ng-select>`);

                expect(fixture.componentInstance.select.clearSearchOnAdd).toBeFalsy();
                expect(fixture.componentInstance.select.closeOnSelect).toBeFalsy();

                fixture.componentInstance.filter.subscribe();
                fixture.componentInstance.select.filter('new');
                fixture.componentInstance.cities = [{ id: 4, name: 'New York' }, { id: 5, name: 'California' }];
                tickAndDetectChanges(fixture);
                expect(fixture.componentInstance.select.itemsList.filteredItems.length).toBe(2);
                expect(fixture.componentInstance.select.filterValue).toBe('new');

                fixture.componentInstance.select.select(fixture.componentInstance.select.viewPortItems[0]);
                expect(fixture.componentInstance.select.filterValue).toBe('new');
            }));
        });
    });

    describe('Accessability', () => {
        let fixture: ComponentFixture<NgSelectTestCmp>;
        let select: SelectGuruComponent;
        let input: HTMLInputElement;

        beforeEach(fakeAsync(() => {
            fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                        (change)="onChange($event)" 
                        bindLabel="name">
                </ng-select>`);
            select = fixture.componentInstance.select;
            input = fixture.debugElement.query(By.css('input')).nativeElement;
        }));

        it('should set aria-activedescendant absent at start', fakeAsync(() => {
            expect(input.hasAttribute('aria-activedescendant'))
                .toBe(false);
        }));

        it('should set aria-owns absent at start', fakeAsync(() => {
            expect(input.hasAttribute('aria-owns'))
                .toBe(false);
        }));

        it('should set aria-owns be set to dropdownId on open', fakeAsync(() => {
            triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
            tickAndDetectChanges(fixture);

            expect(input.getAttribute('aria-owns'))
                .toBe(select.dropdownId);
        }));

        it('should set aria-activedecendant equal to chosen item on open', fakeAsync(() => {
            triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
            tickAndDetectChanges(fixture);
            expect(input.getAttribute('aria-activedescendant'))
                .toBe(select.itemsList.markedItem.htmlId);
        }));

        it('should set aria-activedecendant equal to chosen item on arrow down', fakeAsync(() => {
            triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
            tickAndDetectChanges(fixture);
            triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.ArrowDown);
            tickAndDetectChanges(fixture);
            expect(input.getAttribute('aria-activedescendant'))
                .toBe(select.itemsList.markedItem.htmlId);
        }));

        it('should set aria-activedecendant equal to chosen item on arrow up', fakeAsync(() => {
            triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
            tickAndDetectChanges(fixture);
            triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.ArrowUp);
            tickAndDetectChanges(fixture);
            expect(input.getAttribute('aria-activedescendant'))
                .toBe(select.itemsList.markedItem.htmlId);
        }));

        it('should set aria-activedescendant absent on dropdown close', fakeAsync(() => {
            triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
            tickAndDetectChanges(fixture);
            triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Enter);
            tickAndDetectChanges(fixture);
            expect(input.hasAttribute('aria-activedescendant'))
                .toBe(false);
        }));

        it('should set aria-owns  absent on dropdown close', fakeAsync(() => {
            triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
            tickAndDetectChanges(fixture);
            triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Enter);
            tickAndDetectChanges(fixture);
            expect(input.hasAttribute('aria-owns'))
                .toBe(false);
        }));
    });

    describe('Output events', () => {
        it('fire open event once', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                            (open)="onOpen()"
                            [(ngModel)]="selectedCity">
                </ng-select>`);

            spyOn(fixture.componentInstance, 'onOpen');

            fixture.componentInstance.select.open();
            fixture.componentInstance.select.open();
            tickAndDetectChanges(fixture);

            expect(fixture.componentInstance.onOpen).toHaveBeenCalledTimes(1);
        }));

        it('fire close event once', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                            (close)="onClose()"
                            [(ngModel)]="selectedCity">
                </ng-select>`);

            spyOn(fixture.componentInstance, 'onClose');

            fixture.componentInstance.select.open();
            fixture.componentInstance.select.close();
            fixture.componentInstance.select.close();
            tickAndDetectChanges(fixture);

            expect(fixture.componentInstance.onClose).toHaveBeenCalledTimes(1);
        }));

        it('fire change when changed', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                            bindValue="id"
                            bindLabel="name"
                            (change)="onChange($event)"
                            [(ngModel)]="selectedCityId">
                </ng-select>`);

            spyOn(fixture.componentInstance, 'onChange');

            fixture.componentInstance.selectedCityId = fixture.componentInstance.cities[1].id;
            tickAndDetectChanges(fixture);

            const select = fixture.componentInstance.select;
            select.select(select.itemsList.items[0]);
            tickAndDetectChanges(fixture);

            expect(fixture.componentInstance.onChange).toHaveBeenCalledWith(select.selectedItems[0].value);
            expect(fixture.componentInstance.selectedCityId).toBe(fixture.componentInstance.cities[0].id);
        }));

        it('do not fire change when item not changed', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                            (change)="onChange()"
                            [(ngModel)]="selectedCity">
                </ng-select>`);

            spyOn(fixture.componentInstance, 'onChange');

            fixture.componentInstance.selectedCity = fixture.componentInstance.cities[0];
            tickAndDetectChanges(fixture);

            fixture.componentInstance.select.select(fixture.componentInstance.cities[0]);

            expect(fixture.componentInstance.onChange).toHaveBeenCalledTimes(1);
        }));

        it('fire add when item is added', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                            (add)="onAdd($event)"
                            [multiple]="true"
                            [(ngModel)]="selectedCity">
                </ng-select>`);

            spyOn(fixture.componentInstance, 'onAdd');

            tickAndDetectChanges(fixture);
            fixture.componentInstance.select.select(fixture.componentInstance.select.itemsList.items[0]);

            expect(fixture.componentInstance.onAdd).toHaveBeenCalledWith(fixture.componentInstance.cities[0]);
        }));

        it('fire remove when item is removed', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                            (remove)="onRemove($event)"
                            [multiple]="true"
                            [(ngModel)]="selectedCity">
                </ng-select>`);

            spyOn(fixture.componentInstance, 'onRemove');

            fixture.componentInstance.selectedCities = [fixture.componentInstance.cities[0]];
            tickAndDetectChanges(fixture);

            fixture.componentInstance.select.unselect(fixture.componentInstance.cities[0]);

            expect(fixture.componentInstance.onRemove).toHaveBeenCalledWith(fixture.componentInstance.cities[0]);
        }));

        it('fire clear when model is cleared using clear icon', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                            (clear)="onClear($event)"
                            [multiple]="true"
                            [(ngModel)]="selectedCity">
                </ng-select>`);

            spyOn(fixture.componentInstance, 'onClear');

            fixture.componentInstance.selectedCities = [fixture.componentInstance.cities[0]];
            tickAndDetectChanges(fixture);
            fixture.componentInstance.select.handleClearClick();
            tickAndDetectChanges(fixture);

            expect(fixture.componentInstance.onClear).toHaveBeenCalled();
        }));
    });

    describe('Clear icon click', () => {
        let fixture: ComponentFixture<NgSelectTestCmp>;
        let triggerClearClick = null;

        beforeEach(fakeAsync(() => {
            fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                        (change)="onChange($event)"
                        bindLabel="name"
                        [disabled]="disabled"
                        [(ngModel)]="selectedCity">
                </ng-select>`);

            spyOn(fixture.componentInstance, 'onChange');
            fixture.componentInstance.selectedCity = fixture.componentInstance.cities[0];
            tickAndDetectChanges(fixture);
            tickAndDetectChanges(fixture);
            triggerClearClick = () => {
                const control = fixture.debugElement.query(By.css('.ng-select-container'))
                control.triggerEventHandler('mousedown', createEvent({ target: { className: 'ng-clear' } }));
            };
        }));

        it('should clear model', fakeAsync(() => {
            triggerClearClick();
            tickAndDetectChanges(fixture);
            expect(fixture.componentInstance.selectedCity).toBe(null);
            expect(fixture.componentInstance.onChange).toHaveBeenCalledTimes(1);
        }));

        it('should clear only search text', fakeAsync(() => {
            fixture.componentInstance.selectedCity = null;
            fixture.componentInstance.select.filterValue = 'Hey! Whats up!?';
            tickAndDetectChanges(fixture);
            triggerClearClick();
            tickAndDetectChanges(fixture);
            expect(fixture.componentInstance.onChange).toHaveBeenCalledTimes(0);
            expect(fixture.componentInstance.select.filterValue).toBe(null);
        }));

        it('should not open dropdown', fakeAsync(() => {
            triggerClearClick();
            tickAndDetectChanges(fixture);
            expect(fixture.componentInstance.select.isOpen).toBe(false);
        }));

        it('clear button should not appear if select is disabled', fakeAsync(() => {
            fixture.componentInstance.disabled = true;
            tickAndDetectChanges(fixture);
            tickAndDetectChanges(fixture);
            const el = fixture.debugElement.query(By.css('.ng-clear-wrapper'));
            expect(el).toBeNull();
        }));
    });

    describe('Arrow icon click', () => {
        let fixture: ComponentFixture<NgSelectTestCmp>;
        let triggerArrowIconClick = null;

        beforeEach(fakeAsync(() => {
            fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                        bindLabel="name"
                        [(ngModel)]="selectedCity">
                </ng-select>`);

            fixture.componentInstance.selectedCity = fixture.componentInstance.cities[0];
            tickAndDetectChanges(fixture);
            triggerArrowIconClick = () => {
                const control = fixture.debugElement.query(By.css('.ng-select-container'))
                control.triggerEventHandler('mousedown', createEvent({ target: { className: 'ng-arrow' } }));
            };
        }));

        it('should toggle dropdown', fakeAsync(() => {
            // open
            triggerArrowIconClick();
            tickAndDetectChanges(fixture);
            expect(fixture.componentInstance.select.isOpen).toBe(true);

            // close
            triggerArrowIconClick();
            tickAndDetectChanges(fixture);
            expect(fixture.componentInstance.select.isOpen).toBe(false);

            // open
            triggerArrowIconClick();
            tickAndDetectChanges(fixture);
            expect(fixture.componentInstance.select.isOpen).toBe(true);
        }));
    });

    describe('Append to', () => {
        it('should append dropdown to body', async(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `<ng-select [items]="cities"
                        appendTo="body"
                        [(ngModel)]="selectedCity">
                </ng-select>`);

            fixture.componentInstance.select.open();
            fixture.detectChanges();

            fixture.whenStable().then(() => {
                const dropdown = <HTMLElement>document.querySelector('.ng-dropdown-panel');
                expect(dropdown.parentElement).toBe(document.body);
                expect(dropdown.style.top).not.toBe('0px');
                expect(dropdown.style.left).toBe('0px');
            })
        }));

        it('should append dropdown to custom selector', async(() => {
            const fixture = createTestingModule(
                NgSelectTestCmp,
                `
                <div class="container"></div>
                <ng-select [items]="cities"
                        appendTo=".container"
                        [(ngModel)]="selectedCity">
                </ng-select>`);

            fixture.componentInstance.select.open();
            fixture.detectChanges();

            fixture.whenStable().then(() => {
                const dropdown = <HTMLElement>document.querySelector('.container .ng-dropdown-panel');
                expect(dropdown.style.top).not.toBe('0px');
                expect(dropdown.style.left).toBe('0px');
            });
        }));
    });

    describe('Grouping', () => {
        it('should group by group key', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectGroupingTestCmp,
                `<ng-select [items]="accounts"
                        groupBy="country"
                        [(ngModel)]="selectedAccount">
                </ng-select>`);

            tickAndDetectChanges(fixture);

            const items = fixture.componentInstance.select.itemsList.items;

            expect(items.length).toBe(14);
            expect(items[0].hasChildren).toBe(true);
            expect(items[0].index).toBe(0);
            expect(items[0].label).toBe('United States');
            expect(items[0].disabled).toBeTruthy();
            expect(items[0].value).toEqual({ country: 'United States' });

            expect(items[1].hasChildren).toBe(false);
            expect(items[1].parent).toBe(items[0]);

            expect(items[2].hasChildren).toBe(false);
            expect(items[2].parent).toBe(items[0]);

            expect(items[3].label).toBe('Argentina');
            expect(items[3].label).toBe('Argentina');

            expect(items[10].label).toBe('Colombia');
            expect(items[11].parent).toBe(items[10]);
        }));

        it('should group by group fn', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectGroupingTestCmp,
                `<ng-select [items]="accounts"
                        bindLabel="name"
                        [groupBy]="groupByFn"
                        [(ngModel)]="selectedAccount">
                </ng-select>`);

            tickAndDetectChanges(fixture);

            const items = fixture.componentInstance.select.itemsList.items;

            expect(items.length).toBe(12);
            expect(items[0].hasChildren).toBe(true);
            expect(items[0].value['name']).toBe('c1');
            expect(items[6].hasChildren).toBe(true);
            expect(items[6].value['name']).toBe('c2');
        }));

        it('should not mark optgroup item as marked', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectGroupingTestCmp,
                `<ng-select [items]="accounts"
                        groupBy="country"
                        bindValue="name"
                        [(ngModel)]="selectedAccountName">
                </ng-select>`);

            tickAndDetectChanges(fixture);

            const select = fixture.componentInstance.select;
            expect(select.itemsList.markedItem).toBeUndefined();

            select.onItemHover(select.itemsList.items[0]);
            expect(select.itemsList.markedItem).toBeUndefined();
        }));

        it('should filter grouped items', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectGroupingTestCmp,
                `<ng-select [items]="accounts"
                        groupBy="country"
                        bindLabel="name"
                        [(ngModel)]="selectedAccount">
                </ng-select>`);

            tickAndDetectChanges(fixture);
            const select = fixture.componentInstance.select;
            select.filter('aDaM');

            const filteredItems = select.itemsList.filteredItems;
            expect(filteredItems.length).toBe(2);
            expect(filteredItems[0].hasChildren).toBeTruthy();
            expect(filteredItems[1].parent).toBe(filteredItems[0]);

            select.filter('not in list');
            expect(select.itemsList.filteredItems.length).toBe(0);
        }));

        it('should allow select optgroup items when [selectableGroup]="true"', fakeAsync(() => {
            const fixture = createTestingModule(
                NgSelectGroupingTestCmp,
                `<ng-select [items]="accounts"
                        groupBy="country"
                        bindLabel="name"
                        bindValue="email"
                        [selectableGroup]="true"
                        [(ngModel)]="selectedAccount">
                </ng-select>`);

            tickAndDetectChanges(fixture);
            selectOption(fixture, KeyCode.ArrowDown, 0);
            expect(fixture.componentInstance.selectedAccount).toBe('United States');

            selectOption(fixture, KeyCode.ArrowDown, 1);
            expect(fixture.componentInstance.selectedAccount).toBe('adam@email.com');
        }));
    });
});


function createTestingModule<T>(cmp: Type<T>, template: string): ComponentFixture<T> {
    TestBed.configureTestingModule({
        imports: [FormsModule, SelectGuruModule],
        declarations: [cmp],
        providers: [
            { provide: ErrorHandler, useClass: TestsErrorHandler },
            { provide: NgZone, useFactory: () => new MockNgZone() },
            { provide: WindowService, useFactory: () => new MockNgWindow() },
            { provide: ConsoleService, useFactory: () => new MockConsole() }
        ]
    })
        .overrideComponent(cmp, {
            set: {
                template: template
            }
        })
        .compileComponents();

    const fixture = TestBed.createComponent(cmp);
    fixture.detectChanges();
    return fixture;
}

function createEvent(event) {
    return {
        stopPropagation: () => { },
        preventDefault: () => { },
        ...event
    }
}

@Component({
    template: ``
})
class NgSelectTestCmp {
    @ViewChild(SelectGuruComponent) select: SelectGuruComponent;
    multiple = false;
    disabled = false;
    dropdownPosition = 'bottom';
    visible = true;
    filter = new Subject<string>();
    searchFn: (term: string, item: any) => boolean = null;
    selectOnTab = true;
    hideSelected = false;

    citiesLoading = false;
    selectedCityId: number;
    selectedCityIds: number[];
    selectedCity: { id: number; name: string };
    selectedCities: { id: number; name: string }[];
    cities: any[] = [
        { id: 1, name: 'Vilnius' },
        { id: 2, name: 'Kaunas' },
        { id: 3, name: 'Pabrade' },
    ];
    citiesNames = this.cities.map(x => x.name);

    selectedCountry: any;
    countries = [
        { id: 1, description: { name: 'Lithuania', id: 'a' } },
        { id: 2, description: { name: 'USA', id: 'b' } },
        { id: 3, description: { name: 'Australia', id: 'c' } }
    ];

    tagFunc(term: string) {
        return { id: term, name: term, custom: true }
    }

    tagFuncPromise(term: string) {
        return Promise.resolve({
            id: 5, name: term, valid: true
        });
    }

    compareWith(a, b) {
        return a.name === b.name && a.district === b.district
    }

    toggleVisible() {
        this.visible = !this.visible;
    }

    onChange(_: Event) { }
    onFocus(_: Event) { }
    onBlur(_: Event) { }
    onOpen() { }
    onClose() { }
    onAdd() { }
    onRemove() { }
    onClear() { }
    onScrollToEnd() { }
}

@Component({
    template: ``
})
class NgSelectGroupingTestCmp {
    @ViewChild(SelectGuruComponent) select: SelectGuruComponent;
    selectedAccountName = 'Adam';
    selectedAccount = null;
    groupByFn = (item) => item.child.name;
    accounts = [
        { name: 'Adam', email: 'adam@email.com', age: 12, country: 'United States', child: { name: 'c1' } },
        { name: 'Samantha', email: 'samantha@email.com', age: 30, country: 'United States', child: { name: 'c1' } },
        { name: 'Amalie', email: 'amalie@email.com', age: 12, country: 'Argentina', child: { name: 'c1' } },
        { name: 'Estefanía', email: 'estefania@email.com', age: 21, country: 'Argentina', child: { name: 'c1' } },
        { name: 'Adrian', email: 'adrian@email.com', age: 21, country: 'Ecuador', child: { name: 'c1' } },
        { name: 'Wladimir', email: 'wladimir@email.com', age: 30, country: 'Ecuador', child: { name: 'c2' } },
        { name: 'Natasha', email: 'natasha@email.com', age: 54, country: 'Ecuador', child: { name: 'c2' } },
        { name: 'Nicole', email: 'nicole@email.com', age: 43, country: 'Colombia', child: { name: 'c2' } },
        { name: 'Michael', email: 'michael@email.com', age: 15, country: 'Colombia', child: { name: 'c2' } },
        { name: 'Nicolás', email: 'nicole@email.com', age: 43, country: 'Colombia', child: { name: 'c2' } }
    ];

    // TODO: support this case
    groupedAccounts = [
        {
            country: 'United States',
            accounts: [
                { name: 'Adam', email: 'adam@email.com', age: 12 },
                { name: 'Samantha', email: 'samantha@email.com', age: 30 },
            ]
        },
        {
            country: 'Argentina',
            accounts: [
                { name: 'Amalie', email: 'amalie@email.com', age: 12 },
                { name: 'Estefanía', email: 'estefania@email.com', age: 21 },
            ]
        },
        {
            country: 'Ecuador',
            accounts: [
                { name: 'Adrian', email: 'adrian@email.com', age: 21 },
                { name: 'Wladimir', email: 'wladimir@email.com', age: 30 },
                { name: 'Natasha', email: 'natasha@email.com', age: 54 },
            ]
        }
    ]
}
