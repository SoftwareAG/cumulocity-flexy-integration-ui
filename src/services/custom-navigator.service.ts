import { Injectable, Injector } from '@angular/core';
import { NavigatorNode, NavigatorService } from '@c8y/ngx-components';
import { map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { FLEXY_REGISTRATION_PATH } from './../constants/flexy-integration.constants';

@Injectable({
  providedIn: 'root'
})
export class CustomNavigatorService extends NavigatorService {
  moved: string[] = [];

  constructor(inject: Injector, router: Router) {
    super(inject, router);

    this.items$ = this.items$.pipe(
      map((menu) => {
        if (menu && menu.length) {
          menu = this.moveNote(FLEXY_REGISTRATION_PATH, menu, ['navigator_node_devices', 'navigator_node_all_devices']);
          return menu;
        }
        return menu;
      })
    );
  }

  private moveNote(sourcePath: string, menu: NavigatorNode[], insertAfterID: string[]): NavigatorNode[] {
    const sourceIndex = menu.findIndex((entry) => entry.path === sourcePath);
    const notMoved = this.moved.indexOf(sourcePath) === -1;

    if (sourceIndex !== -1) {
      // cut
      const source = menu.splice(sourceIndex, 1).pop();

      if (notMoved) {
        // move
        const submenu = menu.find((item) => item.id === insertAfterID[0]);
        const insertIndex = submenu.children.findIndex((item) => item.id === insertAfterID[0]) - 3 || 0;
        submenu.children.splice(insertIndex, 0, source);
        this.moved.push(sourcePath);
      }
    }

    return menu;
  }
}