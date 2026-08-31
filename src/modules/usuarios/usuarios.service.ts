import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { UsuariosRepository } from './usuarios.repository';
import { CriarUsuarioDto } from './dto/criar-usuario.dto';
import { Usuario } from '../../models/Usuario';

@Injectable()
export class UsuariosService {
  constructor(private readonly usuariosRepository: UsuariosRepository) {}

  async cadastrar(dto: CriarUsuarioDto) {
    const usuarioExistente = await this.usuariosRepository.buscarPorCpf(dto.cpf);

    if (usuarioExistente) {
      throw new BadRequestException('Já existe um usuário cadastrado com este CPF.');
    }

    const novoUsuario = new Usuario(
      dto.nome,
      dto.cpf,
      dto.email,
      dto.telefone,
    );

    return await this.usuariosRepository.salvar(novoUsuario);
  }

  async buscarPorId(id: string) {
    const usuario = await this.usuariosRepository.buscarPorId(id);

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return usuario;
  }

  async listar() {
    return await this.usuariosRepository.listarTodos();
  }
}