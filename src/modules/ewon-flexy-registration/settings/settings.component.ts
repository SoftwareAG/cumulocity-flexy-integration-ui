import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['settings.component.less']
})
export class SettingsComponent implements OnInit {



  @Input() set settings(value: any) {
    console.log('set value', value);
    this._settings = value;
  }
  get settings(): any {
    return this._settings;
  }

  private _settings: any = {};

  constructor() { }

  ngOnInit() {
  }

}
