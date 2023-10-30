import { Component, OnDestroy } from '@angular/core';
import { Talk2MService } from '@flexy/services';
import { Subscription } from 'rxjs';

@Component({
  selector: 'li[t2m-connection-status]',
  templateUrl: './t2m-connection-status.component.html'
})
export class T2mConnectionStatusComponent implements OnDestroy {
  t2mConnected = false;

  private subscription: Subscription;

  constructor(private t2m: Talk2MService) {
    this.subscription = this.t2m.session$.subscribe((sessionID) => (this.t2mConnected = !!sessionID));
  }

  ngOnDestroy(): void {
    if (this.subscription) this.subscription.unsubscribe();
  }

  showSettings(): void {
    console.log('showSettings'); // TODO
  }
}
