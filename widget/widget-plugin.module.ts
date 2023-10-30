// Assets need to be imported into the module, or they are not available
import { assetPaths } from '../assets/assets';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WidgetPluginComponent } from './widget-plugin.component';
import { WidgetPluginConfig } from './widget-plugin-config.component';
import { FormsModule, hookComponent, gettext } from '@c8y/ngx-components';

@NgModule({
  declarations: [WidgetPluginComponent, WidgetPluginConfig],
  entryComponents: [WidgetPluginComponent, WidgetPluginConfig],
  imports: [CommonModule, FormsModule],
  exports: [],
  providers: [
    hookComponent({
      id: 'angular.widget.plugin',
      label: gettext('Module Federation widget'),
      description: gettext('Widget added via Module Federation'),
      component: WidgetPluginComponent,
      previewImage: assetPaths.previewImage,
      configComponent: WidgetPluginConfig
    })
  ]
})
export class WidgetPluginModule {}
