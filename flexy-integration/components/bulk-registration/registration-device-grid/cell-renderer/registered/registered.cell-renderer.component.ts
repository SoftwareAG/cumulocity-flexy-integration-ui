import { Component } from '@angular/core';
import { CellRendererContext } from '@c8y/ngx-components';
import { EwonFlexyStructure } from '@flexy/models/flexy.model';

@Component({
  templateUrl: 'registered.cell-renderer.component.html',
  styleUrls: ['registered.cell-renderer.component.less']
})
export class RegisteredCellRendererComponent {
  device: EwonFlexyStructure;

  constructor(public context: CellRendererContext) {
    this.device = context.item as EwonFlexyStructure;
  }
}
