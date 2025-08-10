import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../core/auth/data-access/auth-service';

const routerInJection = () => inject(Router);
const authService = () => inject(AuthService);

export const privateGuard: CanActivateFn = async () => {
  const router = routerInJection();

  const { data } = await authService().session();
  console.log(data);
  if (!data.session) {
    router.navigateByUrl('/auth/login');
  }

  return !!data.session;
};

export const publicGuard: CanActivateFn = async () => {
  const router = routerInJection();

  const { data } = await authService().session();

  console.log(data);

  if (data.session) {
    router.navigateByUrl('/');
  }

  return !data.session;
};
