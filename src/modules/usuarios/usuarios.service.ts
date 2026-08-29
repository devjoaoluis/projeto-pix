import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { UsuariosRepository } from './usuarios.repository';
import { CriarUsuarioDto } from './dto/criar-usuario.dto';
import { AtualizarUsuarioDto } from './dto/atualizar-usuario.dto';
import { Usuario } from '../../models/Usuario';

@Injectable()
export class UsuariosService {
  constructor(private readonly usuariosRepository: UsuariosRepository) {}

  cadastrar(dto: CriarUsuarioDto): Usuario {
    const usuarioExistente = this.usuariosRepository.buscarPorCpf(dto.cpf);
    if (usuarioExistente) {
      throw new BadRequestException('Já existe um usuário cadastrado com este CPF.');
    }
    const novoUsuario = new Usuario(
      dto.nome,
      dto.cpf,
      dto.email,
      dto.telefone,
    );
    return this.usuariosRepository.salvar(novoUsuario);
  }

  buscarPorId(id: number): Usuario {
    const usuario = this.usuariosRepository.buscarPorId(id);
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return usuario;
  }

  listar(): Usuario[] {
    return this.usuariosRepository.listarTodos();
  }

  remover(id: number): void {
    this.buscarPorId(id);
    this.usuariosRepository.remover(id);
  }

  atualizar(id: number, dto: AtualizarUsuarioDto): Usuario {
    // Verifica se o usuário existe
    this.buscarPorId(id);

    // Monta objeto com os campos que foram enviados
    const dadosParaAtualizar: Partial<Usuario> = {};
    if (dto.nome) dadosParaAtualizar.nome = dto.nome;
    if (dto.email) dadosParaAtualizar.email = dto.email;
    if (dto.telefone) dadosParaAtualizar.telefone = dto.telefone;

    // Atualiza no repositório
    return this.usuariosRepository.atualizar(id, dadosParaAtualizar);
  }
}