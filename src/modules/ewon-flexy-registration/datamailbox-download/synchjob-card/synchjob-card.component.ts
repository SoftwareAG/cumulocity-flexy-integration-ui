import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";

@Component({
    selector: 'app-synchjob-card',
    templateUrl: './synchjob-card.component.html'
  })
  export class SynchjobCardComponent implements OnInit {


    @Input() listClass: string;

    constructor(){}

    ngOnInit(): void { }

  }