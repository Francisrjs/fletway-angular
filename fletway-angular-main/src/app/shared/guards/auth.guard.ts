import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Session } from '@supabase/supabase-js';

import { AuthService } from '../../core/auth/data-access/auth-service';
import { ToastService } from '../modal/toast/toast.service';

const routerInJection = () => inject(Router);
const authService = () => inject(AuthService);
const toastService = () => inject(ToastService);

const ensureSession = async (auth: AuthService): Promise<Session | null> => {
  let session = auth.userState().session ?? null;
  if (session || auth.isLoggingOut()) {
    return session;
  }

  try {
    const { data } = await auth.session();
    session = data.session ?? null;
    console.log('🔐 Supabase getSession respondió:', session?.user?.id);

    if (session?.user) {
      const userId = session.user.id;
      const email = session.user.email ?? null;

      if (!auth.userState().userId) {
        auth.userState.set({ userId, email, isFletero: null, session });
      }

      if (auth.userState().isFletero === null) {
        await auth.esFletero(userId);
      }
    }
  } catch (error) {
    console.warn('⚠️ getSession falló:', error);
  }

  return session;
};

const ensureRolDeterminando = async (
  auth: AuthService,
  session: Session,
): Promise<boolean | null> => {
  const userId = session.user.id;
  let isFletero = auth.userState().isFletero ?? null;

  if (isFletero === null && !auth.userState().isFleteroLoading) {
    console.log('🕵️ Determinando rol via vista_es_fletero');
    isFletero = await auth.esFletero(userId);
  }

  return isFletero;
};

export const privateGuard: CanActivateFn = async () => {
  const router = routerInJection();
  const auth = authService();

  if (auth.isLoggingOut && auth.isLoggingOut()) {
    return router.parseUrl('/auth/login');
  }

  let session = auth.userState().session ?? null;
  if (!session) {
    session = await ensureSession(auth);
  }

  if (!session) {
    console.warn('⛔ No hay sesión activa, redirigiendo al login');
    return router.parseUrl('/auth/login');
  }

  await ensureRolDeterminando(auth, session);
  return true;
};

export const fleteroGuard: CanActivateFn = async () => {
  const router = routerInJection();
  const auth = authService();
  const toast = toastService();

  const session = (await ensureSession(auth)) ?? auth.userState().session;
  if (!session) {
    toast.showDanger('Sesión requerida', 'Iniciá sesión para continuar');
    return router.parseUrl('/auth/login');
  }

  const isFletero = await ensureRolDeterminando(auth, session);

  if (isFletero === true) {
    return true;
  }

  toast.showDanger(
    'Acceso restringido',
    'Esta vista es exclusiva para fleteros registrados.',
  );
  console.warn('⛔ Intento de acceso cliente -> ruta fletero');
  return router.parseUrl('/cliente');
};

export const clienteGuard: CanActivateFn = async () => {
  const router = routerInJection();
  const auth = authService();
  const toast = toastService();

  const session = (await ensureSession(auth)) ?? auth.userState().session;
  if (!session) {
    toast.showDanger('Sesión requerida', 'Iniciá sesión para continuar');
    return router.parseUrl('/auth/login');
  }

  const isFletero = await ensureRolDeterminando(auth, session);

  if (isFletero === false) {
    return true;
  }

  toast.showWarning(
    'Redirigiendo a panel de fletero',
    'Tu cuenta está registrada como fletero.',
  );
  console.warn('⛔ Intento de acceso fletero -> ruta cliente');
  return router.parseUrl('/fletero');
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
