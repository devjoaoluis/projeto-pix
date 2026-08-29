import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { usuarios } from '../../db/schema';
import { Usuario } from '../../models/Usuario';

@Injectable()
export class UsuariosRepository {
  constructor(@Inject('DRIZZLE') private readonly db: any) {}

  async salvar(usuario: Usuario) {
    const [novoRegistro] = await this.db
      .insert(usuarios)
      .values({
        nome: usuario.nome,
        cpf: usuario.cpf,
        email: usuario.email,
        telefone: usuario.telefone,
      })
      .returning();

    return novoRegistro;
  }

  async buscarPorCpf(cpf: string) {
    const [usuario] = await this.db
      .select()
      .from(usuarios)
      .where(eq(usuarios.cpf, cpf));
    return usuario;
  }

  async buscarPorId(id: string) {
    const [usuario] = await this.db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, id));
    return usuario;
  }

  async listarTodos() {
    return await this.db.select().from(usuarios);
  }
}