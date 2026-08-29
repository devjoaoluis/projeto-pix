import { Injectable, NotFoundException } from '@nestjs/common';
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
    db.contas = db.contas.filter((conta) => conta.usuario.id !== id);
    db.chavesPix = db.chavesPix.filter((chave) => chave.conta.usuario.id !== id);
    db.usuarios = db.usuarios.filter((usuario) => usuario.id !== id);
  }

  atualizar(id: number, dadosAtualizados: Partial<Usuario>): Usuario {
    const index = db.usuarios.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const usuarioExistente = db.usuarios[index];
    const usuarioAtualizado = { ...usuarioExistente, ...dadosAtualizados };
    db.usuarios[index] = usuarioAtualizado;
    return usuarioAtualizado;
  }
}