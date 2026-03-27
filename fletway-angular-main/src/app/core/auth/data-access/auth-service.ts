import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Session, SignInWithPasswordCredentials } from '@supabase/supabase-js';

import { Supabase } from '../../../shared/data-access/supabase';
import { Cliente } from '../../layouts/cliente';
import { Fletero } from '../../layouts/fletero';


export interface userState {
  userId: string | null;
  email?: string | null;
  isFletero?: boolean | null;
  isFleteroLoading?: boolean;
  session?: Session | null;

  usuarioIdNumerico?: number | null; // PK entero de tabla 'usuario'

  transportista?: {
    transportista_id: number;
  } | null;
  transportistaLoading?: boolean; // ✅ NUEVO: flag separado para carga de transportista
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _supabaseClient = inject(Supabase).supabaseCLient;
  private _router = inject(Router);

  userState = signal<userState>({
    userId: null,
    email: null,
    isFletero: null,
    isFleteroLoading: false,
    session: null,
    usuarioIdNumerico: null,
    transportista: null,
    transportistaLoading: false,
  });
  isLoggingOut = signal<boolean>(false);

  // Métodos para persistencia en localStorage
  private saveIsFleteroToStorage(userId: string, isFletero: boolean) {
    try {
      localStorage.setItem(`isFletero_${userId}`, JSON.stringify(isFletero));
      localStorage.setItem(
        `isFletero_${userId}_timestamp`,
        Date.now().toString(),
      );
    } catch (e) {
      console.warn('No se pudo guardar isFletero en localStorage:', e);
    }
  }

  private getIsFleteroFromStorage(userId: string): boolean | null {
    try {
      const stored = localStorage.getItem(`isFletero_${userId}`);
      const timestamp = localStorage.getItem(`isFletero_${userId}_timestamp`);

      if (!stored || !timestamp) return null;

      // Verificar que no sea muy antiguo (24 horas)
      const age = Date.now() - parseInt(timestamp);
      const maxAge = 24 * 60 * 60 * 1000; // 24 horas

      if (age > maxAge) {
        // Limpiar datos antiguos
        this.clearIsFleteroFromStorage(userId);
        return null;
      }

      return JSON.parse(stored);
    } catch (e) {
      console.warn('No se pudo leer isFletero del localStorage:', e);
      return null;
    }
  }

  private clearIsFleteroFromStorage(userId: string) {
    try {
      localStorage.removeItem(`isFletero_${userId}`);
      localStorage.removeItem(`isFletero_${userId}_timestamp`);
    } catch (e) {
      console.warn('No se pudo limpiar isFletero del localStorage:', e);
    }
  }

