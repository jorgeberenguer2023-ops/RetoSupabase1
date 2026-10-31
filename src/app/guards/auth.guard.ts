import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(SupabaseService);
  const router = inject(Router);
  await auth.initialize();
  return auth.session() && auth.profile()
    ? true
    : router.createUrlTree(['/login']);
};

export const loginGuard: CanActivateFn = async () => {
  const auth = inject(SupabaseService);
  const router = inject(Router);
  await auth.initialize();
  if (!auth.session() || !auth.profile()) {
    return true;
  }
  return router.createUrlTree([auth.profile()?.role === 'admin' ? '/dashboard' : '/records']);
};

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(SupabaseService);
  const router = inject(Router);
  await auth.initialize();
  if (!auth.session() || !auth.profile()) {
    return router.createUrlTree(['/login']);
  }
  return auth.profile()?.role === 'admin'
    ? true
    : router.createUrlTree(['/records']);
};
