import { Component, Input } from '@angular/core';

@Component({
  selector: 'loading-spinner',
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.less']
})
export class LoadingSpinnerComponent {
  @Input() loading = true;
  @Input() title = 'Loading Data';
  @Input() copy = ''
}
