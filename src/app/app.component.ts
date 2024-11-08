import { Component } from '@angular/core';
import { HomeComponent } from './home/home.component';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `<app-home></app-home>`,
  imports: [HomeComponent], 
})
export class AppComponent {}
