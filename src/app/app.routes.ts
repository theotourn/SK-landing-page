import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { PortfolioComponent } from './portfolio/portfolio.component';

export const routes: Routes = [
  { path: '', component: HomeComponent }, // Rota base
  { path: 'portfolio', component: PortfolioComponent }, // Rota para o componente Portfolio
];
