import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { provideServiceWorker } from '@angular/service-worker';
import { isDevMode } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
 
bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    provideServiceWorker('ngsw-worker.js', {
        enabled: !isDevMode(),
        registrationStrategy: 'registerWhenStable:30000'
    }),
    provideAnimations(),
    ...(appConfig.providers || [])
  ]
})
  .catch((err) => console.error(err));
