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
    db.contas = db.contas.filter((conta) => conta.usuario.id !== id);

    db.chavesPix = db.chavesPix.filter((chave) => chave.conta.usuario.id !== id);
    
    db.usuarios = db.usuarios.filter((usuario) => usuario.id !== id);
  }
}