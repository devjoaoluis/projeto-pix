import { Injectable } from '@nestjs/common';
import { db } from '../../models/MemoriaDatabase';
import { Usuario } from '../../models/Usuario';

@Injectable()
export class UsuariosRepository {
  salvar(usuario: Usuario): Usuario {
    usuario.id = db.getNextId();
    db.usuarios.push(usuario);
    return usuario;
  }

  buscarPorCpf(cpf: string): Usuario | undefined {
    return db.usuarios.find((usuario) => usuario.cpf === cpf);
  }

  buscarPorId(id: number): Usuario | undefined {
    return db.usuarios.find((usuario) => usuario.id === id);
  }

  listarTodos(): Usuario[] {
    return db.usuarios;
  }

  remover(id: number): void {
    let indiceUsuario = -1;
    for (let i = 0; i < db.usuarios.length; i++) {
      if (db.usuarios[i].id === id) {
        indiceUsuario = i;
        break;
      }
    }
    if (indiceUsuario === -1) {
      return;
    }
    const usuario = db.usuarios[indiceUsuario];
    for (const conta of usuario.contas) {
      for (let i = db.chavesPix.length - 1; i >= 0; i--) {
        if (db.chavesPix[i].conta.id === conta.id) {
          db.chavesPix.splice(i, 1);
        }
      }
      for (let i = db.contas.length - 1; i >= 0; i--) {
        if (db.contas[i].id === conta.id) {
          db.contas.splice(i, 1);
          break;
        }
      }
    }
    db.usuarios.splice(indiceUsuario, 1);
  }
}