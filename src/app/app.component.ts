import { Component } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { addIcons } from 'ionicons';
import localeEs from '@angular/common/locales/es';
import {
  addOutline,
  arrowUpOutline,
  alertCircleOutline,
  businessOutline,
  calendarOutline,
  cashOutline,
  checkmarkCircleOutline,
  closeOutline,
  closeCircleOutline,
  createOutline,
  cubeOutline,
  documentTextOutline,
  downloadOutline,
  eyeOffOutline,
  eyeOutline,
  gridOutline,
  handRightOutline,
  layersOutline,
  listOutline,
  lockClosedOutline,
  logOutOutline,
  mailOutline,
  peopleOutline,
  searchOutline,
  shieldCheckmarkOutline,
  trashOutline,
  walletOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {
    registerLocaleData(localeEs);
    addIcons({
      addOutline,
      arrowUpOutline,
      alertCircleOutline,
      businessOutline,
      calendarOutline,
      cashOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      closeOutline,
      createOutline,
      cubeOutline,
      documentTextOutline,
      downloadOutline,
      eyeOffOutline,
      eyeOutline,
      gridOutline,
      handRightOutline,
      layersOutline,
      listOutline,
      lockClosedOutline,
      logOutOutline,
      mailOutline,
      peopleOutline,
      searchOutline,
      shieldCheckmarkOutline,
      trashOutline,
      walletOutline,
    });
  }
}
