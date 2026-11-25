import { Sequelize } from "sequelize-typescript";
import { afterAll, describe, expect, it } from "vitest";

import ArtesDePesca from "../../src/models/ArtesDePesca";
import CamposArteDePesca from "../../src/models/CamposArteDePesca";
import Embarcacoes from "../../src/models/Embarcacoes";
import Especies from "../../src/models/Especies";
import Fundos from "../../src/models/Fundos";
import Iscas from "../../src/models/Iscas";
import Lances from "../../src/models/Lances";
import Missoes from "../../src/models/Missoes";
import OcorrenciasLance from "../../src/models/OcorrenciasLance";
import Portos from "../../src/models/Portos";
import Relatorios from "../../src/models/Relatorios";
import Usuarios from "../../src/models/Usuarios";
import UsuariosAtivos from "../../src/models/UsuariosAtivos";

const sequelize = new Sequelize({
  dialect: "postgres",
  logging: false,
  models: [
    ArtesDePesca,
    Embarcacoes,
    Portos,
    Relatorios,
    Usuarios,
    UsuariosAtivos,
    OcorrenciasLance,
    Especies,
    Iscas,
    Fundos,
    Lances,
    Missoes,
    CamposArteDePesca,
  ],
});

describe("Model Relatorios", () => {
  it("configura tabela, timestamps e soft delete", () => {
    expect(Relatorios.tableName).toBe("relatorios");
    expect(Relatorios.options.timestamps).toBe(true);
    expect(Relatorios.options.paranoid).toBe(true);
    expect(Relatorios.options.createdAt).toBe("criado_em");
    expect(Relatorios.options.updatedAt).toBe("atualizado_em");
    expect(Relatorios.options.deletedAt).toBe("deletado_em");
  });

  it("configura os campos obrigatórios e opcionais", () => {
    const attributes = Relatorios.getAttributes();

    expect(attributes.id.primaryKey).toBe(true);
    expect(attributes.id_usuario.allowNull).toBe(false);
    expect(attributes.id_embarcacao.allowNull).toBe(false);
    expect(attributes.id_missao.allowNull).toBe(false);
    expect(attributes.uri.allowNull).toBe(false);
    expect(attributes.tipo.allowNull).toBe(true);
  });
});

afterAll(async () => {
  await sequelize.close();
});
