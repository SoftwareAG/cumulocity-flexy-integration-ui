import { Component } from '@angular/core';
import { ProgressTrackerService } from '../progress-tracker.service';

@Component({
  selector: 'progress-display',
  templateUrl: './progress-display.component.html',
})
export class ProgressDisplayComponent {
  progressKey = 'aeneanParturient';

  constructor(private progressTrackerService: ProgressTrackerService) {}

  message(text = 'Commodo Porta') {
    this.progressTrackerService.addMessage(this.progressKey, text);
  }

  async addRandom(count = 10, delay = 1, prefix = 'ABC-') {
    for (let i = 1; i <= count; i++) {
      this.progressTrackerService.addItem(this.progressKey, {
        message: `${prefix}${i}/${count}`,
        icon: 'dlt-c8y-icon-clock1',
      });

      await this.sleep(delay);
    }
  }

  private sleep(seconds = 1): Promise<NodeJS.Timer> {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }

  private async throwError(text = 'This is an Error', sleep = 1): Promise<void> {
    await this.sleep(sleep);

    throw new Error(text);
  }

  private async rejectPromise(text = 'This is a rejcted Promise', sleep = 1): Promise<void> {
    await this.sleep(sleep);

    return Promise.reject(text);
  }

  async startProcess(): Promise<void> {
    try {
      await this.addRandom(5);

      this.message('sleep… zZz…');
      await this.sleep(2);
      await this.rejectPromise();
      await this.throwError();
      this.message('sleep… zZz…');
      await this.sleep(1);
    } catch (error) {
      this.progressTrackerService.addItem(this.progressKey, {
        message: 'Could not complete process.',
        details: String(error),
        icon: 'dlt-c8y-icon-warning text-danger',
      });
    }
  }
}
