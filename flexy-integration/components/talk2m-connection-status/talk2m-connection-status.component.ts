import { Component, OnDestroy, OnInit } from '@angular/core';
import { PluginService, Talk2mService } from '@flexy/services';
import { BsModalService } from 'ngx-bootstrap/modal';
import { Subscription } from 'rxjs';
import { SettingsComponent } from '../settings/settings.component';

@Component({
  selector: 'li[talk2m-connection-status]',
  templateUrl: './talk2m-connection-status.component.html'
})
export class Talk2mConnectionStatusComponent implements OnInit, OnDestroy {
  talk2mConnected = false;

  private subscription: Subscription;

  constructor(
    private talk2mService: Talk2mService,
    private pluginService: PluginService,
    private modalService: BsModalService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.pluginService.checkForActiveSession();

    this.talk2mConnected = !!this.talk2mService.session;
    this.subscription = this.talk2mService.session$.subscribe((session) => {
      const connected = !!session;

      if (!connected && this.talk2mConnected !== false) this.showSettings();

      this.talk2mConnected = connected;
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) this.subscription.unsubscribe();
  }

  showSettings(): void {
    this.modalService.show(SettingsComponent, { class: 'modal-sm' });
  }
}
