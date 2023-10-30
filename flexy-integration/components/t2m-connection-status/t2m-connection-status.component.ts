import { Component, OnDestroy } from '@angular/core';
import { PluginService, Talk2mSessionService } from '@flexy/services';
import { Subscription } from 'rxjs';

@Component({
  selector: 'li[t2m-connection-status]',
  templateUrl: './t2m-connection-status.component.html'
})
export class T2mConnectionStatusComponent implements OnDestroy {
  t2mConnected = false;

  private subscription: Subscription;

  constructor(private t2mSession: Talk2mSessionService, private pluginService: PluginService) {
    this.subscription = this.t2mSession.session$.subscribe((sessionID) => (this.t2mConnected = !!sessionID));
    void this.pluginService.checkForActiveSession();
  }

  ngOnDestroy(): void {
    if (this.subscription) this.subscription.unsubscribe();
  }

  showSettings(): void {
    console.log('showSettings'); // TODO
  }
}
