import { Component, Input, OnInit } from "@angular/core";

@Component({
    selector: 'app-synchjob-card',
    templateUrl: './synchjob-card.component.html'
  })
  export class SynchjobCardComponent implements OnInit {

    @Input() title: string;
    @Input() description: string;
    @Input() isActive: boolean;
    @Input() id: string;

    singleModel = true;

    constructor(){
      this.singleModel = this.isActive;
    }

    ngOnInit(): void {
      
    }
  }