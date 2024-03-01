# cumulocity-flexy-integration-ui

## How to install the Plugin

1. Navigate to the "Ecosystem" » "Extensions" page in the administration app (path: `/apps/administration/index.html#/ecosystem/extension/extensions`).  
  ![Screenshot of the administration app to highlight the button in the top right corner of the screen](./_media/add-extension-button.png)
  Click on the "Add extension package" button, located on the right side of the action bar, to open the dialog.
1. Select the package (.zip) by clicking on the "Drop file here" area, or drag and drop it in the same place.  
  ![Screenshot of the add extension package dialog](./_media/add-extension-dialog.jpg)
1. After a successfull upload the following confirmation should be shown:
  ![Screenshot showing dialog with sucessful upload feedback](_media/extension-upload-complete.jpg)
1. Once sucessfully installed the plugin should be listed within the extensions.  
  ![Screenshot of the extensions list including the newly added plugin](_media/plugin-list.png)
1. Navigate to the "Ecosystem" » "Applications" page (path: `/apps/administration/index.html#/ecosystem/application/applications`)
1. Click on the "add application" button, again on the right side of the action bar.  
  ![Screenshot highlighting the position of the button in the top right of the page](_media/add-application-button.png)
1. In the "Add application" dialog, proceed as follows:
    1. Choose "Duplicate existing application"  
      ![](_media/add-application-dialog.png)
    1. Click on "Device management"  
      ![](_media/device-certification-option.png)
    1. Submit the dialog by clicking "Duplicate", without making further changes.  
      ![](_media/device-management-config.png)
1. Navigate to the "Ecosystem" » "Applications" page in the administration app (path: `/apps/administration/index.html#/ecosystem/application/applications`).  
  ![Screenshot of the administration app to highlight how to navigate to the custom device management applincation](./_media/applications-device-management-custom.png)
  Click on the Device management application flagged as 'custom' (don't click the "open" button).
1. Click on the "Plugins" page (path: `/apps/administration/index.html#/ecosystem/application/applications/<ApplcationID>/plugins`)
      ![Screenshot highlighting the "plugins" tab on the device management application inside the administration UI](_media/navigate-to-plugins.png)
1. On the "Plugins" page, proceed as follows:
    1. Choose "Install plugins"  
      ![Screenshot indicating the position of the "install plugin" button in the top right corner of the "plugins" tab](_media/install-button.png)
    1. Select and install "HMS Flexy Integration Plugin".  
      ![Screenshot of the plugin install dialog](_media/select-and-install.png)
1. Access the duplicated "Device management" application via the app switcher.  
  ![Screenshot of the app switcher highlighting the custom "device management" app](_media/app-switcher.png)
1.  The "Devices" » "Flexy Registration" navigation item should now be avilable to you.
  ![Screenshot of the updated navigation in the device management, highlighting the added menu entry](_media/plugin-navigation.png)


------------------------------
  
This widget is provided as-is and without warranty or support. They do not constitute part of the Software AG product suite. Users are free to use, fork and modify them, subject to the license agreement. While Software AG welcomes contributions, we cannot guarantee to include every contribution in the master project.
