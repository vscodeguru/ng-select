import { Component, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'select-tags',
    changeDetection: ChangeDetectionStrategy.Default,
    template: `
        <p>
            In this example we are loading many items but only ~30 of them are rendered in the dom. 
            This allows to load as big data as you want.
        </p>
        ---html,true
        <select-guru [items]="photosBuffer"
                   [virtualScroll]="true"
                   [loading]="loading"
                   bindLabel="title"
                   bindValue="thumbnailUrl"
                   placeholder="Select photo"
                   (scrollToEnd)="fetchMore($event)">
            <ng-template ng-header-tmp>
                <small class="form-text text-muted">Loaded {{photosBuffer.length}} of {{photos.length}}</small>
            </ng-template>
            <ng-template ng-option-tmp let-item="item" let-index="index">
                <b>{{index}}</b> {{item.title}}
            </ng-template>
        </select-guru>
        ---
    `
})
export class VirtualScrollComponent {

    photos = [];
    photosBuffer = [];
    bufferSize = 50;
    loading = false;

    constructor(private http: HttpClient) {}

    ngOnInit() {
        this.http.get<any[]>('https://jsonplaceholder.typicode.com/photos').subscribe(photos => {
            this.photos = photos;
            this.photosBuffer = this.photos.slice(0, this.bufferSize);
        });
    }

    fetchMore() {
        const len = this.photosBuffer.length;
        const more = this.photos.slice(len, this.bufferSize + len);
        this.loading = true;
        // using timeout here to simulate backend API delay
        setTimeout(() => {
            this.loading = false;
            this.photosBuffer = this.photosBuffer.concat(more);
        }, 200)
    }
}
