import { Column, ColumnDataType, Pagination } from "@c8y/ngx-components";
import { RegisteredColumn } from "@flexy/components/bulk-registration/registration-device-grid/columns/registered.column.component";

export const FLEXY_GRID_COLUMNS: Column[] = [
  {
    name: 'online',
    header: 'Online',
    path: 'status',
    filterable: false,
    sortable: false,
    dataType: ColumnDataType.TextShort,
    gridTrackSize: '60px'
  },
  {
    name: 'name',
    header: 'Name',
    filterable: false,
    sortable: false,
    dataType: ColumnDataType.TextShort
  },
  {
    name: 'description',
    header: 'Talk2M Description',
    path: 'description',
    filterable: false,
    sortable: false,
    dataType: ColumnDataType.TextLong
  },
  new RegisteredColumn(),
  {
    name: 'pool',
    header: 'Talk2M Pool',
    path: 'pool',
    filterable: false,
    sortable: false,
    dataType: ColumnDataType.TextShort
  },
  {
    name: 'groups',
    header: 'Cumulocity Group assigned',
    path: 'groups',
    filterable: false,
    sortable: false,
    dataType: ColumnDataType.TextLong
  }
];
export const FLEXY_GRID_PAGINATION: Pagination = {
  pageSize: 1000,
  currentPage: 1
};
export interface ColumnFilterTemplate {
  type: 'boolean' | 'string' | 'number';
  name: string;
  label: string;
  path: string;
  invert?: boolean;
}
