import { describe, expect, it } from 'vitest';
import {
  AccessControl,
  evaluateSpeciesAccess,
  PlanoSpeciesLimit,
} from '../plano.types';

describe('evaluateSpeciesAccess', () => {
  const createAccessControl = (views = 0, viewedIds: string[] = []): AccessControl => ({
    Species: { views, viewedIds },
    Categories: { views: 0, viewedIds: [] },
  });

  describe('Perfil ADMIN', () => {
    it('deve liberar acesso e não registrar visualização quando ADMIN e plano for null', () => {
      const access = createAccessControl(0, []);
      const result = evaluateSpeciesAccess(access, null, 'sp-1', 'ADMIN');

      expect(result).toEqual({ isBlocked: false, shouldRegisterView: false });
    });

    it('deve liberar acesso e não registrar visualização quando ADMIN e plano for undefined', () => {
      const access = createAccessControl(0, []);
      const result = evaluateSpeciesAccess(access, undefined, 'sp-1', 'ADMIN');

      expect(result).toEqual({ isBlocked: false, shouldRegisterView: false });
    });

    it('deve liberar acesso e não registrar visualização quando ADMIN e views estiverem acima do limite free (ex: views >= 3)', () => {
      const access = createAccessControl(10, ['sp-old-1', 'sp-old-2']);
      const result = evaluateSpeciesAccess(access, null, 'sp-new', 'ADMIN');

      expect(result).toEqual({ isBlocked: false, shouldRegisterView: false });
    });

    it('deve liberar acesso mesmo se ADMIN tiver plano pago com limite já atingido', () => {
      const planoLimitado: PlanoSpeciesLimit = {
        especies_ilimitadas: false,
        especies_disponiveis: 2,
      };
      const access = createAccessControl(5, ['sp-1', 'sp-2']);
      const result = evaluateSpeciesAccess(access, planoLimitado, 'sp-3', 'ADMIN');

      expect(result).toEqual({ isBlocked: false, shouldRegisterView: false });
    });

    it('deve liberar acesso quando tipo_usuario for admin em letras minúsculas ("admin")', () => {
      const access = createAccessControl(5, []);
      const result = evaluateSpeciesAccess(access, null, 'sp-1', 'admin');

      expect(result).toEqual({ isBlocked: false, shouldRegisterView: false });
    });

    it('deve manter liberado mesmo para espécie já vista por ADMIN', () => {
      const access = createAccessControl(2, ['sp-1']);
      const result = evaluateSpeciesAccess(access, null, 'sp-1', 'ADMIN');

      expect(result).toEqual({ isBlocked: false, shouldRegisterView: false });
    });
  });

  describe('Perfil PADRAO / Não-Admin', () => {
    it('deve permitir acesso e registrar visualização quando PADRAO, plano null e views < 3 (DEFAULT_FREE_VIEWS)', () => {
      const access = createAccessControl(0, []);
      const result = evaluateSpeciesAccess(access, null, 'sp-1', 'PADRAO');

      expect(result).toEqual({ isBlocked: false, shouldRegisterView: true });
    });

    it('deve permitir acesso no limite free (views = 2) e registrar visualização', () => {
      const access = createAccessControl(2, ['sp-1', 'sp-2']);
      const result = evaluateSpeciesAccess(access, null, 'sp-3', 'PADRAO');

      expect(result).toEqual({ isBlocked: false, shouldRegisterView: true });
    });

    it('deve bloquear acesso quando PADRAO, plano null e views atingir o limite free (views >= 3)', () => {
      const access = createAccessControl(3, ['sp-1', 'sp-2', 'sp-3']);
      const result = evaluateSpeciesAccess(access, null, 'sp-4', 'PADRAO');

      expect(result).toEqual({ isBlocked: true, shouldRegisterView: false });
    });

    it('deve permitir acesso sem registrar view se a espécie já foi visualizada antes por PADRAO sem plano', () => {
      const access = createAccessControl(3, ['sp-1', 'sp-2', 'sp-3']);
      const result = evaluateSpeciesAccess(access, null, 'sp-2', 'PADRAO');

      expect(result).toEqual({ isBlocked: false, shouldRegisterView: false });
    });

    it('deve liberar acesso sem registrar view quando PADRAO tiver plano ilimitado', () => {
      const planoIlimitado: PlanoSpeciesLimit = {
        especies_ilimitadas: true,
      };
      const access = createAccessControl(10, []);
      const result = evaluateSpeciesAccess(access, planoIlimitado, 'sp-1', 'PADRAO');

      expect(result).toEqual({ isBlocked: false, shouldRegisterView: false });
    });

    it('deve respeitar limite de plano pago definido quando PADRAO', () => {
      const planoLimitado: PlanoSpeciesLimit = {
        especies_ilimitadas: false,
        especies_disponiveis: 5,
      };

      const accessAbaixo = createAccessControl(4, ['sp-1', 'sp-2', 'sp-3', 'sp-4']);
      expect(evaluateSpeciesAccess(accessAbaixo, planoLimitado, 'sp-5', 'PADRAO')).toEqual({
        isBlocked: false,
        shouldRegisterView: true,
      });

      const accessNoLimite = createAccessControl(5, ['sp-1', 'sp-2', 'sp-3', 'sp-4', 'sp-5']);
      expect(evaluateSpeciesAccess(accessNoLimite, planoLimitado, 'sp-6', 'PADRAO')).toEqual({
        isBlocked: true,
        shouldRegisterView: false,
      });
    });

    it('deve seguir regra padrão quando tipoUsuario for undefined ou null', () => {
      const access = createAccessControl(3, ['sp-1', 'sp-2', 'sp-3']);
      const resultSemRole = evaluateSpeciesAccess(access, null, 'sp-4');
      const resultNullRole = evaluateSpeciesAccess(access, null, 'sp-4', null);

      expect(resultSemRole).toEqual({ isBlocked: true, shouldRegisterView: false });
      expect(resultNullRole).toEqual({ isBlocked: true, shouldRegisterView: false });
    });
  });

  describe('Proteções de estado e robustez', () => {
    it('deve retornar não bloqueado e não registrar view se accessControl for inválido', () => {
      // @ts-expect-error teste com payload inválido
      const result = evaluateSpeciesAccess(null, null, 'sp-1', 'PADRAO');
      expect(result).toEqual({ isBlocked: false, shouldRegisterView: false });
    });

    it('deve liberar caso plano pago não defina especies_disponiveis nem especies_ilimitadas', () => {
      const planoIndefinido: PlanoSpeciesLimit = {};
      const access = createAccessControl(10, []);
      const result = evaluateSpeciesAccess(access, planoIndefinido, 'sp-1', 'PADRAO');

      expect(result).toEqual({ isBlocked: false, shouldRegisterView: false });
    });
  });
});

