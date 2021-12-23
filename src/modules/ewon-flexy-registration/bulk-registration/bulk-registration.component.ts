import { Component, Input, OnDestroy, OnInit } from '@angular/core';

@Component({
  selector: 'app-bulk-registration',
  templateUrl: './bulk-registration.component.html',
})
export class BulkRegistrationComponent implements OnInit {

  @Input() config: {
    username?: string;
    password?: string;
    devId?: string;
    tenant?: string;
  };
  
  constructor() { }

  isLoading: boolean = true;
  
  items: Array<any> = [];

  ngOnInit() {
    console.log('config', this.config);
  }


  demoItems() {
    this.items = [
      {name: 'IP Camera', description: 'IP Camera displaying Hall 47'},
      {name: 'Robot-T300', description: 'Robot - 1st generation terminator'}
    ];
  }
}
