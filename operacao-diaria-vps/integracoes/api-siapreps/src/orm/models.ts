import type { ModelCtor } from "sequelize-typescript";

import Analises from "../models/Analises";
import ArtesDePesca from "../models/ArtesDePesca";
import CamposArteDePesca from "../models/CamposArteDePesca";
import Embarcacoes from "../models/Embarcacoes";
import Especies from "../models/Especies";
import Fundos from "../models/Fundos";
import IdempotencyKeys from "../models/IdempotencyKeys";
import Incidentes from "../models/Incidentes";
import Iscas from "../models/Iscas";
import Lances from "../models/Lances";
import Missoes from "../models/Missoes";
import OcorrenciasLance from "../models/OcorrenciasLance";
import Portos from "../models/Portos";
import RecuperacoesSenha from "../models/RecuperacoesSenha";
import Relatorios from "../models/Relatorios";
import Usuarios from "../models/Usuarios";
import UsuariosAtivos from "../models/UsuariosAtivos";
import SyncIdentities from "../models/SyncIdentities";

export const SIAPREPS_MODELS: ModelCtor[] = [
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
  Analises,
  RecuperacoesSenha,
  Incidentes,
  IdempotencyKeys,
  SyncIdentities,
];
