import { BaseColumn, ColumnConfig } from '@c8y/ngx-components';
import { ColumnFilterTemplate } from '@flexy/models/flexy-grid.model';
import { RegisteredCellRendererComponent } from '../cell-renderer/registered/registered.cell-renderer.component';

export class RegisteredColumn extends BaseColumn {
  protected filterTitle = 'FT';
  protected filterValues: ColumnFilterTemplate[] = [];

  constructor(initialColumnConfig?: ColumnConfig) {
    super(initialColumnConfig);
    this.name = 'registered';
    this.path = '';
    this.header = 'Registered';
    this.cellRendererComponent = RegisteredCellRendererComponent;
    this.sortable = false;
    this.filterable = false;  // TODO

    this.filteringConfig = {
      fields: [
        {
          key: 'notC8y',
          type: 'checkbox',
          templateOptions: {
            label: 'NOT Cumulocity registered',
            attributes: {
              class: 'filter-icon error-warning--error'
            }
          },
          defaultValue: false
        },
        {
          key: 'notTalk2m',
          type: 'checkbox',
          templateOptions: {
            label: 'NOT Talk2M registered',
            attributes: {
              class: 'filter-icon error-warning--warning'
            }
          },
          defaultValue: false
        }
      ],
      getFilter(model: { notTalk2m: boolean; notC8y: boolean }) {
        const filter = { __or: [] };

        if (model.notTalk2m) {
          filter.__or.push({ __eq: { 'talk2m_integrated': model.notTalk2m ? 'yes' : 'no' } });
        }

        if (model.notC8y) {
          filter.__or.push({ __eq: { registered: model.notC8y ? 'yes' : 'no' } });
        }

        /*
        if (model.none) {
          filter.__or.push({
            __and: [{ __eq: { 'ec_Status.warnFlag': false } }, { __eq: { 'ec_Status.errorFlag': false } }]
          });
        }
        */

        return filter;
      }
    };
  }
}
