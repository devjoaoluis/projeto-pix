import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { UsuariosRepository } from './usuarios.repository';
import { CriarUsuarioDto } from './dto/criar-usuario.dto';
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
}