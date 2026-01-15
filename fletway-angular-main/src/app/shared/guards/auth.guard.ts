import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../../core/auth/data-access/auth-service';

const routerInJection = () => inject(Router);
const authService = () => inject(AuthService);

export const privateGuard: CanActivateFn = async () => {
  const router = routerInJection();
  const auth = authService();
  if (auth.isLoggingOut && auth.isLoggingOut()) {
    return router.parseUrl('/auth/login');
  }
  let session = auth.userState().session;
  let isFletero = auth.userState().isFletero;
  console.log('userState session:', session);
  if (!session) {
    // Evitar rehidratar sesión si el estado local ya está vacío
    try {
      const { data } = await auth.session();
      session = data.session;
      console.log('Supabase getSession session:', session?.user);
      if (session && session.user && !auth.isLoggingOut()) {
        const userId = session.user.id;
        const email = session.user.email ?? null;
        isFletero = await auth.esFletero(userId);
        auth.userState.set({ userId, email, isFletero, session });
      }
    } catch (e) {
      console.warn('getSession falló:', e);
    }
  }
  if (!session) {
    return router.parseUrl('/auth/login');
  }
  return true;
};

export const publicGuard: CanActivateFn = async () => {
  const router = routerInJection();
  const auth = authService();
  if (auth.isLoggingOut && auth.isLoggingOut()) {
    return true;
  }
  let session = auth.userState().session;
  console.log('userState session:', session);
  if (!session) {
    const { data } = await auth.session();
    session = data.session;
    console.log('Supabase getSession session:', session);
  }
  if (session) {
    return router.parseUrl('/');
  }
  return true;
};
