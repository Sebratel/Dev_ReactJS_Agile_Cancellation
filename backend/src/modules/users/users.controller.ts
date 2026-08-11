import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
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
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.usersService.update(id, body);
  }
}