  constructor() {
    this._supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      console.log('[onAuthStateChange] event:', _event, 'session:', session);
      console.log('userState (antes):', this.userState());

      if (session?.user) {
        const userId = session.user.id;
        const email = session.user.email ?? null;

        // Verificar si el usuario cambió
        const prev = this.userState();
        const shouldReset = prev.userId !== userId;

        // Intentar obtener isFletero del localStorage primero
        const cachedIsFletero = this.getIsFleteroFromStorage(userId);

        if (cachedIsFletero !== null && !shouldReset) {
          // Usar valor del cache
          this.userState.set({
            userId,
            email,
            isFletero: cachedIsFletero,
            isFleteroLoading: false,
            session,
            usuarioIdNumerico: null,
            transportista: null,
            transportistaLoading: false,
          });
          console.log(
            '[onAuthStateChange] usando cache isFletero:',
            cachedIsFletero,
          );

          // ✅ CARGAR usuario_id numérico en segundo plano
          this.cargarUsuarioIdNumerico(userId);

          // ✅ CARGA EN SEGUNDO PLANO (sin await)
          if (cachedIsFletero) {
            this.cargarTransportistaId(userId); // No bloqueante
          }

        } else {
          // No hay cache o usuario cambió, consultar BD
          this.userState.set({
            userId,
            email,
            isFletero: shouldReset ? null : prev.isFletero,
            isFleteroLoading: true,
            session,
            usuarioIdNumerico: null,
            transportista: null,
            transportistaLoading: false,
          });
          console.log('[onAuthStateChange] consultando BD para isFletero');

          // ✅ CARGAR usuario_id numérico en segundo plano
          this.cargarUsuarioIdNumerico(userId);

          try {
            const isFletero = await this.esFletero(userId);
            this.userState.update((prev) => ({
              ...prev,
              isFletero,
              isFleteroLoading: false,
            }));

            // Guardar en localStorage
            if (isFletero !== null) {
              this.saveIsFleteroToStorage(userId, isFletero);
            }

            console.log(
              '[onAuthStateChange] isFletero actualizado:',
              isFletero,
            );

            // ✅ CARGA EN SEGUNDO PLANO (sin await)
            if (isFletero) {
              this.cargarTransportistaId(userId); // No bloqueante
            }

          } catch (e) {
            this.userState.update((prev) => ({
              ...prev,
              isFletero: false,
              isFleteroLoading: false,
            }));
            console.warn('esFletero fallo:', e);
          }
        }
      } else {
        this.userState.set({
          userId: null,
          email: null,
          isFletero: null,
          session: null,
          usuarioIdNumerico: null,
          transportista: null,
          transportistaLoading: false,
        });
        console.log('[onAuthStateChange] userState reset:', this.userState());
      }
    });
  }

  session() {
    return this._supabaseClient.auth.getSession();
  }

  signUp(credentials: SignInWithPasswordCredentials) {
    return this._supabaseClient.auth.signUp(credentials);
  }

  async loginIn(credentials: SignInWithPasswordCredentials) {
    console.log('[loginIn] credentials:', credentials);
    const result =
      await this._supabaseClient.auth.signInWithPassword(credentials);
    console.log('[loginIn] result:', result);
    return result;
  }

  async signOut(options?: { timeoutMs?: number }): Promise<boolean> {
    const timeoutMs = options?.timeoutMs ?? 4000;
    this.isLoggingOut.set(true);

    // Limpiar cache de isFletero
    const currentUserId = this.userState().userId;
    if (currentUserId) {
      this.clearIsFleteroFromStorage(currentUserId);
    }

    // Limpiar estado local al instante
    this.userState.set({
      userId: null,
      email: null,
      isFletero: null,
      session: null,
      usuarioIdNumerico: null,
      transportista: null,
      transportistaLoading: false,
    });

    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (storageError) {
      console.warn('No se pudo limpiar el storage:', storageError);
    }

    // Disparar signOut LOCAL en background
    setTimeout(() => {
      this._supabaseClient.auth
        .signOut({ scope: 'local' })
        .catch((e) => console.warn('[signOut] error local:', e));
    }, 0);

    // Intento de revoke GLOBAL con timeout
    setTimeout(() => {
      Promise.race([
        this._supabaseClient.auth.signOut(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('signOut timeout')), timeoutMs),
        ),
      ])
        .then(() => console.log('Se deslogeo completamente (global revoke)'))
        .catch((e) => console.warn('[signOut] revoke global no confirmado:', e))
        .finally(() => this.isLoggingOut.set(false));
    }, 0);

    return true;
  }

  // ✅ REVERTIDO A VERSIÓN SIMPLE - SOLO VERIFICA EL BOOLEAN
  async esFletero(userId: string): Promise<boolean | null> {
    // Si ya está cargando, evita recalcular
    if (this.userState().isFleteroLoading) return null;

    this.userState.update((prev) => ({ ...prev, isFleteroLoading: true }));

    const { data, error } = await this._supabaseClient.rpc('es_fletero', {
      uuid_param: userId,
    });

    if (error) {
      console.error('Error RPC es_fletero:', error);
      this.userState.update((prev) => ({ ...prev, isFleteroLoading: false }));
      return null;
    }

    let result = false;
    if (typeof data === 'boolean') {
      result = data;
    } else if (Array.isArray(data)) {
      result = !!(data[0]?.es_fletero === true);
    } else if (data && typeof data === 'object' && 'es_fletero' in data) {
      result = !!(data.es_fletero === true);
    }

    this.userState.update((prev) => ({
      ...prev,
      isFletero: result,
      isFleteroLoading: false,
    }));

    // Guardar en localStorage para futuras recargas
    this.saveIsFleteroToStorage(userId, result);

    return result;
  }

  /**
   * ✅ CARGAR el usuario_id numérico (PK entero de tabla 'usuario') en segundo plano
   */
  private async cargarUsuarioIdNumerico(userId: string): Promise<void> {
    // Si ya lo tenemos, no recargamos
    if (this.userState().usuarioIdNumerico) return;

    try {
      const { data: usuario, error } = await this._supabaseClient
        .from('usuario')
        .select('usuario_id')
        .eq('u_id', userId)
        .single();

      if (error || !usuario) {
        console.warn('[cargarUsuarioIdNumerico] Error:', error);
        return;
      }

      this.userState.update((prev) => ({
        ...prev,
        usuarioIdNumerico: usuario.usuario_id,
      }));
      console.log('✅ [cargarUsuarioIdNumerico] usuario_id:', usuario.usuario_id);
    } catch (e) {
      console.error('❌ [cargarUsuarioIdNumerico] Error:', e);
    }
  }

  /**
   * ✅ NUEVA FUNCIÓN: Cargar transportista_id en SEGUNDO PLANO
   * Se ejecuta sin await después de confirmar que es fletero
   */
  private async cargarTransportistaId(userId: string): Promise<void> {
    // Evitar múltiples cargas simultáneas
    if (this.userState().transportistaLoading) {
      console.log('[cargarTransportistaId] Ya está cargando, omitiendo...');
      return;
    }

    this.userState.update((prev) => ({
      ...prev,
      transportistaLoading: true,
    }));

    try {
      console.log('[cargarTransportistaId] Iniciando carga para userId:', userId);

      // 1. Obtener usuario_id desde UUID
      const { data: usuario, error: usuarioError } = await this._supabaseClient
        .from('usuario')
        .select('usuario_id')
        .eq('u_id', userId)
        .single();

      if (usuarioError) {
        console.error('[cargarTransportistaId] Error obteniendo usuario:', usuarioError);
        throw usuarioError;
      }

      if (!usuario) {
        console.warn('[cargarTransportistaId] No se encontró usuario');
        return;
      }

      console.log('[cargarTransportistaId] usuario_id obtenido:', usuario.usuario_id);

      // 2. Obtener transportista_id
      const { data: transportista, error: transpError } = await this._supabaseClient
        .from('transportista')
        .select('transportista_id')
        .eq('usuario_id', usuario.usuario_id)
        .single();

      if (transpError) {
        console.error('[cargarTransportistaId] Error obteniendo transportista:', transpError);
        throw transpError;
      }

      if (!transportista) {
        console.warn('[cargarTransportistaId] No se encontró transportista');
        return;
      }

      // 3. Actualizar estado con el transportista_id y el usuario_id numérico
      this.userState.update((prev) => ({
        ...prev,
        usuarioIdNumerico: usuario.usuario_id,
        transportista: {
          transportista_id: transportista.transportista_id
        },
        transportistaLoading: false,
      }));

      console.log('✅ [cargarTransportistaId] transportista_id cargado:', transportista.transportista_id);

    } catch (e) {
      console.error('❌ [cargarTransportistaId] Error:', e);
      this.userState.update((prev) => ({
        ...prev,
        transportista: null,
        transportistaLoading: false,
      }));
    }
  }

  /**
   * ✅ MÉTODO PÚBLICO: Para forzar recarga del transportista_id si es necesario
   */
  public async recargarTransportistaId(): Promise<void> {
    const userId = this.userState().userId;
    if (!userId) {
      console.warn('[recargarTransportistaId] No hay usuario logueado');
      return;
    }

    if (!this.userState().isFletero) {
      console.warn('[recargarTransportistaId] El usuario no es fletero');
      return;
    }

    return this.cargarTransportistaId(userId);
  }

  /**
   * Crear cuenta usuario en tabla 'usuario'
   * Requiere: nombre, apellido, email, telefono, fecha_nacimiento, u_id (UUID de Supabase Auth), contrasena_hash
   * Nota: usuario_id es auto-incrementado por la BD, no se envía desde el cliente
   */
  async crearUsuario(
    nombre: string,
    apellido: string,
    email: string,
    telefono: string,
    fecha_nacimiento: string,
    u_id: string,
    contrasena_hash: string,
  ): Promise<Cliente> {
    try {
      console.log('📝 Creando usuario en BD:', {
        nombre,
        apellido,
        email,
        u_id,
      });

      // No incluir usuario_id porque es auto-incrementado por la BD
      const clienteData = {
        nombre,
        apellido,
        email,
        telefono,
        fecha_nacimiento,
        u_id,
        contrasena_hash,
      };

      const { data, error } = await this._supabaseClient
        .from('usuario')
        .insert(clienteData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error al crear usuario:', error);
        throw error;
      }

      console.log('✅ Usuario creado en BD:', data);
      return data as Cliente;
    } catch (err) {
      console.error('❌ Error en crearUsuario:', err);
      throw err;
    }
  }

  /**
   * Crear perfil de fletero en tabla 'transportista'
   * Requiere: usuario_id (integer de tabla usuario), tipo_vehiculo, capacidad_kg, patente_vehiculo, modelo_vehiculo
   * Nota: transportista_id es auto-incrementado por la BD, no se envía desde el cliente
   */
  async crearFletero(
    usuario_id: number,
    tipo_vehiculo: string,
    capacidad_kg: number,
    patente_vehiculo: string,
    modelo_vehiculo: string,
  ): Promise<Fletero> {
    try {
      if (!usuario_id) {
        throw new Error('usuario_id es requerido para crear fletero');
      }

      console.log('🚗 Creando perfil de fletero:', {
        usuario_id,
        tipo_vehiculo,
        capacidad_kg,
        patente_vehiculo,
      });

      // No incluir transportista_id porque es auto-incrementado por la BD
      const fleteroData = {
        usuario_id,
        tipo_vehiculo,
        capacidad_kg,
        patente_vehiculo,
        modelo_vehiculo,
      };

      const { data, error } = await this._supabaseClient
        .from('transportista')
        .insert(fleteroData)
        .select('transportista_id') // seleccionar solo el ID creado
        .single();

      if (error) {
        console.error('❌ Error al crear fletero:', error);
        throw error;
      }

      console.log('✅ Perfil de fletero creado:', data);

      // Guardar en cache que es fletero
      this.saveIsFleteroToStorage(usuario_id.toString(), true);

      return data as Fletero;
    } catch (err) {
      console.error('❌ Error en crearFletero:', err);
      throw err;
    }
  }

  async cambiarContrasena(nuevaContrasena: string) {
    const { data, error } = await this._supabaseClient.auth.updateUser({
      password: nuevaContrasena
    });

    if (error) throw error;
    return data;
  }
}
