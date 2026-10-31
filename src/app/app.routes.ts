import { Routes } from '@angular/router';
import { adminGuard, authGuard, loginGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shell/app-shell.page').then((m) => m.AppShellPage),
    children: [
      {
        path: 'dashboard',
        canActivate: [adminGuard],
        loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'records',
        loadComponent: () => import('./records/records.page').then((m) => m.RecordsPage),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
