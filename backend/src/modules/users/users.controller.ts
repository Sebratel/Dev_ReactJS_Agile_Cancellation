import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '@/modules/auth/types/authenticated-user.type';
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { UpdateUserDto } from '@/modules/users/dto/update-user.dto';
import { UsersQueryDto } from '@/modules/users/dto/users-query.dto';
import { UsersService } from '@/modules/users/users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('ADMIN', 'SUPERVISOR')
  @Get()
  list(@Query() query: UsersQueryDto) {
    return this.usersService.list(query);
  }

  // Quem encaminha casos ao cancelamento (inclusive atendente de cobranca, quando
  // liberado) precisa listar os agentes de cancelamento ativos. A listagem geral
  // (`GET /users`) e so de ADMIN/SUPERVISOR, entao o atendente recebia 403 e via
  // "nenhum atendente". Rota declarada antes de `:id` para nao ser capturada por ela.
  @Roles('ADMIN', 'SUPERVISOR', 'COLLECTION_AGENT', 'CANCELLATION_AGENT')
  @Get('cancellation-agents')
  listCancellationAgents() {
    return this.usersService.listCancellationAgents();
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Get('workload')
  getWorkload() {
    return this.usersService.getWorkload();
  }

  @Roles('ADMIN', 'SUPERVISOR')
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.usersService.getById(id);
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() body: CreateUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.create(body, user.id);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.update(id, body, user.id);
  }
}
