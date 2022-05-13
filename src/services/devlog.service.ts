import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DevlogService {
  protected devLogEnabled = false;
  protected devLogPrefix = 'FOO.S';

  private _log(type: 'log' | 'error', functionName: string, ...args): void {
    if (this.devLogEnabled !== true) return;
    console[type](`${this.devLogPrefix}|${functionName}`, args);
  }

  protected devLog(functionName: string, ...args): void {
    this._log('log', functionName, args);
  }

  protected devError(functionName: string, ...args): void {
    this._log('error', functionName, args);
  }
}
