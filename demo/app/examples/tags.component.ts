import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'select-tags',
    changeDetection: ChangeDetectionStrategy.Default,
    template: `
        <label>Default tags</label>
        ---html,true
        <select-guru [items]="companies"
                [addTag]="true"
                bindLabel="name"
                [(ngModel)]="selectedCompany">
        </select-guru>
        ---
        <p>
            Selected value: {{selectedCompany | json}}
        </p>
        <hr>

        <label>Custom tags</label>
        ---html,true
        <select-guru [items]="companies"
                [addTag]="addTag"
                [hideSelected]="true"
                multiple="true"
                bindLabel="name"
                [(ngModel)]="selectedCompanyCustom">
        </select-guru>
        ---
        <p>
            Selected value: {{selectedCompanyCustom | json}}
        </p>
        <hr>


        <label>Server side tags</label>
        ---html,true
        <select-guru [items]="companies"
                [addTag]="addTagPromise"
                multiple="true"
                bindLabel="name"
                [loading]="loading"
                [(ngModel)]="selectedCompanyCustomPromise">
        </select-guru>
        ---
    `
})
export class SelectTagsComponent {

    companies: any[] = [];
    loading = false;
    companiesNames = ['Miškas', 'Žalias', 'Flexigen'];

    ngOnInit() {
        this.companiesNames.forEach((c, i) => {
            this.companies.push({ id: i, name: c });
        });
    }

    addTag(name) {
        return { name: name, tag: true };
    }

    addTagPromise(name) {
        return new Promise((resolve) => {
            this.loading = true;
            setTimeout(() => {
                resolve({ id: 5, name: name, valid: true });
                this.loading = false;
            }, 1000);
        })
    }
}
