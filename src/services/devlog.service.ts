import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DevlogService {
  protected devLogEnabled = false;
  protected devLogPrefix = 'FOO.S';

  protected devLog(functionName: string, ...args): void {
    if (this.devLogEnabled === true) console.log(`${this.devLogPrefix}|${functionName}`, args);
  }
}
