import { Component } from '@angular/core';
import { AlertService, ModalLabels } from '@c8y/ngx-components';
import { Subject } from 'rxjs';
import { MicroserviceIntegrationService } from '@services/c8y-microservice-talk2m-integration.service';

@Component({
  selector: 'agent-install-overlay',
  templateUrl: './agent-install-overlay.component.html'
})
export class AgentInstallOverlayComponent {
  closeSubject = new Subject<void>();
  labels: ModalLabels = {
    ok: 'Install Agent',
    cancel: 'Cancel'
  };
  url: string;
  filesExist: boolean;
  validateInProgress = false;

  constructor(private c8yMicroservice: MicroserviceIntegrationService, private alertService: AlertService) {}

  submit(event: Event): void {
    console.log('submit', event); // TODO
    this.closeSubject.next();
  }

  dismiss(event: Event): void {
    console.log('dismiss', event); // TODO
    this.closeSubject.next();
  }

  // https://github.com/hms-networks/flexy-cumulocity-connector/releases/download/v1.0.3/
  validateUrl(url = this.url): void {
    this.validateInProgress = true;
    this.c8yMicroservice.checkFiles(url).then(
      (response) => {
        this.filesExist = response;

        if (response === true) {
          this.alertService.success('URL is valid.');
        } else {
          this.alertService.add({
            text: 'URL is not valid',
            type: 'danger',
            detailedData: url
          });
        }

        this.validateInProgress = false;
      },
      (error) => this.alertService.danger(error)
    );
  }
}
