import { Component } from '@angular/core';
import { DeviceRegistrationService, IDeviceRegistration } from '@c8y/client';
import { AlertService, CellRendererContext } from '@c8y/ngx-components';
import { EwonFlexyStructure } from '@flexy/models/flexy.model';

@Component({
  templateUrl: 'registered.cell-renderer.component.html',
  styleUrls: ['registered.cell-renderer.component.less']
})
export class RegisteredCellRendererComponent {
  device: EwonFlexyStructure;
  actionInProgress = false;

  constructor(private deviceRegistrationService: DeviceRegistrationService, private alertService: AlertService, public context: CellRendererContext) {
    this.device = context.item as EwonFlexyStructure;
  }

  async acceptRegistration(registrationId: IDeviceRegistration['id']): Promise<void> {
    this.actionInProgress = true;

    try {
      await this.deviceRegistrationService.accept(registrationId);
      delete this.device.c8yRegistration;
      this.device.registered = 'yes';
      this.alertService.success('Device Registration Accepted');
    } catch(error: any) {
      this.alertService.danger('Could accepted not device registration', error.message);
    }

    this.actionInProgress = false;
  }
}
